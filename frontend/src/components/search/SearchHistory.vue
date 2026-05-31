<script setup lang="ts">
import type { SearchHistoryItem } from '@/types'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'

defineProps<{ items: SearchHistoryItem[] }>()
const emit = defineEmits<{
  rerun: [question: string]
  clear: []
}>()

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}
</script>

<template>
  <section aria-label="Search history">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">History</h2>
      <Button
        v-if="items.length > 0"
        variant="ghost"
        size="sm"
        aria-label="Clear search history"
        @click="emit('clear')"
      >
        Clear
      </Button>
    </div>

    <ul v-if="items.length > 0" class="space-y-1.5" role="list">
      <li v-for="item in items" :key="item.id">
        <button
          class="group w-full rounded-lg border border-[#334155]/60 bg-[#1e293b]/60 p-3 text-left transition-colors hover:border-[#6366f1]/40 hover:bg-[#1e293b]"
          type="button"
          :aria-label="`Re-run: ${item.question}`"
          @click="emit('rerun', item.question)"
        >
          <p class="truncate text-sm text-[#e2e8f0] group-hover:text-white">{{ item.question }}</p>
          <div class="mt-1.5 flex items-center gap-2">
            <span class="text-xs text-[#64748b]">{{ formatDate(item.createdAt) }}</span>
            <Badge variant="muted">{{ item.rowCount }} rows</Badge>
            <Badge variant="muted">{{ item.executionMs }}ms</Badge>
          </div>
        </button>
      </li>
    </ul>

    <p v-else class="py-6 text-center text-sm text-[#64748b]">
      No search history yet. Run a query to get started.
    </p>
  </section>
</template>
