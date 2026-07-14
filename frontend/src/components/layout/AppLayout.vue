<script setup lang="ts">
import Sidebar from './Sidebar.vue'
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[#0f172a]">
    <Sidebar />
    <main class="flex flex-1 flex-col overflow-hidden" id="main-content">
      <slot />
    </main>
  </div>
</template>
