<script setup lang="ts">
import { onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import AppLayout from '@/components/layout/AppLayout.vue'

const sessionStore = useSessionStore()
onMounted(() => sessionStore.fetchSession())
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>
