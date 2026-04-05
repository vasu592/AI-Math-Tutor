from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from models.database import Student, Session, ConceptMastery, get_db
from routers.auth import get_current_student

router = APIRouter(prefix="/api/chapters/recap", tags=["recap"])


@router.get("/today")
async def today_recap(
    student: Student = Depends(get_current_student), db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    yesterday = now - timedelta(days=1)

    # Last session
    result = await db.execute(
        select(Session)
        .where(
            Session.student_id == student.id,
        )
        .order_by(Session.started_at.desc())
        .limit(1)
    )
    last_session = result.scalar_one_or_none()

    # Due for review
    due_result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.student_id == student.id,
            ConceptMastery.next_review_date <= now,
        )
    )
    due_concepts = due_result.scalars().all()

    # Mastery breakdown for last chapter
    chapter_breakdown = []
    if last_session:
        m_result = await db.execute(
            select(ConceptMastery).where(
                ConceptMastery.student_id == student.id,
                ConceptMastery.chapter_slug == last_session.chapter_slug,
            )
        )
        chapter_mastery = m_result.scalars().all()
        chapter_breakdown = [
            {
                "concept_key": m.concept_key,
                "mastery_score": m.mastery_score,
                "status": "mastered" if m.mastery_score >= 80 else "needs_work",
            }
            for m in chapter_mastery
        ]

    return {
        "student_name": student.name,
        "last_session": {
            "chapter_slug": last_session.chapter_slug,
            "total_score": last_session.total_score,
            "nodes_mastered": last_session.nodes_mastered,
            "nodes_attempted": last_session.nodes_attempted,
            "summary": last_session.summary_text,
            "started_at": last_session.started_at.isoformat(),
        }
        if last_session
        else None,
        "chapter_breakdown": chapter_breakdown,
        "due_for_review": [
            {
                "chapter_slug": m.chapter_slug,
                "concept_key": m.concept_key,
                "mastery_score": m.mastery_score,
            }
            for m in due_concepts
        ],
        "is_first_session": last_session is None,
    }
