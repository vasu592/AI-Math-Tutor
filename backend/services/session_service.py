import json
import uuid
from datetime import datetime, timezone
from redis.asyncio import Redis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SESSION_TTL = 7200  # 2 hours
MAX_SESSION_SECONDS = 2700  # 45 minutes


async def get_redis() -> Redis:
    return Redis.from_url(REDIS_URL, decode_responses=True)


def session_key(session_id: str) -> str:
    return f"session:{session_id}"


async def create_session_state(session_id: str, student_id: str, chapter_slug: str, flow_type: str) -> dict:
    state = {
        "student_id": student_id,
        "chapter_slug": chapter_slug,
        "flow_type": flow_type,
        "current_concept": None,
        "attempt_number": 1,
        "concept_attempt_counts": {},
        "questions_asked": [],
        "concept_scores": {},
        "session_start": datetime.now(timezone.utc).isoformat(),
        "time_elapsed_seconds": 0,
        "current_question": None,
        "current_expected_answer": None,
        "concepts_list": [],
        "chapter_content": None,
    }
    redis = await get_redis()
    await redis.setex(session_key(session_id), SESSION_TTL, json.dumps(state))
    await redis.aclose()
    return state


async def get_session_state(session_id: str) -> dict | None:
    redis = await get_redis()
    data = await redis.get(session_key(session_id))
    await redis.aclose()
    if not data:
        return None
    return json.loads(data)


async def update_session_state(session_id: str, updates: dict) -> dict:
    redis = await get_redis()
    data = await redis.get(session_key(session_id))
    if not data:
        raise ValueError("Session not found")
    state = json.loads(data)
    # Update elapsed time
    start = datetime.fromisoformat(state["session_start"])
    now = datetime.now(timezone.utc)
    state["time_elapsed_seconds"] = int((now - start).total_seconds())
    state.update(updates)
    await redis.setex(session_key(session_id), SESSION_TTL, json.dumps(state))
    await redis.aclose()
    return state


async def is_session_expired(session_id: str) -> bool:
    state = await get_session_state(session_id)
    if not state:
        return True
    start = datetime.fromisoformat(state["session_start"])
    elapsed = (datetime.now(timezone.utc) - start).total_seconds()
    return elapsed > MAX_SESSION_SECONDS


async def delete_session_state(session_id: str):
    redis = await get_redis()
    await redis.delete(session_key(session_id))
    await redis.aclose()


async def increment_concept_attempts(session_id: str, concept_key: str) -> int:
    state = await get_session_state(session_id)
    counts = state.get("concept_attempt_counts", {})
    counts[concept_key] = counts.get(concept_key, 0) + 1
    await update_session_state(session_id, {"concept_attempt_counts": counts, "attempt_number": counts[concept_key]})
    return counts[concept_key]


async def get_concept_attempt_count(session_id: str, concept_key: str) -> int:
    state = await get_session_state(session_id)
    return state.get("concept_attempt_counts", {}).get(concept_key, 0)
