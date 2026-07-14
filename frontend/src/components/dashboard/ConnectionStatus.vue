<script setup lang="ts">
import { ref } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'

const store = useConnectionStore()
const showModal = ref(false)
const connStr = ref('')
const submitting = ref(false)
const localError = ref<string | null>(null)

async function handleConnect() {
  if (!connStr.value.trim()) return
  submitting.value = true
  localError.value = null
  const ok = await store.connect(connStr.value.trim())
  submitting.value = false
  if (ok) {
    showModal.value = false
    connStr.value = ''
  } else {
    localError.value = store.error
  }
}
</script>

<template>
  <article
    class="rounded-xl border border-[#334155] bg-[#1e293b] p-4"
    aria-label="Database connection status"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div
          :class="['h-2.5 w-2.5 rounded-full', store.isConnected ? 'bg-emerald-400' : 'bg-[#475569]']"
          :aria-label="store.isConnected ? 'Connected' : 'Not connected'"
          role="status"
        />
        <span class="text-sm font-medium text-[#f1f5f9]">
          {{ store.isConnected ? 'Database connected' : 'No database connected' }}
        </span>
      </div>
      <Button
        v-if="!store.isConnected"
        size="sm"
        @click="showModal = true"
        aria-haspopup="dialog"
      >
        Connect
      </Button>
      <Button
        v-else
        variant="secondary"
        size="sm"
        @click="store.disconnect()"
        aria-label="Disconnect database"
      >
        Disconnect
      </Button>
    </div>

    <div v-if="store.isConnected" class="mt-3 flex flex-wrap gap-1.5">
      <Badge variant="success">{{ store.tableCount }} tables</Badge>
      <Badge variant="muted" v-for="t in store.schema.slice(0, 5)" :key="t.name">{{ t.name }}</Badge>
      <Badge v-if="store.tableCount > 5" variant="muted">+{{ store.tableCount - 5 }} more</Badge>
    </div>

    <Dialog v-model:open="showModal" title="Connect Database">
      <div class="space-y-4">
        <div>
          <label for="conn-input" class="mb-1.5 block text-sm text-[#94a3b8]">
            Postgres Connection String
          </label>
          <Input
            id="conn-input"
            v-model="connStr"
            type="password"
            placeholder="postgresql://user:pass@host:5432/db"
            :disabled="submitting"
            aria-describedby="conn-hint"
            required
            @keydown="(e) => { if (e.key === 'Enter') handleConnect() }"
          />
          <p id="conn-hint" class="mt-1 text-xs text-[#64748b]">
            Stored in session memory only — never persisted.
          </p>
        </div>
        <p v-if="localError" class="text-sm text-red-400" role="alert">{{ localError }}</p>
        <Button
          class="w-full"
          :disabled="submitting || !connStr.trim()"
          @click="handleConnect"
          aria-busy="submitting"
        >
          <svg v-if="submitting" class="h-4 w-4 animate-spin mr-1" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          {{ submitting ? 'Connecting…' : 'Connect' }}
        </Button>
      </div>
    </Dialog>
  </article>
</template>
