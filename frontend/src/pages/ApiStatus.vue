<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import type { ApiStatus } from '@/types'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const { checkStatus } = useApi()
const status = ref<ApiStatus>({ status: 'checking' })
const history = ref<(ApiStatus & { ts: string })[]>([])
const checking = ref(false)

async function refresh() {
  checking.value = true
  status.value = { status: 'checking' }
  const result = await checkStatus()
  status.value = result
  history.value.unshift({ ...result, ts: new Date().toLocaleTimeString() })
  if (history.value.length > 10) history.value = history.value.slice(0, 10)
  checking.value = false
}

onMounted(refresh)
</script>

<template>
  <div class="flex flex-col overflow-y-auto">
    <header class="border-b border-[#334155] bg-[#0f172a]/80 px-6 py-4 backdrop-blur-sm">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold text-[#f1f5f9]">API Status</h1>
          <p class="text-sm text-[#64748b]">Backend connectivity and model availability</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          :disabled="checking"
          aria-label="Refresh API status"
          @click="refresh"
        >
          <svg :class="['mr-1.5 h-4 w-4', checking && 'animate-spin']" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </Button>
      </div>
    </header>

    <div class="flex-1 space-y-6 p-6 max-w-2xl">
      <!-- Status card -->
      <Card>
        <div class="p-5">
          <div class="flex items-center gap-4">
            <!-- Indicator -->
            <div
              :class="[
                'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full',
                status.status === 'online' ? 'bg-emerald-500/15' :
                status.status === 'offline' ? 'bg-red-500/15' : 'bg-[#334155]/50'
              ]"
              role="status"
              :aria-label="`API is ${status.status}`"
            >
              <div
                :class="[
                  'h-4 w-4 rounded-full',
                  status.status === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
                  status.status === 'offline' ? 'bg-red-400' : 'animate-pulse bg-amber-400'
                ]"
              />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="font-semibold text-[#f1f5f9]">QueryMind API</h2>
                <Badge
                  :variant="status.status === 'online' ? 'success' : status.status === 'offline' ? 'danger' : 'warning'"
                >
                  {{ status.status }}
                </Badge>
              </div>
              <p class="text-sm text-[#64748b]">
                <span v-if="status.status === 'checking'">Checking…</span>
                <span v-else-if="status.latencyMs !== undefined">
                  Latency: <strong class="text-[#f1f5f9]">{{ status.latencyMs }}ms</strong>
                </span>
                <span v-if="status.checkedAt" class="ml-2">· {{ new Date(status.checkedAt).toLocaleTimeString() }}</span>
              </p>
            </div>
          </div>

          <!-- Models list -->
          <div v-if="status.models?.length" class="mt-4 border-t border-[#334155] pt-4">
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-[#64748b]">Available Models</p>
            <div class="flex flex-wrap gap-1.5" role="list" aria-label="Available AI models">
              <Badge v-for="m in status.models" :key="m" variant="default" role="listitem">{{ m }}</Badge>
            </div>
          </div>

          <!-- Skeleton while checking -->
          <div v-if="status.status === 'checking'" class="mt-4 space-y-2">
            <Skeleton class="h-4 w-48" />
            <Skeleton class="h-4 w-32" />
          </div>
        </div>
      </Card>

      <!-- Ping history -->
      <section aria-label="Status check history">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-[#64748b]">Check History</h2>
        <div class="space-y-1.5">
          <div
            v-for="(h, i) in history"
            :key="i"
            class="flex items-center gap-3 rounded-lg border border-[#334155]/60 bg-[#1e293b]/60 px-3 py-2 text-sm"
          >
            <div
              :class="['h-2 w-2 flex-shrink-0 rounded-full', h.status === 'online' ? 'bg-emerald-400' : 'bg-red-400']"
              :aria-label="h.status"
            />
            <span class="font-mono text-xs text-[#94a3b8]">{{ h.ts }}</span>
            <Badge :variant="h.status === 'online' ? 'success' : 'danger'" class="ml-auto">
              {{ h.status === 'online' ? `${h.latencyMs}ms` : 'offline' }}
            </Badge>
          </div>
          <p v-if="history.length === 0" class="py-2 text-sm text-[#475569]">No checks yet.</p>
        </div>
      </section>
    </div>
  </div>
</template>
