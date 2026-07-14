<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useConnectionStore } from '@/stores/connection'
import Badge from '@/components/ui/Badge.vue'

const route = useRoute()
const connectionStore = useConnectionStore()
const collapsed = ref(false)

const navItems = [
  { name: 'Dashboard', path: '/', icon: 'dashboard' },
  { name: 'Search', path: '/search', icon: 'search' },
  { name: 'API Status', path: '/status', icon: 'activity' },
  { name: 'Settings', path: '/settings', icon: 'settings' },
]

function isActive(path: string) {
  return route.path === path
}

const sidebarWidth = computed(() => collapsed.value ? 'w-16' : 'w-56')
</script>

<template>
  <nav
    :class="['flex flex-col border-r border-[#334155] bg-[#0f172a] transition-all duration-200', sidebarWidth]"
    aria-label="Main navigation"
  >
    <!-- Logo -->
    <div class="flex h-14 items-center gap-2 border-b border-[#334155] px-4">
      <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#6366f1]">
        <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 7h16M9 4v3M15 4v3" />
        </svg>
      </div>
      <span v-if="!collapsed" class="font-semibold text-[#f1f5f9]">QueryMind</span>
      <button
        class="ml-auto rounded p-1 text-[#64748b] hover:text-[#f1f5f9] transition-colors"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        type="button"
        @click="collapsed = !collapsed"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <!-- Nav links -->
    <ul class="flex-1 space-y-0.5 p-2" role="list">
      <li v-for="item in navItems" :key="item.path">
        <router-link
          :to="item.path"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          :class="[
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive(item.path)
              ? 'bg-[#6366f1]/15 text-[#818cf8]'
              : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f1f5f9]',
          ]"
        >
          <!-- dashboard icon -->
          <svg v-if="item.icon === 'dashboard'" class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
          <!-- search icon -->
          <svg v-else-if="item.icon === 'search'" class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <!-- activity icon -->
          <svg v-else-if="item.icon === 'activity'" class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <!-- settings icon -->
          <svg v-else-if="item.icon === 'settings'" class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span v-if="!collapsed">{{ item.name }}</span>
        </router-link>
      </li>
    </ul>

    <!-- Connection status -->
    <div v-if="!collapsed" class="border-t border-[#334155] p-3">
      <Badge :variant="connectionStore.isConnected ? 'success' : 'muted'" class="w-full justify-center">
        <span class="h-1.5 w-1.5 rounded-full" :class="connectionStore.isConnected ? 'bg-emerald-400' : 'bg-[#64748b]'" aria-hidden="true" />
        {{ connectionStore.isConnected ? 'DB Connected' : 'No DB' }}
      </Badge>
    </div>
  </nav>
</template>
