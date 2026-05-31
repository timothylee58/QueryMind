<script setup lang="ts">
import { ref } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'

const store = useConnectionStore()
const connStr = ref('')
const submitting = ref(false)
const localError = ref<string | null>(null)
const success = ref(false)

async function handleConnect() {
  if (!connStr.value.trim()) return
  submitting.value = true
  localError.value = null
  success.value = false
  const ok = await store.connect(connStr.value.trim())
  submitting.value = false
  if (ok) {
    success.value = true
    connStr.value = ''
  } else {
    localError.value = store.error
  }
}

const apiBase = ref(import.meta.env.VITE_API_BASE ?? 'http://localhost:3000')
</script>

<template>
  <div class="flex flex-col overflow-y-auto">
    <header class="border-b border-[#334155] bg-[#0f172a]/80 px-6 py-4 backdrop-blur-sm">
      <h1 class="text-lg font-bold text-[#f1f5f9]">Settings</h1>
      <p class="text-sm text-[#64748b]">Configure database and API connections</p>
    </header>

    <div class="flex-1 space-y-6 p-6 max-w-2xl">
      <!-- Database connection -->
      <Card>
        <div class="p-5">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="font-semibold text-[#f1f5f9]">Database Connection</h2>
              <p class="text-sm text-[#64748b]">Stored in session memory only — never written to disk.</p>
            </div>
            <Badge :variant="store.isConnected ? 'success' : 'muted'">
              {{ store.isConnected ? 'Connected' : 'Not connected' }}
            </Badge>
          </div>

          <!-- Connected state -->
          <div v-if="store.isConnected" class="space-y-3">
            <div class="rounded-lg bg-[#0f172a] p-3">
              <p class="text-xs text-[#64748b] mb-1">Schema</p>
              <ul class="space-y-0.5" aria-label="Connected database tables">
                <li
                  v-for="t in store.schema"
                  :key="t.name"
                  class="flex items-center gap-2 text-xs text-[#94a3b8]"
                >
                  <span class="h-1 w-1 rounded-full bg-[#6366f1]" aria-hidden="true"/>
                  <span class="font-mono">{{ t.name }}</span>
                  <span class="text-[#475569]">({{ t.columns.length }} cols)</span>
                </li>
              </ul>
            </div>
            <Button
              variant="destructive"
              size="sm"
              aria-label="Disconnect database"
              @click="store.disconnect()"
            >
              Disconnect
            </Button>
          </div>

          <!-- Connect form -->
          <div v-else class="space-y-3">
            <div>
              <label for="settings-conn" class="mb-1.5 block text-sm text-[#94a3b8]">
                Connection String
              </label>
              <Input
                id="settings-conn"
                v-model="connStr"
                type="password"
                placeholder="postgresql://user:pass@host:5432/database"
                :disabled="submitting"
                aria-describedby="settings-conn-hint"
                required
                @keydown="(e) => { if (e.key === 'Enter') handleConnect() }"
              />
              <p id="settings-conn-hint" class="mt-1 text-xs text-[#64748b]">
                Supports any Postgres-compatible connection string.
              </p>
            </div>
            <p v-if="localError" class="text-sm text-red-400" role="alert">{{ localError }}</p>
            <p v-if="success" class="text-sm text-emerald-400" role="status">Connected successfully!</p>
            <Button
              :disabled="submitting || !connStr.trim()"
              @click="handleConnect"
            >
              <svg v-if="submitting" class="mr-1.5 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {{ submitting ? 'Connecting…' : 'Connect' }}
            </Button>
          </div>
        </div>
      </Card>

      <!-- API configuration -->
      <Card>
        <div class="p-5">
          <h2 class="mb-1 font-semibold text-[#f1f5f9]">API Configuration</h2>
          <p class="mb-4 text-sm text-[#64748b]">Backend API base URL. Set via <code class="rounded bg-[#0f172a] px-1 text-xs text-[#818cf8]">VITE_API_BASE</code> env variable.</p>
          <div>
            <label for="api-base" class="mb-1.5 block text-sm text-[#94a3b8]">API Base URL</label>
            <Input
              id="api-base"
              v-model="apiBase"
              type="url"
              placeholder="http://localhost:3000"
              aria-describedby="api-base-hint"
            />
            <p id="api-base-hint" class="mt-1 text-xs text-[#64748b]">Changes take effect on the next request.</p>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
