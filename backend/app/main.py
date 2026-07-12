from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.routes import health, query, schema
from app.config import settings
from app.core.cache import cache_ping
from app.core.database import close_pool, init_pool

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.DATABASE_URL and "localhost" not in settings.DATABASE_URL or settings.ENV == "production":
        try:
            app.state.db_pool = await init_pool(settings.DATABASE_URL)
        except Exception as exc:
            print(f"[startup] DB pool init failed: {exc}")
            app.state.db_pool = None
    else:
        app.state.db_pool = None

    try:
        ok = await cache_ping()
        print(f"[startup] Cache ping: {'ok' if ok else 'unavailable'}")
    except Exception:
        pass

    yield

    # Shutdown
    if getattr(app.state, "db_pool", None):
        await close_pool(app.state.db_pool)


app = FastAPI(
    title="QueryMind API",
    description="Natural Language to SQL — powered by Claude Haiku",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Routers
app.include_router(health.router)
app.include_router(query.router)
app.include_router(schema.router)
