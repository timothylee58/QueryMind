export interface QueryRequest {
  nl_query: string
  connection_string: string
  schema_name?: string
}

export interface QueryResponse {
  sql: string
  results: Record<string, unknown>[]
  cached: boolean
  row_count: number
  execution_time_ms: number
}

export interface ColumnInfo {
  column: string
  type: string
}

export interface SchemaResponse {
  schema_name: string
  tables: Record<string, ColumnInfo[]>
}
