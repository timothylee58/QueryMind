import { ref } from 'vue'
import type { ApiStatus, SearchResult } from '@/types'

const BASE = import.meta.env.VITE_API_BASE ?? ''

export function useApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function checkStatus(): Promise<ApiStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${BASE}/api/models`)
      const latencyMs = Date.now() - start
      if (!res.ok) return { status: 'offline', latencyMs, checkedAt: new Date().toISOString() }
      const data = await res.json()
      return {
        status: 'online',
        latencyMs,
        models: data.map((m: { id: string }) => m.id),
        checkedAt: new Date().toISOString(),
      }
    } catch {
      return { status: 'offline', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() }
    }
  }

  async function runQuery(params: {
    question: string
    connectionString: string
    schemaContext?: string
    chatId: string
  }): Promise<SearchResult | null> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: params.chatId,
          message: {
            id: crypto.randomUUID(),
            role: 'user',
            parts: [{ type: 'text', text: params.question }],
          },
          selectedChatModel: 'default',
          selectedVisibilityType: 'private',
          schemaContext: params.schemaContext,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        error.value = data.message ?? `HTTP ${res.status}`
        return null
      }

      // Parse the AI-SDK UI message stream for tool results
      const text = await res.text()
      return parseStreamForResult(text, params.question)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Request failed'
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, checkStatus, runQuery }
}

function parseStreamForResult(raw: string, question: string): SearchResult | null {
  // AI SDK streams chunks prefixed with type codes, e.g. "2:[...]" for data
  const lines = raw.split('\n').filter(Boolean)
  let lastToolResult: SearchResult | null = null

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const code = line.slice(0, colonIdx)
    const payload = line.slice(colonIdx + 1)

    try {
      if (code === '2') {
        // data array
        const items = JSON.parse(payload) as unknown[]
        for (const item of items) {
          const r = extractResultFromDataItem(item, question)
          if (r) lastToolResult = r
        }
      }
    } catch {
      // skip malformed chunks
    }
  }

  return lastToolResult
}

function extractResultFromDataItem(item: unknown, question: string): SearchResult | null {
  if (!item || typeof item !== 'object') return null
  const obj = item as Record<string, unknown>

  // Look for execute_query tool result shape
  if ('rows' in obj && 'columns' in obj && Array.isArray(obj.rows)) {
    return {
      rows: obj.rows as Record<string, unknown>[],
      columns: obj.columns as string[],
      rowCount: (obj.rowCount as number) ?? (obj.rows as unknown[]).length,
      executionMs: (obj.executionMs as number) ?? 0,
      sql: (obj.sql as string) ?? '',
      explanation: (obj.explanation as string) ?? question,
    }
  }
  return null
}
