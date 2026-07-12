import type { QueryRequest, QueryResponse, SchemaResponse } from '@/types'

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
