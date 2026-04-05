import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from models.database import Student, Session, SessionEvent, ConceptMastery, get_db
from routers.auth import get_current_student
from services import ai_service, session_service, mastery_service, video_service
from config.chapters import CHAPTER_BY_SLUG

router = APIRouter(prefix="/api/session", tags=["sessions"])


class StartSessionRequest(BaseModel):
    chapter_slug: str


class AnswerRequest(BaseModel):
    answer: str
    input_mode: str = "text"


@router.post("/start")
async def start_session(req: StartSessionRequest, student: Student = Depends(get_current_student), db: AsyncSession = Depends(get_db)):
    chapter = CHAPTER_BY_SLUG.get(req.chapter_slug)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Determine flow type
    result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.student_id == student.id,
            ConceptMastery.chapter_slug == req.chapter_slug,
        ).limit(1)
    )
    existing = result.scalar_one_or_none()
    flow_type = "revision" if existing else "first_time"

    # Create DB session
    db_session = Session(
        student_id=student.id,
        chapter_slug=req.chapter_slug,
        flow_type=flow_type,
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    session_id = str(db_session.id)

    # Create Redis state
    state = await session_service.create_session_state(session_id, str(student.id), req.chapter_slug, flow_type)

    if flow_type == "first_time":
        # Generate chapter intro
        content = await ai_service.generate_chapter_intro(chapter["name"], student.grade)
        concepts = content.get("concepts", [])
        video_url = video_service.get_video_url(req.chapter_slug)
        await session_service.update_session_state(session_id, {
            "concepts_list": concepts,
            "chapter_content": content,
            "current_concept": concepts[0] if concepts else None,
        })
        return {
            "session_id": session_id,
            "flow_type": flow_type,
            "chapter": chapter,
            "content": content,
            "video_url": video_url,
            "concepts": concepts,
        }
    else:
        # Revision flow — find weakest concept
        weakest = await mastery_service.get_weakest_concept(db, str(student.id), req.chapter_slug)
        if not weakest:
            # All mastered — pick any for review
            result2 = await db.execute(
                select(ConceptMastery).where(
                    ConceptMastery.student_id == student.id,
                    ConceptMastery.chapter_slug == req.chapter_slug,
                ).order_by(ConceptMastery.mastery_score.asc()).limit(1)
            )
            weakest = result2.scalar_one_or_none()

        concept_key = weakest.concept_key if weakest else "general_concepts"
        mastery_score = weakest.mastery_score if weakest else 0.0

        # Get error history
        events_result = await db.execute(
            select(SessionEvent).join(Session).where(
                Session.student_id == student.id,
                SessionEvent.concept_key == concept_key,
            ).order_by(SessionEvent.created_at.desc()).limit(5)
        )
        events = events_result.scalars().all()
        error_history = ", ".join([e.error_type for e in events if e.error_type and e.error_type != "correct"]) or "none"

        question_data = await ai_service.generate_diagnostic_question(
            chapter["name"], student.grade, concept_key, mastery_score, error_history
        )

        await session_service.update_session_state(session_id, {
            "current_concept": concept_key,
            "current_question": question_data.get("question"),
            "current_expected_answer": question_data.get("expected_answer"),
            "attempt_number": 1,
        })

        return {
            "session_id": session_id,
            "flow_type": flow_type,
            "chapter": chapter,
            "current_concept": concept_key,
            "question": question_data,
        }


@router.post("/{session_id}/questions")
async def get_questions(session_id: str, student: Student = Depends(get_current_student), db: AsyncSession = Depends(get_db)):
    """Generate comprehension questions after video watched (first_time flow)"""
    state = await session_service.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if await session_service.is_session_expired(session_id):
        raise HTTPException(status_code=410, detail="Session expired")

    chapter = CHAPTER_BY_SLUG.get(state["chapter_slug"])
    concepts = state.get("concepts_list", [])

    questions_data = await ai_service.generate_comprehension_questions(
        chapter["name"], student.grade, concepts
    )
    questions = questions_data.get("questions", [])
    if questions:
        first_q = questions[0]
        await session_service.update_session_state(session_id, {
            "current_concept": first_q["concept_key"],
            "current_question": first_q["question"],
            "current_expected_answer": first_q["expected_answer"],
            "pending_questions": questions[1:],
            "attempt_number": 1,
        })
    return {"questions": questions, "first_question": questions[0] if questions else None}


@router.post("/{session_id}/answer")
async def submit_answer(session_id: str, req: AnswerRequest, student: Student = Depends(get_current_student), db: AsyncSession = Depends(get_db)):
    state = await session_service.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if await session_service.is_session_expired(session_id):
        await _auto_end_session(session_id, student, db)
        raise HTTPException(status_code=410, detail="Session time limit reached (45 minutes)")

    chapter = CHAPTER_BY_SLUG.get(state["chapter_slug"])
    concept_key = state.get("current_concept", "general")
    question = state.get("current_question", "")
    expected_answer = state.get("current_expected_answer", "")
    attempt_number = await session_service.get_concept_attempt_count(session_id, concept_key)
    attempt_number += 1

    # Evaluate answer
    evaluation = await ai_service.evaluate_answer(
        chapter["name"], student.grade, concept_key,
        question, expected_answer, req.answer, attempt_number
    )

    score = evaluation.get("score", 0)
    mastery_update = evaluation.get("mastery_update", score)

    # Save to DB
    db_result = await db.execute(select(Session).where(Session.id == uuid.UUID(session_id)))
    db_session = db_result.scalar_one_or_none()

    event = SessionEvent(
        session_id=uuid.UUID(session_id),
        concept_key=concept_key,
        question_text=question,
        student_answer=req.answer,
        score=score,
        gap_identified=evaluation.get("gap_identified"),
        error_type=evaluation.get("error_type"),
        explanation_given=evaluation.get("explanation"),
        input_mode=req.input_mode,
        attempt_number=attempt_number,
    )
    db.add(event)

    # Update mastery
    updated_mastery = await mastery_service.update_mastery(
        db, str(student.id), state["chapter_slug"], concept_key, mastery_update
    )

    # Update session stats
    if db_session:
        db_session.nodes_attempted = (db_session.nodes_attempted or 0) + 1
        if score >= 80:
            db_session.nodes_mastered = (db_session.nodes_mastered or 0) + 1

    await db.commit()

    # Increment attempt count in Redis
    await session_service.increment_concept_attempts(session_id, concept_key)

    # Determine next action
    next_action = {}
    if score >= 80:
        # Move to next concept
        concept_scores = state.get("concept_scores", {})
        concept_scores[concept_key] = score
        pending = state.get("pending_questions", [])
        if pending:
            next_q = pending[0]
            next_action = {
                "type": "next_question",
                "question": next_q,
            }
            await session_service.update_session_state(session_id, {
                "concept_scores": concept_scores,
                "current_concept": next_q["concept_key"],
                "current_question": next_q["question"],
                "current_expected_answer": next_q["expected_answer"],
                "pending_questions": pending[1:],
                "attempt_number": 1,
            })
        else:
            next_action = {"type": "session_complete"}
    else:
        # Re-teach logic
        concept_attempts = (await session_service.get_session_state(session_id)).get("concept_attempt_counts", {}).get(concept_key, 0)
        segment = await video_service.get_segment(state["chapter_slug"], concept_key)

        if concept_attempts <= 2 and segment:
            next_action = {
                "type": "replay_segment",
                "segment": segment,
                "new_question": evaluation.get("new_question", question),
            }
        elif concept_attempts == 3:
            analogy = await ai_service.generate_text_analogy(chapter["name"], concept_key, 3)
            next_action = {
                "type": "text_explanation",
                "explanation": analogy,
                "new_question": evaluation.get("new_question", question),
            }
        else:
            worked_example = await ai_service.generate_text_analogy(chapter["name"], concept_key, 4)
            next_action = {
                "type": "worked_example",
                "explanation": worked_example,
                "new_question": evaluation.get("new_question", question),
            }

        if evaluation.get("new_question"):
            await session_service.update_session_state(session_id, {
                "current_question": evaluation.get("new_question", question),
                "current_expected_answer": expected_answer,
            })

    return {
        "evaluation": evaluation,
        "score": score,
        "mastery_score": updated_mastery.mastery_score,
        "next_action": next_action,
        "time_elapsed": state.get("time_elapsed_seconds", 0),
    }


async def _auto_end_session(session_id: str, student: Student, db: AsyncSession):
    state = await session_service.get_session_state(session_id)
    if not state:
        return
    chapter = CHAPTER_BY_SLUG.get(state.get("chapter_slug", ""))
    concept_scores = state.get("concept_scores", {})
    time_seconds = state.get("time_elapsed_seconds", 2700)
    summary = await ai_service.generate_session_summary(
        chapter["name"] if chapter else "Math", concept_scores, time_seconds
    )
    db_result = await db.execute(select(Session).where(Session.id == uuid.UUID(session_id)))
    db_session = db_result.scalar_one_or_none()
    if db_session:
        db_session.ended_at = datetime.now(timezone.utc)
        db_session.summary_text = summary
        if concept_scores:
            db_session.total_score = sum(concept_scores.values()) / len(concept_scores)
        await db.commit()
    await session_service.delete_session_state(session_id)


@router.post("/{session_id}/end")
async def end_session(session_id: str, student: Student = Depends(get_current_student), db: AsyncSession = Depends(get_db)):
    state = await session_service.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found or already ended")

    chapter = CHAPTER_BY_SLUG.get(state.get("chapter_slug", ""))
    concept_scores = state.get("concept_scores", {})
    time_seconds = state.get("time_elapsed_seconds", 0)

    summary = await ai_service.generate_session_summary(
        chapter["name"] if chapter else "Math", concept_scores, time_seconds
    )

    db_result = await db.execute(select(Session).where(Session.id == uuid.UUID(session_id)))
    db_session = db_result.scalar_one_or_none()
    if db_session:
        db_session.ended_at = datetime.now(timezone.utc)
        db_session.summary_text = summary
        if concept_scores:
            db_session.total_score = round(sum(concept_scores.values()) / len(concept_scores), 2)
        await db.commit()
        await db.refresh(db_session)

    await session_service.delete_session_state(session_id)

    # Fetch all events for summary
    events_result = await db.execute(
        select(SessionEvent).where(SessionEvent.session_id == uuid.UUID(session_id))
    )
    events = events_result.scalars().all()

    return {
        "session_id": session_id,
        "summary": summary,
        "total_score": db_session.total_score if db_session else 0,
        "nodes_attempted": db_session.nodes_attempted if db_session else 0,
        "nodes_mastered": db_session.nodes_mastered if db_session else 0,
        "time_seconds": time_seconds,
        "concept_scores": concept_scores,
        "events_count": len(events),
    }


@router.get("/{session_id}/state")
async def get_state(session_id: str, student: Student = Depends(get_current_student)):
    state = await session_service.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state


@router.get("/{session_id}/summary")
async def get_session_summary(
    session_id: str,
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Return saved session summary for the summary page."""
    db_result = await db.execute(select(Session).where(Session.id == uuid.UUID(session_id)))
    db_session = db_result.scalar_one_or_none()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    events_result = await db.execute(
        select(SessionEvent).where(SessionEvent.session_id == uuid.UUID(session_id))
    )
    events = events_result.scalars().all()

    mastery_result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.student_id == student.id,
            ConceptMastery.chapter_slug == db_session.chapter_slug,
        )
    )
    mastery_records = mastery_result.scalars().all()

    duration = 0
    if db_session.ended_at and db_session.started_at:
        duration = int((db_session.ended_at - db_session.started_at).total_seconds() / 60)

    return {
        "session_id": session_id,
        "chapter_slug": db_session.chapter_slug,
        "flow_type": db_session.flow_type,
        "total_score": db_session.total_score or 0,
        "nodes_attempted": db_session.nodes_attempted or 0,
        "nodes_mastered": db_session.nodes_mastered or 0,
        "summary_text": db_session.summary_text,
        "duration_minutes": duration,
        "started_at": db_session.started_at.isoformat() if db_session.started_at else None,
        "ended_at": db_session.ended_at.isoformat() if db_session.ended_at else None,
        "concepts": [
            {
                "concept_key": m.concept_key,
                "mastery_score": m.mastery_score,
                "attempts": m.attempts,
            }
            for m in mastery_records
        ],
        "events_count": len(events),
    }
