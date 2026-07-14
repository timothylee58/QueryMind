from fastapi import APIRouter, Request
from app.core.cache import cache_ping
from app.models.query import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["ops"])
async def health(request: Request) -> HealthResponse:
    # DB ping
    db_ok = False
    try:
        pool = request.app.state.db_pool
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_ok = True
    except Exception:
        pass

    cache_ok = await cache_ping()

    return HealthResponse(
        status="ok",
        db=db_ok,
        cache=cache_ok,
    )
