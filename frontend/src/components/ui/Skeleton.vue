<script setup lang="ts">
defineProps<{ class?: string }>()
</script>

<template>
  <div
    :class="['animate-pulse rounded-md bg-[#334155]/60', $props.class]"
    aria-hidden="true"
  />
</template>
