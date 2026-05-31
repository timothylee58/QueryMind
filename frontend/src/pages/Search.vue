<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import { useConnectionStore } from '@/stores/connection'
import { useSearch } from '@/composables/useSearch'
import SearchBar from '@/components/search/SearchBar.vue'
import SearchResults from '@/components/search/SearchResults.vue'
import SearchHistory from '@/components/search/SearchHistory.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Badge from '@/components/ui/Badge.vue'

const route = useRoute()
const searchStore = useSearchStore()
const connectionStore = useConnectionStore()
const { submit, loading } = useSearch()

// Pre-fill query from route or store
onMounted(() => {
  if (route.query.q && typeof route.query.q === 'string') {
    searchStore.query = route.query.q
  }
})

watch(loading, (val) => {
  if (val) searchStore.loading = true
  else searchStore.loading = false
})

function handleSubmit(q: string) {
  submit(q)
}

function handleRerun(question: string) {
  searchStore.query = question
  submit(question)
}
</script>

<template>
  <div class="flex flex-col overflow-hidden">
    <!-- Page header -->
    <header class="border-b border-[#334155] bg-[#0f172a]/80 px-6 py-4 backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-bold text-[#f1f5f9]">Search</h1>
        <Badge v-if="connectionStore.isConnected" variant="success">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true"/>
          {{ connectionStore.tableCount }} tables
        </Badge>
        <Badge v-else variant="muted">No DB connected</Badge>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Main search area -->
      <div class="flex flex-1 flex-col overflow-y-auto p-6">
        <!-- Search bar -->
        <SearchBar
          :loading="loading"
          :disabled="!connectionStore.isConnected"
          @submit="handleSubmit"
        />

        <!-- Warning if not connected -->
        <div
          v-if="!connectionStore.isConnected"
          class="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400"
          role="alert"
          aria-live="polite"
        >
          Connect a database in Settings to enable search.
        </div>

        <!-- Loading skeletons -->
        <div v-if="loading" class="mt-6 space-y-3" aria-busy="true" aria-label="Loading results">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-6 w-3/4" />
          <Skeleton class="h-6 w-1/2" />
          <Skeleton class="h-6 w-5/6" />
        </div>

        <!-- Error state -->
        <div
          v-else-if="searchStore.error"
          class="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          role="alert"
          aria-live="assertive"
        >
          {{ searchStore.error }}
        </div>

        <!-- Results -->
        <div v-else-if="searchStore.result" class="mt-6">
          <SearchResults :result="searchStore.result" />
        </div>

        <!-- Empty state -->
        <div
          v-else-if="connectionStore.isConnected && !loading"
          class="mt-12 text-center"
          aria-label="Empty search state"
        >
          <svg class="mx-auto mb-4 h-12 w-12 text-[#334155]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <p class="text-sm text-[#64748b]">Ask a question about your data to get started</p>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <button
              v-for="example in ['Show all tables', 'Top 10 rows', 'Count records', 'Latest entries']"
              :key="example"
              class="rounded-full border border-[#334155] bg-[#1e293b] px-3 py-1 text-xs text-[#94a3b8] transition-colors hover:border-[#6366f1]/50 hover:text-[#f1f5f9]"
              type="button"
              @click="handleSubmit(example)"
            >
              {{ example }}
            </button>
          </div>
        </div>
      </div>

      <!-- History sidebar -->
      <aside
        class="hidden w-72 flex-shrink-0 overflow-y-auto border-l border-[#334155] p-4 xl:block"
        aria-label="Search history sidebar"
      >
        <SearchHistory
          :items="searchStore.recentHistory"
          @rerun="handleRerun"
          @clear="searchStore.clearHistory()"
        />
      </aside>
    </div>
  </div>
</template>
