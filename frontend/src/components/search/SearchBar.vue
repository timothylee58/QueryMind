<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/ui/Button.vue'

const props = defineProps<{
  loading?: boolean
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{ submit: [question: string] }>()
const query = ref('')

function handleSubmit() {
  const q = query.value.trim()
  if (!q || props.loading) return
  emit('submit', q)
}
</script>

<template>
  <form
    class="flex items-center gap-2"
    role="search"
    aria-label="Natural language database search"
    @submit.prevent="handleSubmit"
  >
    <div class="relative flex-1">
      <svg
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        v-model="query"
        type="search"
        class="h-10 w-full rounded-lg border border-[#334155] bg-[#1e293b] pl-10 pr-4 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 disabled:opacity-50"
        :placeholder="placeholder ?? 'Ask a question about your data…'"
        :disabled="disabled || loading"
        aria-label="Search query"
        aria-describedby="search-hint"
        autocomplete="off"
        @keydown.enter.prevent="handleSubmit"
      />
    </div>
    <Button type="submit" :disabled="!query.trim() || loading || disabled" aria-label="Run search">
      <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span v-else>Run</span>
    </Button>
  </form>
  <p id="search-hint" class="mt-1.5 text-xs text-[#64748b]">
    Ask in plain English — e.g. "Show me the top 10 customers by revenue"
  </p>
</template>
