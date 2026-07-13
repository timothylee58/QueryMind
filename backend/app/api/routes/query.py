import asyncpg
from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.cache import cache_get, cache_set, make_cache_key
from app.core.database import get_pool
from app.models.query import (
    ExecuteRequest,
    GenerateRequest,
    GenerateResponse,
    QueryRequest,
    QueryResponse,
)
from app.services.nl_to_sql import generate_sql
from app.services.schema_inspector import format_schema_for_prompt, get_schema
from app.services.sql_executor import execute_query

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


async def _get_pool_for_conn(request: Request, connection_string: str):
    """Return a per-request asyncpg pool for a user-supplied connection string."""
    return await asyncpg.create_pool(connection_string, min_size=1, max_size=1)


@router.post("/generate", response_model=GenerateResponse, tags=["query"])
@limiter.limit("20/minute")
async def generate_endpoint(
    request: Request,
    body: GenerateRequest,
) -> GenerateResponse:
    """Translate a natural-language question to SQL without executing it."""
    cache_key = make_cache_key(body.nl_query, body.schema_name)

    # Return cached SQL if available (skip re-generation)
    cached_data = await cache_get(cache_key)
    if cached_data:
        return GenerateResponse(sql=cached_data["sql"], cached=True)

    pool = await _get_pool_for_conn(request, body.connection_string)
    try:
        schema = await get_schema(pool, body.schema_name)
    finally:
        await pool.close()

    schema_context = format_schema_for_prompt(schema)
    sql = await generate_sql(body.nl_query, schema_context)
    return GenerateResponse(sql=sql, cached=False)


@router.post("/execute", response_model=QueryResponse, tags=["query"])
@limiter.limit("20/minute")
async def execute_endpoint(
    request: Request,
    body: ExecuteRequest,
) -> QueryResponse:
    """Execute a pre-confirmed SQL statement (SELECT only)."""
    pool = await _get_pool_for_conn(request, body.connection_string)
    try:
        result = await execute_query(pool, body.sql)
    finally:
        await pool.close()

    return QueryResponse(
        sql=body.sql,
        results=result["rows"],
        cached=False,
        row_count=result["row_count"],
        execution_time_ms=result["execution_time_ms"],
    )


@router.post("/query", response_model=QueryResponse, tags=["query"])
@limiter.limit("20/minute")
async def query_endpoint(
    request: Request,
    body: QueryRequest,
) -> QueryResponse:
    """Generate SQL and execute in one shot (for programmatic callers)."""
    cache_key = make_cache_key(body.nl_query, body.schema_name)

    cached_data = await cache_get(cache_key)
    if cached_data:
        return QueryResponse(
            sql=cached_data["sql"],
            results=cached_data["results"],
            cached=True,
            row_count=cached_data["row_count"],
            execution_time_ms=cached_data["execution_time_ms"],
        )

    pool = await _get_pool_for_conn(request, body.connection_string)
    try:
        schema = await get_schema(pool, body.schema_name)
        schema_context = format_schema_for_prompt(schema)
        sql = await generate_sql(body.nl_query, schema_context)
        result = await execute_query(pool, sql)
    finally:
        await pool.close()

    payload = {
        "sql": sql,
        "results": result["rows"],
        "row_count": result["row_count"],
        "execution_time_ms": result["execution_time_ms"],
    }
    await cache_set(cache_key, payload, ttl=3600)

    return QueryResponse(
        sql=sql,
        results=result["rows"],
        cached=False,
        row_count=result["row_count"],
        execution_time_ms=result["execution_time_ms"],
    )
