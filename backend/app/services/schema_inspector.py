import json
from typing import Any

import asyncpg

from app.core.cache import cache_get, cache_set

_SCHEMA_TTL = 1800


async def get_schema(pool: asyncpg.Pool, schema_name: str) -> dict[str, list[dict[str, str]]]:
    cache_key = f"schema:{schema_name}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    query = """
        SELECT
            t.table_name,
            c.column_name,
            c.data_type
        FROM information_schema.tables t
        JOIN information_schema.columns c
            ON c.table_name = t.table_name
            AND c.table_schema = t.table_schema
        WHERE t.table_schema = $1
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
    """

    async with pool.acquire() as conn:
        rows = await conn.fetch(query, schema_name)

    result: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        tbl = row["table_name"]
        if tbl not in result:
            result[tbl] = []
        result[tbl].append({"column": row["column_name"], "type": row["data_type"]})

    await cache_set(cache_key, result, ttl=_SCHEMA_TTL)
    return result


def format_schema_for_prompt(schema: dict[str, list[dict[str, str]]]) -> str:
    lines = []
    for table_name, columns in schema.items():
        cols = ", ".join(f"{c['column']} ({c['type']})" for c in columns)
        lines.append(f"Table: {table_name} | Columns: {cols}")
    return "\n".join(lines)
