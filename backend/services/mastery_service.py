from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import ConceptMastery
import uuid


def compute_new_mastery(old_score: float, new_score: float) -> float:
    return round((old_score * 0.6) + (new_score * 0.4), 2)


def compute_next_review_date(attempts: int) -> datetime:
    now = datetime.now(timezone.utc)
    days_map = {1: 3, 2: 7, 3: 14}
    days = days_map.get(attempts, 30)
    return now + timedelta(days=days)


async def get_or_create_mastery(
    db: AsyncSession, student_id: str, chapter_slug: str, concept_key: str
) -> ConceptMastery:
    result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.student_id == uuid.UUID(student_id),
            ConceptMastery.chapter_slug == chapter_slug,
            ConceptMastery.concept_key == concept_key,
        )
    )
    mastery = result.scalar_one_or_none()
    if not mastery:
        mastery = ConceptMastery(
            student_id=uuid.UUID(student_id),
            chapter_slug=chapter_slug,
            concept_key=concept_key,
            mastery_score=0.0,
            attempts=0,
        )
        db.add(mastery)
        await db.flush()
    return mastery


async def update_mastery(
    db: AsyncSession, student_id: str, chapter_slug: str, concept_key: str, new_score: float
) -> ConceptMastery:
    mastery = await get_or_create_mastery(db, student_id, chapter_slug, concept_key)
    old_score = mastery.mastery_score or 0.0
    mastery.mastery_score = compute_new_mastery(old_score, new_score)
    mastery.attempts = (mastery.attempts or 0) + 1
    mastery.last_tested = datetime.now(timezone.utc)
    if mastery.mastery_score >= 80:
        mastery.next_review_date = compute_next_review_date(mastery.attempts)
    await db.commit()
    await db.refresh(mastery)
    return mastery


async def get_chapter_mastery(db: AsyncSession, student_id: str, chapter_slug: str) -> list[ConceptMastery]:
    result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.student_id == uuid.UUID(student_id),
            ConceptMastery.chapter_slug == chapter_slug,
        )
    )
    return result.scalars().all()


async def get_weakest_concept(db: AsyncSession, student_id: str, chapter_slug: str) -> ConceptMastery | None:
    result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.student_id == uuid.UUID(student_id),
            ConceptMastery.chapter_slug == chapter_slug,
            ConceptMastery.mastery_score < 80,
        ).order_by(ConceptMastery.mastery_score.asc()).limit(1)
    )
    return result.scalar_one_or_none()


async def get_due_for_review(db: AsyncSession, student_id: str) -> list[ConceptMastery]:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(ConceptMastery).where(
            ConceptMastery.student_id == uuid.UUID(student_id),
            ConceptMastery.next_review_date <= now,
        )
    )
    return result.scalars().all()
