import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/pages/Dashboard.vue'
import Search from '@/pages/Search.vue'
import Settings from '@/pages/Settings.vue'
import ApiStatus from '@/pages/ApiStatus.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard,
      meta: { title: 'Dashboard', icon: 'LayoutDashboard' },
    },
    {
      path: '/search',
      name: 'search',
      component: Search,
      meta: { title: 'Search', icon: 'Search' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings,
      meta: { title: 'Settings', icon: 'Settings' },
    },
    {
      path: '/status',
      name: 'status',
      component: ApiStatus,
      meta: { title: 'API Status', icon: 'Activity' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — QueryMind` : 'QueryMind'
})

export default router
