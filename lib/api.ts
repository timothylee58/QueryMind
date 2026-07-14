import type {
  ExecuteRequest,
  GenerateRequest,
  GenerateResponse,
  QueryRequest,
  QueryResponse,
  SchemaResponse,
} from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body?.detail ?? body?.message ?? message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

/** Step 1: translate NL to SQL without executing. */
export async function generateSql(
  nlQuery: string,
  connectionString: string,
  schemaName = 'public'
): Promise<GenerateResponse> {
  return apiFetch<GenerateResponse>('/generate', {
    method: 'POST',
    body: JSON.stringify({
      nl_query: nlQuery,
      connection_string: connectionString,
      schema_name: schemaName,
    } satisfies GenerateRequest),
  })
}

/** Step 2: execute a user-confirmed SQL statement. */
export async function executeSql(
  sql: string,
  connectionString: string
): Promise<QueryResponse> {
  return apiFetch<QueryResponse>('/execute', {
    method: 'POST',
    body: JSON.stringify({ sql, connection_string: connectionString } satisfies ExecuteRequest),
  })
}

/** One-shot: generate + execute (for non-interactive callers). */
export async function generateQuery(
  nlQuery: string,
  connectionString: string,
  schemaName = 'public'
): Promise<QueryResponse> {
  return apiFetch<QueryResponse>('/query', {
    method: 'POST',
    body: JSON.stringify({
      nl_query: nlQuery,
      connection_string: connectionString,
      schema_name: schemaName,
    } satisfies QueryRequest),
  })
}

export async function getSchema(schemaName = 'public'): Promise<SchemaResponse> {
  return apiFetch<SchemaResponse>(`/schema?schema_name=${encodeURIComponent(schemaName)}`)
}
