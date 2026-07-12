import asyncpg
from typing import Any
from fastapi import Request


async def init_pool(database_url: str) -> asyncpg.Pool:
    # asyncpg expects postgresql:// not postgresql+asyncpg://
    url = database_url.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgres+asyncpg://", "postgresql://"
    )
    pool = await asyncpg.create_pool(
        dsn=url,
        min_size=2,
        max_size=10,
        command_timeout=15,
    )
    return pool


async def close_pool(pool: asyncpg.Pool) -> None:
    await pool.close()


def get_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.db_pool
