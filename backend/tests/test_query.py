import pytest
from unittest.mock import AsyncMock, MagicMock, patch

CONN = "postgresql://user:pass@localhost/db"


@pytest.mark.asyncio
async def test_health_endpoint(client):
    with patch("app.core.cache.cache_ping", new_callable=AsyncMock, return_value=True):
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "db" in data
    assert "cache" in data


@pytest.mark.asyncio
async def test_schema_endpoint(client):
    with patch(
        "app.api.routes.schema.get_schema",
        new_callable=AsyncMock,
        return_value={"users": [{"column": "id", "type": "uuid"}, {"column": "email", "type": "text"}]},
    ):
        response = await client.get("/schema?schema_name=public")
    assert response.status_code == 200
    data = response.json()
    assert data["schema_name"] == "public"
    assert "users" in data["tables"]
    assert data["tables"]["users"][0]["column"] == "id"


@pytest.mark.asyncio
async def test_query_cache_hit(client):
    cached_payload = {
        "sql": "SELECT * FROM users LIMIT 500",
        "results": [{"id": "1", "email": "test@example.com"}],
        "row_count": 1,
        "execution_time_ms": 12.5,
    }
    mock_pool = MagicMock()
    mock_pool.close = AsyncMock()

    with (
        patch("app.api.routes.query.cache_get", new_callable=AsyncMock, return_value=cached_payload),
        patch("app.api.routes.query._get_pool_for_conn", new_callable=AsyncMock, return_value=mock_pool),
    ):
        response = await client.post(
            "/query",
            json={"nl_query": "show all users", "schema_name": "public", "connection_string": CONN},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["cached"] is True
    assert data["sql"] == cached_payload["sql"]
    assert data["row_count"] == 1


@pytest.mark.asyncio
async def test_query_generates_sql(client):
    mock_pool = MagicMock()
    mock_pool.close = AsyncMock()

    with (
        patch("app.api.routes.query.cache_get", new_callable=AsyncMock, return_value=None),
        patch("app.api.routes.query.cache_set", new_callable=AsyncMock),
        patch("app.api.routes.query._get_pool_for_conn", new_callable=AsyncMock, return_value=mock_pool),
        patch(
            "app.api.routes.query.get_schema",
            new_callable=AsyncMock,
            return_value={"users": [{"column": "id", "type": "uuid"}]},
        ),
        patch(
            "app.api.routes.query.generate_sql",
            new_callable=AsyncMock,
            return_value="SELECT id FROM users LIMIT 10",
        ),
        patch(
            "app.api.routes.query.execute_query",
            new_callable=AsyncMock,
            return_value={"rows": [{"id": "abc"}], "row_count": 1, "execution_time_ms": 5.2},
        ),
    ):
        response = await client.post(
            "/query",
            json={"nl_query": "list user ids", "schema_name": "public", "connection_string": CONN},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["cached"] is False
    assert "SELECT" in data["sql"]
    assert data["row_count"] == 1


@pytest.mark.asyncio
async def test_generate_endpoint(client):
    mock_pool = MagicMock()
    mock_pool.close = AsyncMock()

    with (
        patch("app.api.routes.query.cache_get", new_callable=AsyncMock, return_value=None),
        patch("app.api.routes.query._get_pool_for_conn", new_callable=AsyncMock, return_value=mock_pool),
        patch(
            "app.api.routes.query.get_schema",
            new_callable=AsyncMock,
            return_value={"users": [{"column": "id", "type": "uuid"}]},
        ),
        patch(
            "app.api.routes.query.generate_sql",
            new_callable=AsyncMock,
            return_value="SELECT id FROM users LIMIT 10",
        ),
    ):
        response = await client.post(
            "/generate",
            json={"nl_query": "list user ids", "schema_name": "public", "connection_string": CONN},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["cached"] is False
    assert "SELECT" in data["sql"]


@pytest.mark.asyncio
async def test_execute_endpoint(client):
    mock_pool = MagicMock()
    mock_pool.close = AsyncMock()

    with (
        patch("app.api.routes.query._get_pool_for_conn", new_callable=AsyncMock, return_value=mock_pool),
        patch(
            "app.api.routes.query.execute_query",
            new_callable=AsyncMock,
            return_value={"rows": [{"id": "abc"}], "row_count": 1, "execution_time_ms": 3.1},
        ),
    ):
        response = await client.post(
            "/execute",
            json={"sql": "SELECT id FROM users LIMIT 10", "connection_string": CONN},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["row_count"] == 1
    assert data["cached"] is False


@pytest.mark.asyncio
async def test_sql_validator_blocks_non_select():
    from app.services.sql_executor import execute_query
    from fastapi import HTTPException

    pool = MagicMock()
    with pytest.raises(HTTPException) as exc_info:
        await execute_query(pool, "DROP TABLE users")
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_sql_validator_injects_limit():
    from app.services import sql_executor

    executed: list[str] = []
    conn = AsyncMock()

    async def capture_execute(sql):
        executed.append(sql)

    conn.execute = AsyncMock(side_effect=capture_execute)
    conn.fetch = AsyncMock(return_value=[])

    tx = MagicMock()
    tx.__aenter__ = AsyncMock(return_value=None)
    tx.__aexit__ = AsyncMock(return_value=None)
    conn.transaction = MagicMock(return_value=tx)

    acquire_ctx = MagicMock()
    acquire_ctx.__aenter__ = AsyncMock(return_value=conn)
    acquire_ctx.__aexit__ = AsyncMock(return_value=None)

    pool = MagicMock()
    pool.acquire = MagicMock(return_value=acquire_ctx)

    result = await sql_executor.execute_query(pool, "SELECT * FROM users")
    assert result["row_count"] == 0
    all_calls = " ".join(str(c) for c in conn.execute.call_args_list)
    assert "statement_timeout" in all_calls
