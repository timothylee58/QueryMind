import hashlib
import json
from typing import Any

from app.config import settings

try:
    from upstash_redis import Redis as UpstashRedis

    _upstash_available = True
except ImportError:
    _upstash_available = False

# Fallback to standard redis for local dev
_redis_fallback = None


def _get_client():
    if _upstash_available and settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
        return UpstashRedis(
            url=settings.UPSTASH_REDIS_REST_URL,
            token=settings.UPSTASH_REDIS_REST_TOKEN,
        )
    if settings.ENV == "development":
        # local redis-py fallback
        try:
            import redis as redis_py  # type: ignore

            global _redis_fallback
            if _redis_fallback is None:
                _redis_fallback = redis_py.Redis(host="redis", port=6379, decode_responses=True)
            return _redis_fallback
        except Exception:
            pass
    return None


def make_cache_key(nl_query: str, schema_name: str) -> str:
    raw = f"{nl_query.strip().lower()}|{schema_name}"
    return "qm:" + hashlib.sha256(raw.encode()).hexdigest()


async def cache_get(key: str) -> Any | None:
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
        if raw is None:
            return None
        return json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        return None


async def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.set(key, json.dumps(value), ex=ttl)
    except Exception:
        pass


async def cache_ping() -> bool:
    client = _get_client()
    if client is None:
        return False
    try:
        result = client.ping()
        return result is True or result == b"PONG" or result == "PONG"
    except Exception:
        return False
