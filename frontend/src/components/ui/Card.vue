<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <div
    :class="['rounded-xl border border-[#334155] bg-[#1e293b] shadow-sm', $props.class]"
    role="region"
  >
    <slot />
  </div>
</template>
