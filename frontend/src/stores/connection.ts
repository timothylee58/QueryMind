import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SchemaTable } from '@/types'

const STORAGE_KEY = 'qm_connection'

export const useConnectionStore = defineStore('connection', () => {
  const connectionString = ref(sessionStorage.getItem(STORAGE_KEY) ?? '')
  const connected = ref(false)
  const schema = ref<SchemaTable[]>([])
  const error = ref<string | null>(null)
  const loading = ref(false)

  const isConnected = computed(() => connected.value)
  const tableCount = computed(() => schema.value.length)

  async function connect(connStr: string) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/db/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connStr }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        error.value = data.error ?? 'Connection failed'
        connected.value = false
        return false
      }
      connectionString.value = connStr
      connected.value = true
      sessionStorage.setItem(STORAGE_KEY, connStr)
      await loadSchema()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Network error'
      connected.value = false
      return false
    } finally {
      loading.value = false
    }
  }

  async function loadSchema() {
    if (!connectionString.value) return
    try {
      const res = await fetch('/api/db/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connectionString.value }),
      })
      if (res.ok) {
        const data = await res.json()
        schema.value = data.schema ?? []
      }
    } catch {
      // schema load is best-effort
    }
  }

  function disconnect() {
    connectionString.value = ''
    connected.value = false
    schema.value = []
    error.value = null
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return { connectionString, connected, schema, error, loading, isConnected, tableCount, connect, disconnect, loadSchema }
})
