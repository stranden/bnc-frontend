<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import SiteSwitcher from '@/components/SiteSwitcher.vue'
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/devices'
import { useIpamStore } from '@/stores/ipam'
import { useSiteStore } from '@/stores/site'
import { useTemplateStore } from '@/stores/templates'
import { useUiStore } from '@/stores/ui'
import { USE_MOCK } from '@/api/http'

const router = useRouter()
const auth = useAuthStore()
const siteStore = useSiteStore()
const deviceStore = useDeviceStore()
const templateStore = useTemplateStore()
const ipamStore = useIpamStore()
const uiStore = useUiStore()

const drawerOpen = storeToRefs(uiStore).drawerOpen

const nav = [
  /*{
    href: { name: 'dashboard' },
    label: 'Overview',
    icon: `<rect x="3" y="3" width="7" height="7" rx="1" />
           <rect x="14" y="3" width="7" height="7" rx="1" />
           <rect x="14" y="14" width="7" height="7" rx="1" />
           <rect x="3" y="14" width="7" height="7" rx="1" />`,
  },*/
  {
    href: { name: 'sites' },
    label: 'Sites',
    icon: `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
           <polyline points="9 22 9 12 15 12 15 22" />`,
  },
  {
    href: { name: 'devices' },
    label: 'Devices',
    icon: `<rect width="20" height="8" x="2" y="2" rx="2" />
           <rect width="20" height="8" x="2" y="14" rx="2" />
           <line x1="6" x2="6.01" y1="6" y2="6" />
           <line x1="6" x2="6.01" y1="18" y2="18" />`,
  },
  {
    href: { name: 'templates' },
    label: 'Port templates',
    icon: `<line x1="21" x2="14" y1="4" y2="4" />
           <line x1="10" x2="3" y1="4" y2="4" />
           <line x1="21" x2="12" y1="12" y2="12" />
           <line x1="8" x2="3" y1="12" y2="12" />
           <line x1="21" x2="16" y1="20" y2="20" />
           <line x1="12" x2="3" y1="20" y2="20" />
           <line x1="14" x2="14" y1="2" y2="6" />
           <line x1="8" x2="8" y1="10" y2="14" />
           <line x1="16" x2="16" y1="18" y2="22" />`,
  },
  {
    href: { name: 'vlans' },
    label: 'VLANs & subnets',
    icon: `<rect x="16" y="16" width="6" height="6" rx="1" />
           <rect x="2" y="16" width="6" height="6" rx="1" />
           <rect x="9" y="2" width="6" height="6" rx="1" />
           <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
           <path d="M12 12V8" />`,
  },
]

onMounted(async () => {
  await siteStore.fetchSites()
  await Promise.all([
    deviceStore.fetchDevices(),
    deviceStore.fetchDeviceTypes(),
    templateStore.fetchTemplates(),
    ipamStore.fetchAll(),
  ])
})

async function signOut() {
  await auth.logout()
  siteStore.reset()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="drawer lg:drawer-open">
    <input
      id="menu-drawer"
      type="checkbox"
      class="drawer-toggle inline"
      v-model="drawerOpen"
    />

    <!-- ============================================ -->
    <!-- Main Content -->
    <!-- ============================================ -->
    <div class="drawer-content flex min-h-screen flex-col">

      <!-- Top Navbar -->
      <header
        class="navbar sticky top-0 z-30 h-16 min-h-16
               border-b border-base-300
               bg-base-100/80 backdrop-blur"
      >
        <!-- Left side -->
        <div class="flex items-center">
          <!-- Mobile menu button -->
          <label
            for="menu-drawer"
            class="btn btn-square btn-ghost lg:hidden"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-5"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </label>

          <!-- SiteSwitcher can go here -->
          <SiteSwitcher />
        </div>

        <!-- Right side -->
        <div class="ml-auto flex items-center gap-2">

          <!-- Mock badge -->
          <span
            v-if="USE_MOCK"
            class="badge badge-warning badge-sm gap-1"
            title="Backend calls are served by the built-in mock transport"
          >
            mock data
          </span>

          <!-- User menu -->
          <div class="dropdown dropdown-end">
            <div
              tabindex="0"
              role="button"
              class="btn btn-sm btn-ghost gap-2"
            >
              <div class="avatar avatar-placeholder">
                <div
                  class="w-6 rounded-full
                         bg-primary text-primary-content"
                >
                  <span class="text-xs">
                    {{ auth.displayName.charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>

              <span class="hidden sm:inline">
                {{ auth.displayName }}
              </span>
            </div>

            <ul
              tabindex="0"
              class="dropdown-content menu z-30 mt-2 w-56
                     rounded-box border border-base-300
                     bg-base-200 p-2 shadow-lg"
            >
              <!-- User information -->
              <li class="menu-title">
                <span class="truncate">
                  {{ auth.user?.email ?? auth.user?.username }}
                </span>
              </li>

              <!-- Roles -->
              <li class="px-3 py-1">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="role in auth.roles"
                    :key="role"
                    class="badge badge-xs badge-ghost"
                  >
                    {{ role }}
                  </span>
                </div>
              </li>

              <!-- Logout -->
              <li>
                <button @click="signOut">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="size-4"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>

                  Sign out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 p-4 lg:p-8">

        <div
          v-if="siteStore.requiresSelection"
          class="alert alert-info mb-6"
        >
          <span>
            Select a site from the switcher above to scope devices, VLANs
            and ports.
          </span>
        </div>

        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>

      </main>
    </div>

    <!-- ============================================ -->
    <!-- Sidebar -->
    <!-- ============================================ -->
    <div class="drawer-side">
      <label
        for="menu-drawer"
        aria-label="close sidebar"
        class="drawer-overlay"
      ></label>

      <div
        class="flex min-h-full flex-col
               bg-base-200
               lg:w-64
               lg:is-drawer-close:w-14"
      >

        <!-- ======================================== -->
        <!-- BNC Branding -->
        <!-- ======================================== -->
        <div
          class="flex h-16 min-h-16 items-center
                 border-b border-base-300 p-3"
        >
          <RouterLink
            :to="{ name: 'dashboard' }"
            class="border-base-300 flex items-center"
          >
            <!-- B logo -->
            <div
              class="grid size-9 shrink-0 place-items-center
                    rounded-lg bg-primary
                    text-lg font-bold
                    text-primary-content shadow-sm"
            >
              B
            </div>
            <!-- Application name -->
            <div
              class="ml-3 min-w-0 leading-tight
                    lg:is-drawer-close:hidden"
            >
              <div class="font-bold tracking-tight">
                BNC
              </div>

              <div class="truncate text-xs text-base-content/50">
                Broadcast Network Controller
              </div>
            </div>
          </RouterLink>
        </div>

        <!-- ======================================== -->
        <!-- Navigation -->
        <!-- ======================================== -->
        <ul class="menu w-full grow">
          <li v-for="item in nav" :key="item.label">
            <RouterLink :to="item.href" custom v-slot="{ navigate, isActive }">
              <button
                @click="navigate"
                :class="{ 'menu-active': isActive }"
                class="lg:is-drawer-close:tooltip lg:is-drawer-close:tooltip-right"
                :data-tip="item.label"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="my-1.5 size-4 opacity-60"
                  v-html="item.icon">
                </svg>
                <span class="lg:is-drawer-close:hidden">{{ item.label }}</span>
              </button>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
