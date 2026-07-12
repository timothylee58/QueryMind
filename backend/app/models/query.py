from pydantic import BaseModel, Field
from typing import Any


class QueryRequest(BaseModel):
    nl_query: str = Field(..., min_length=1, max_length=2000, description="Natural language question")
    schema_name: str = Field(default="public", max_length=64, pattern=r"^[a-zA-Z0-9_]+$")


class QueryResponse(BaseModel):
    sql: str
    results: list[dict[str, Any]]
    cached: bool
    row_count: int
    execution_time_ms: float


class ColumnInfo(BaseModel):
    column: str
    type: str


class SchemaResponse(BaseModel):
    schema_name: str
    tables: dict[str, list[ColumnInfo]]


class HealthResponse(BaseModel):
    status: str
    db: bool
    cache: bool
