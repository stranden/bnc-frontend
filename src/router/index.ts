import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSiteStore } from '@/stores/site'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, layout: 'blank', title: 'Sign in' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Overview' },
      },
      {
        path: 'sites',
        name: 'sites',
        component: () => import('@/views/SitesView.vue'),
        meta: { title: 'Sites' },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@/views/DevicesView.vue'),
        meta: { title: 'Devices' },
      },
      {
        path: 'devices/:id(\\d+)/ports',
        name: 'device-ports',
        component: () => import('@/views/DevicePortsView.vue'),
        meta: { title: 'Switch ports' },
      },
      {
        path: 'templates',
        name: 'templates',
        component: () => import('@/views/TemplatesView.vue'),
        meta: { title: 'Port templates' },
      },
      {
        path: 'vlans',
        name: 'vlans',
        component: () => import('@/views/VlansView.vue'),
        meta: { title: 'VLANs & subnets' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Not found' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  // Sites drive nearly every other view, so make sure they are loaded (and a
  // single site auto-selected) before any authenticated view renders.
  if (!to.meta.public && auth.isAuthenticated) {
    const siteStore = useSiteStore()
    if (!siteStore.loaded) await siteStore.fetchSites()
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · BNC` : 'Broadcast Network Controller'
})

export default router
