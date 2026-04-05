from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from models.database import Student, ConceptMastery, get_db
from routers.auth import get_current_student
from config.chapters import CHAPTERS
from config.topics import TOPICS_BY_SLUG
from config.chapter_content import CONTENT_BY_SLUG
from config.chapter_details import DETAILS_BY_SLUG
from config.chapter_book import BOOK_CONTENT_BY_SLUG
import uuid

router = APIRouter(prefix="/api/chapters", tags=["chapters"])


@router.get("")
async def list_chapters(
    student: Student = Depends(get_current_student), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ConceptMastery).where(ConceptMastery.student_id == student.id)
    )
    all_mastery = result.scalars().all()

    mastery_by_chapter: dict[str, list] = {}
    for m in all_mastery:
        mastery_by_chapter.setdefault(m.chapter_slug, []).append(m)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    chapters_out = []
    for ch in CHAPTERS:
        if ch["class_num"] != student.grade:
            continue
        slug = ch["slug"]
        masteries = mastery_by_chapter.get(slug, [])
        if not masteries:
            status = "not_started"
            avg_mastery = 0.0
            due_for_review = False
        else:
            avg_mastery = sum(m.mastery_score for m in masteries) / len(masteries)
            status = "mastered" if avg_mastery >= 80 else "in_progress"
            due_for_review = any(
                m.next_review_date and m.next_review_date <= now for m in masteries
            )
        chapters_out.append(
            {
                **ch,
                "status": status,
                "avg_mastery": round(avg_mastery, 1),
                "due_for_review": due_for_review,
            }
        )
    return chapters_out


@router.get("/{slug}/mastery")
async def chapter_mastery(
    slug: str,
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.student_id == student.id,
            ConceptMastery.chapter_slug == slug,
        )
    )
    masteries = result.scalars().all()
    return [
        {
            "concept_key": m.concept_key,
            "mastery_score": m.mastery_score,
            "attempts": m.attempts,
            "last_tested": m.last_tested.isoformat() if m.last_tested else None,
            "next_review_date": m.next_review_date.isoformat()
            if m.next_review_date
            else None,
        }
        for m in masteries
    ]


@router.get("/{slug}")
async def get_chapter_details(slug: str):
    chapter = next((c for c in CHAPTERS if c["slug"] == slug), None)
    if not chapter:
        return {"error": "Chapter not found"}

    topics_data = TOPICS_BY_SLUG.get(slug, {})
    content_data = CONTENT_BY_SLUG.get(slug, {})
    details_data = DETAILS_BY_SLUG.get(slug, {})
    book_data = BOOK_CONTENT_BY_SLUG.get(slug, {})

    return {
        **chapter,
        "description": content_data.get("description", ""),
        "learning_objectives": content_data.get("learning_objectives", []),
        "topics": topics_data.get("topics", []),
        "sections": details_data.get("sections", []),
        "exercises": details_data.get("exercises", []),
        "summary": details_data.get("summary", ""),
        "book_content": book_data.get("chapters", []),
    }
