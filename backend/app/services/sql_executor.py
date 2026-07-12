import re
import time
from typing import Any

import asyncpg
from fastapi import HTTPException

_SELECT_RE = re.compile(r"^\s*SELECT\b", re.IGNORECASE)
_LIMIT_RE = re.compile(r"\bLIMIT\b", re.IGNORECASE)
_DANGEROUS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE|COPY)\b",
    re.IGNORECASE,
)


def _validate_sql(sql: str) -> str:
    sql = sql.strip()
    if not _SELECT_RE.match(sql):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")
    if _DANGEROUS.search(sql):
        raise HTTPException(status_code=400, detail="Query contains forbidden SQL keywords.")
    if not _LIMIT_RE.search(sql):
        sql = f"{sql} LIMIT 500"
    return sql


async def execute_query(
    pool: asyncpg.Pool, sql: str
) -> dict[str, Any]:
    sql = _validate_sql(sql)

    start = time.perf_counter()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction(readonly=True):
                await conn.execute("SET LOCAL statement_timeout = '10000'")
                records = await conn.fetch(sql)
    except asyncpg.PostgresError as exc:
        # Expose only a safe, generic message
        code = getattr(exc, "sqlstate", "XX000")
        raise HTTPException(
            status_code=400,
            detail=f"Query failed (code {code}). Check your question and try again.",
        )
    except asyncpg.TooManyConnectionsError:
        raise HTTPException(status_code=503, detail="Database busy — please retry.")

    elapsed_ms = (time.perf_counter() - start) * 1000
    rows = [dict(r) for r in records]

    return {
        "rows": rows,
        "row_count": len(rows),
        "execution_time_ms": round(elapsed_ms, 2),
    }
