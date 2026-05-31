import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: string
  email: string
  name?: string
}

export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const displayName = computed(() => user.value?.name ?? user.value?.email ?? 'Guest')

  async function fetchSession() {
    loading.value = true
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const data = await res.json()
        user.value = data?.user ?? null
      }
    } finally {
      loading.value = false
    }
  }

  function setUser(u: User | null) {
    user.value = u
  }

  return { user, loading, isAuthenticated, displayName, fetchSession, setUser }
})
