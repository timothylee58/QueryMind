import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from './nanoid'
import type { SearchHistoryItem, SearchResult } from '@/types'

const HISTORY_KEY = 'qm_history'

function loadHistory(): SearchHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const result = ref<SearchResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pendingSql = ref<{ sql: string; explanation: string } | null>(null)
  const history = ref<SearchHistoryItem[]>(loadHistory())

  const recentHistory = computed(() => history.value.slice(0, 20))
  const hasResult = computed(() => result.value !== null)

  function saveHistory(item: Omit<SearchHistoryItem, 'id' | 'createdAt'>) {
    const entry: SearchHistoryItem = {
      ...item,
      id: nanoid(),
      createdAt: new Date().toISOString(),
    }
    history.value.unshift(entry)
    if (history.value.length > 50) history.value = history.value.slice(0, 50)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    } catch (e) {
      console.warn('Failed to save history to localStorage:', e)
    }
  }

  function clearHistory() {
    history.value = []
    localStorage.removeItem(HISTORY_KEY)
  }

  function clearResult() {
    result.value = null
    pendingSql.value = null
    error.value = null
  }

  function setResult(r: SearchResult) {
    result.value = r
    saveHistory({
      question: query.value,
      sql: r.sql,
      rowCount: r.rowCount,
      executionMs: r.executionMs,
    })
  }

  return {
    query,
    result,
    loading,
    error,
    pendingSql,
    history,
    recentHistory,
    hasResult,
    saveHistory,
    clearHistory,
    clearResult,
    setResult,
  }
})
