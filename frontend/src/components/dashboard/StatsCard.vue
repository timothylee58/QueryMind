<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  sublabel?: string
  icon: 'database' | 'search' | 'clock' | 'table'
  trend?: 'up' | 'down' | 'neutral'
}>()
</script>

<template>
  <article
    class="rounded-xl border border-[#334155] bg-[#1e293b] p-4"
    :aria-label="label"
  >
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-[#64748b]">{{ label }}</p>
        <p class="mt-1.5 text-2xl font-bold text-[#f1f5f9]">{{ value }}</p>
        <p v-if="sublabel" class="mt-0.5 text-xs text-[#64748b]">{{ sublabel }}</p>
      </div>
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366f1]/15">
        <!-- database -->
        <svg v-if="icon === 'database'" class="h-4 w-4 text-[#818cf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" stroke-width="2"/>
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" stroke-width="2"/>
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke="currentColor" stroke-width="2"/>
        </svg>
        <!-- search -->
        <svg v-else-if="icon === 'search'" class="h-4 w-4 text-[#818cf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <!-- clock -->
        <svg v-else-if="icon === 'clock'" class="h-4 w-4 text-[#818cf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2"/>
        </svg>
        <!-- table -->
        <svg v-else-if="icon === 'table'" class="h-4 w-4 text-[#818cf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
          <path stroke-linecap="round" stroke-width="2" d="M3 9h18M9 9v12"/>
        </svg>
      </div>
    </div>
  </article>
</template>
