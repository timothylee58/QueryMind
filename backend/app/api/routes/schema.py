from fastapi import APIRouter, Request, Query
from app.services.schema_inspector import get_schema
from app.models.query import SchemaResponse, ColumnInfo
from app.core.database import get_pool

router = APIRouter()


@router.get("/schema", response_model=SchemaResponse, tags=["schema"])
async def schema_endpoint(
    request: Request,
    schema_name: str = Query(default="public", max_length=64, pattern=r"^[a-zA-Z0-9_]+$"),
) -> SchemaResponse:
    pool = get_pool(request)
    raw = await get_schema(pool, schema_name)
    tables = {
        tbl: [ColumnInfo(column=c["column"], type=c["type"]) for c in cols]
        for tbl, cols in raw.items()
    }
    return SchemaResponse(schema_name=schema_name, tables=tables)
