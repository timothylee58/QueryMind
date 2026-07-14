<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SearchResult } from '@/types'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'

const props = defineProps<{ result: SearchResult }>()

type View = 'table' | 'sql'
const view = ref<View>('table')

const numericCols = computed(() =>
  props.result.columns.filter((c) => props.result.rows.some((r) => typeof r[c] === 'number'))
)
</script>

<template>
  <Card>
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#334155] px-4 py-2">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-[#f1f5f9]">
          {{ result.rowCount }} {{ result.rowCount === 1 ? 'row' : 'rows' }}
        </span>
        <Badge variant="muted">{{ result.executionMs }}ms</Badge>
      </div>
      <div class="flex gap-1" role="tablist" aria-label="Result view">
        <button
          v-for="v in ['table', 'sql'] as View[]"
          :key="v"
          role="tab"
          :aria-selected="view === v"
          :class="[
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            view === v
              ? 'bg-[#6366f1] text-white'
              : 'text-[#94a3b8] hover:text-[#f1f5f9]',
          ]"
          type="button"
          @click="view = v"
        >
          {{ v === 'table' ? 'Table' : 'SQL' }}
        </button>
      </div>
    </div>

    <!-- Table view -->
    <div v-if="view === 'table'" class="overflow-x-auto max-h-96" role="tabpanel" aria-label="Results table">
      <table class="w-full text-sm" aria-label="Query results">
        <thead class="sticky top-0 bg-[#0f172a]/80 backdrop-blur-sm">
          <tr>
            <th
              v-for="col in result.columns"
              :key="col"
              scope="col"
              class="border-b border-[#334155] px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[#64748b]"
            >
              {{ col }}
              <span v-if="numericCols.includes(col)" class="ml-1 text-[#6366f1]" aria-label="numeric column">#</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in result.rows"
            :key="i"
            class="border-b border-[#334155]/40 hover:bg-[#1e293b]/50 transition-colors"
          >
            <td
              v-for="col in result.columns"
              :key="col"
              class="px-3 py-2 font-mono text-xs text-[#e2e8f0]"
            >
              <span v-if="row[col] === null" class="italic text-[#64748b]">null</span>
              <span v-else>{{ String(row[col]) }}</span>
            </td>
          </tr>
          <tr v-if="result.rows.length === 0">
            <td :colspan="result.columns.length" class="py-8 text-center text-sm text-[#64748b]">
              No rows returned
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SQL view -->
    <div v-else class="p-4" role="tabpanel" aria-label="Generated SQL">
      <pre class="overflow-x-auto rounded-lg bg-[#0f172a] p-4 font-mono text-sm leading-relaxed text-green-400" aria-label="SQL query"><code>{{ result.sql || '-- SQL not available' }}</code></pre>
      <p v-if="result.explanation" class="mt-3 text-sm text-[#94a3b8]">{{ result.explanation }}</p>
    </div>
  </Card>
</template>
