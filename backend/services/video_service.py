import json
import os
import aiofiles
from pathlib import Path

SEGMENTS_PATH = Path(__file__).parent.parent / "config" / "video_segments.json"
VIDEO_BASE_URL = os.getenv("VIDEO_BASE_URL", "https://your-bucket.s3.amazonaws.com")


async def get_all_segments() -> dict:
    try:
        if SEGMENTS_PATH.exists():
            async with aiofiles.open(SEGMENTS_PATH, "r") as f:
                content = await f.read()
                return json.loads(content)
    except Exception:
        pass
    return {}


async def get_segment(chapter_slug: str, concept_key: str) -> dict | None:
    segments = await get_all_segments()
    chapter_segments = segments.get(chapter_slug, {})
    return chapter_segments.get(concept_key)


async def save_segments(data: dict):
    SEGMENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(SEGMENTS_PATH, "w") as f:
        await f.write(json.dumps(data, indent=2))


def get_video_url(chapter_slug: str) -> str:
    return f"{VIDEO_BASE_URL}/videos/{chapter_slug}.mp4"
