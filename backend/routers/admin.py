import os
from typing import Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from services.video_service import get_all_segments, save_segments, get_segment
from config.chapters import CHAPTERS

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def require_admin(x_admin_password: Optional[str] = Header(None)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")


class SegmentEntry(BaseModel):
    start: int
    end: int


class SaveChapterSegmentsRequest(BaseModel):
    chapter_slug: str
    segments: Dict[str, SegmentEntry]  # { concept_key: { start, end } }


@router.get("/segments")
async def get_segments(_: None = Depends(require_admin)):
    """Get all video segments plus chapter list."""
    data = await get_all_segments()
    return {
        "segments": data,
        "chapters": [{"name": c["name"], "slug": c["slug"]} for c in CHAPTERS],
    }


@router.get("/segments/{chapter_slug}")
async def get_chapter_segments(chapter_slug: str, _: None = Depends(require_admin)):
    """Get segments for a specific chapter."""
    data = await get_all_segments()
    return {
        "chapter_slug": chapter_slug,
        "segments": data.get(chapter_slug, {}),
    }


@router.post("/segments")
async def save_chapter_segments(
    body: SaveChapterSegmentsRequest,
    _: None = Depends(require_admin),
):
    """Save segments for one chapter. Merges into existing data."""
    all_segments = await get_all_segments()
    # Update just this chapter's segments
    all_segments[body.chapter_slug] = {
        k: {"start": v.start, "end": v.end}
        for k, v in body.segments.items()
    }
    await save_segments(all_segments)
    return {
        "status": "saved",
        "chapter_slug": body.chapter_slug,
        "segments": all_segments[body.chapter_slug],
    }
