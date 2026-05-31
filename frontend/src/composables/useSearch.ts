import { useSearchStore } from '@/stores/search'
import { useConnectionStore } from '@/stores/connection'
import { useApi } from './useApi'

export function useSearch() {
  const searchStore = useSearchStore()
  const connectionStore = useConnectionStore()
  const { runQuery, loading, error } = useApi()

  async function submit(question: string) {
    if (!question.trim()) return
    searchStore.query = question
    searchStore.clearResult()

    const result = await runQuery({
      question,
      connectionString: connectionStore.connectionString,
      schemaContext: connectionStore.schema.length
        ? formatSchema(connectionStore.schema)
        : undefined,
      chatId: crypto.randomUUID(),
    })

    if (result) {
      searchStore.setResult(result)
    } else {
      searchStore.error = error.value
    }
  }

  return { submit, loading, error }
}

function formatSchema(tables: { name: string; columns: { name: string; type: string }[] }[]) {
  return tables
    .map((t) => `Table: ${t.name}\n${t.columns.map((c) => `  - ${c.name}: ${c.type}`).join('\n')}`)
    .join('\n\n')
}
