<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/connection'
import { useSearchStore } from '@/stores/search'
import StatsCard from '@/components/dashboard/StatsCard.vue'
import ConnectionStatus from '@/components/dashboard/ConnectionStatus.vue'
import RecentQueries from '@/components/dashboard/RecentQueries.vue'
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const connectionStore = useConnectionStore()
const searchStore = useSearchStore()

const avgMs = computed(() => {
  if (!searchStore.history.length) return '—'
  const avg = searchStore.history.reduce((s, h) => s + h.executionMs, 0) / searchStore.history.length
  return `${Math.round(avg)}ms`
})

const totalRows = computed(() =>
  searchStore.history.reduce((s, h) => s + h.rowCount, 0).toLocaleString()
)
</script>

<template>
  <div class="flex flex-col overflow-y-auto">
    <!-- Page header -->
    <header class="border-b border-[#334155] bg-[#0f172a]/80 px-6 py-4 backdrop-blur-sm">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-[#f1f5f9]">Dashboard</h1>
          <p class="text-sm text-[#64748b]">Overview of your QueryMind workspace</p>
        </div>
        <Button @click="router.push('/search')" aria-label="Go to search">
          <svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          New Search
        </Button>
      </div>
    </header>

    <div class="flex-1 space-y-6 p-6">
      <!-- Stats grid -->
      <section aria-label="Statistics">
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatsCard
            label="Tables"
            :value="connectionStore.tableCount || '—'"
            sublabel="in public schema"
            icon="database"
          />
          <StatsCard
            label="Queries"
            :value="searchStore.history.length"
            sublabel="this session"
            icon="search"
          />
          <StatsCard
            label="Avg Latency"
            :value="avgMs"
            sublabel="per query"
            icon="clock"
          />
          <StatsCard
            label="Total Rows"
            :value="totalRows"
            sublabel="fetched"
            icon="table"
          />
        </div>
      </section>

      <!-- Two-column layout -->
      <div class="grid gap-6 lg:grid-cols-2">
        <ConnectionStatus />
        <RecentQueries />
      </div>

      <!-- Getting started -->
      <section
        v-if="!connectionStore.isConnected"
        class="rounded-xl border border-dashed border-[#334155] p-8 text-center"
        aria-label="Getting started"
      >
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6366f1]/15">
          <svg class="h-6 w-6 text-[#6366f1]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <h2 class="mb-2 text-base font-semibold text-[#f1f5f9]">Get started</h2>
        <p class="mb-4 text-sm text-[#64748b]">
          Connect a Postgres database to start asking questions in plain English.
        </p>
        <Button @click="router.push('/settings')" aria-label="Go to settings to connect a database">
          Connect a database
        </Button>
      </section>
    </div>
  </div>
</template>
