from fastapi import APIRouter, Request, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.cache import cache_get, cache_set, make_cache_key
from app.core.database import get_pool
from app.models.query import QueryRequest, QueryResponse
from app.services.nl_to_sql import generate_sql
from app.services.schema_inspector import get_schema, format_schema_for_prompt
from app.services.sql_executor import execute_query

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/query", response_model=QueryResponse, tags=["query"])
@limiter.limit("20/minute")
async def query_endpoint(
    request: Request,
    body: QueryRequest,
) -> QueryResponse:
    pool = get_pool(request)
    cache_key = make_cache_key(body.nl_query, body.schema_name)

    # Cache hit
    cached_data = await cache_get(cache_key)
    if cached_data:
        return QueryResponse(
            sql=cached_data["sql"],
            results=cached_data["results"],
            cached=True,
            row_count=cached_data["row_count"],
            execution_time_ms=cached_data["execution_time_ms"],
        )

    # Generate SQL
    schema = await get_schema(pool, body.schema_name)
    schema_context = format_schema_for_prompt(schema)
    sql = await generate_sql(body.nl_query, schema_context)

    # Execute
    result = await execute_query(pool, sql)

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
