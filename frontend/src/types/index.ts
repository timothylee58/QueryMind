export interface SearchResult {
  rows: Record<string, unknown>[]
  columns: string[]
  rowCount: number
  executionMs: number
  sql: string
  explanation: string
}

export interface SearchHistoryItem {
  id: string
  question: string
  sql: string
  rowCount: number
  executionMs: number
  createdAt: string
}

export interface SchemaTable {
  name: string
  columns: { name: string; type: string }[]
}

export interface ApiStatus {
  status: 'online' | 'offline' | 'checking'
  latencyMs?: number
  models?: string[]
  checkedAt?: string
}

export interface ConnectionState {
  connected: boolean
  connectionString: string
  schema: SchemaTable[]
  error?: string
}
