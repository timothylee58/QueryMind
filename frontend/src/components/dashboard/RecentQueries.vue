<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import Badge from '@/components/ui/Badge.vue'

const router = useRouter()
const searchStore = useSearchStore()

function rerun(question: string) {
  searchStore.query = question
  router.push('/search')
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}
</script>

<template>
  <section aria-label="Recent queries">
    <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-[#64748b]">Recent Queries</h2>
    <ul v-if="searchStore.recentHistory.length > 0" class="space-y-2" role="list">
      <li v-for="item in searchStore.recentHistory.slice(0, 5)" :key="item.id">
        <button
          class="group w-full rounded-lg border border-[#334155]/60 bg-[#0f172a]/60 p-3 text-left transition-all hover:border-[#6366f1]/40 hover:bg-[#1e293b]"
          type="button"
          :aria-label="`Re-run query: ${item.question}`"
          @click="rerun(item.question)"
        >
          <p class="truncate text-sm text-[#cbd5e1] group-hover:text-white">{{ item.question }}</p>
          <div class="mt-1 flex gap-2">
            <span class="text-xs text-[#475569]">{{ formatDate(item.createdAt) }}</span>
            <Badge variant="muted">{{ item.rowCount }} rows</Badge>
          </div>
        </button>
      </li>
    </ul>
    <p v-else class="py-4 text-sm text-[#475569]">No queries yet.</p>
  </section>
</template>
