<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import SiteSwitcher from '@/components/SiteSwitcher.vue'
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/devices'
import { useIpamStore } from '@/stores/ipam'
import { useSiteStore } from '@/stores/site'
import { useTemplateStore } from '@/stores/templates'
import { USE_MOCK } from '@/api/http'

const router = useRouter()
const auth = useAuthStore()
const siteStore = useSiteStore()
const deviceStore = useDeviceStore()
const templateStore = useTemplateStore()
const ipamStore = useIpamStore()

const drawerOpen = ref(false)

const nav = [
  { to: { name: 'dashboard' }, label: 'Overview', icon: '▤' },
  { to: { name: 'sites' }, label: 'Sites', icon: '⌂' },
  { to: { name: 'devices' }, label: 'Devices', icon: '▦' },
  { to: { name: 'templates' }, label: 'Port templates', icon: '⛭' },
  { to: { name: 'vlans' }, label: 'VLANs & subnets', icon: '⇄' },
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
  <div class="drawer lg:drawer-open bg-base-200 min-h-screen">
    <input id="bnc-drawer" v-model="drawerOpen" type="checkbox" class="drawer-toggle" />

    <div class="drawer-content flex min-h-screen flex-col">
      <header
        class="bg-base-100/80 border-base-300 sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 backdrop-blur"
      >
        <label for="bnc-drawer" class="btn btn-sm btn-ghost lg:hidden" aria-label="Open menu">
          ☰
        </label>

        <SiteSwitcher />

        <div class="ml-auto flex items-center gap-2">
          <span v-if="USE_MOCK" class="badge badge-warning badge-sm gap-1" title="Backend calls are served by the built-in mock transport">
            mock data
          </span>

          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-2">
              <div class="avatar avatar-placeholder">
                <div class="bg-primary text-primary-content w-6 rounded-full">
                  <span class="text-xs">{{ auth.displayName.charAt(0).toUpperCase() }}</span>
                </div>
              </div>
              <span class="hidden sm:inline">{{ auth.displayName }}</span>
            </div>
            <ul
              tabindex="0"
              class="dropdown-content menu bg-base-200 rounded-box border-base-300 z-30 mt-2 w-56 border p-2 shadow-lg"
            >
              <li class="menu-title">
                <span class="truncate">{{ auth.user?.email ?? auth.user?.username }}</span>
              </li>
              <li class="px-3 py-1">
                <div class="flex flex-wrap gap-1">
                  <span v-for="role in auth.roles" :key="role" class="badge badge-xs badge-ghost">
                    {{ role }}
                  </span>
                </div>
              </li>
              <li><button @click="signOut">Sign out</button></li>
            </ul>
          </div>
        </div>
      </header>

      <main class="flex-1 p-4 lg:p-8">
        <div
          v-if="siteStore.requiresSelection"
          class="alert alert-info mb-6"
        >
          <span>Select a site from the switcher above to scope devices, VLANs and ports.</span>
        </div>

        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <div class="drawer-side z-30">
      <label for="bnc-drawer" class="drawer-overlay" aria-label="Close menu" />
      <aside class="bg-base-100 border-base-300 flex min-h-full w-64 flex-col border-r">
        <RouterLink
          :to="{ name: 'dashboard' }"
          class="border-base-300 flex items-center gap-3 border-b px-5 py-4"
          @click="drawerOpen = false"
        >
          <div class="bg-primary text-primary-content grid size-9 place-items-center rounded-lg font-bold">
            B
          </div>
          <div class="leading-tight">
            <!--<p class="font-semibold">BNC</p>-->
            <p class="text-base-content/50 text-xs">Broadcast Network Controller</p>
          </div>
        </RouterLink>

        <ul class="menu w-full grow gap-1 p-3">
          <li v-for="item in nav" :key="item.label">
            <RouterLink
              :to="item.to"
              active-class="menu-active"
              class="gap-3"
              @click="drawerOpen = false"
            >
              <span class="w-4 text-center opacity-60">{{ item.icon }}</span>
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>

        <div class="border-base-300 text-base-content/50 border-t px-5 py-4 text-xs">
          <p>NetBox is the source of truth.</p>
          <p class="mt-1">
            Scope <code class="text-base-content/70">external-ctrl: bnc</code>
          </p>
          <p>
            Write <code class="text-base-content/70">bnc-state: manage</code>
          </p>
        </div>
      </aside>
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
