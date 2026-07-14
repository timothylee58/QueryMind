<script setup lang="ts">
defineProps<{ open: boolean; title: string }>()
defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        :aria-modal="true"
        :aria-label="title"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="$emit('update:open', false)"
        />
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 scale-95"
          leave-active-class="transition-all duration-150"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="open"
            class="relative z-10 w-full max-w-md rounded-xl border border-[#334155] bg-[#1e293b] p-6 shadow-xl"
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-base font-semibold text-[#f1f5f9]">{{ title }}</h2>
              <button
                class="rounded p-1 text-[#64748b] hover:text-[#f1f5f9] transition-colors"
                aria-label="Close dialog"
                type="button"
                @click="$emit('update:open', false)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
