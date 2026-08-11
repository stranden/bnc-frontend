<script setup lang="ts">
/**
 * Site switcher shown in the top bar.
 *
 * When the backend returns a single site there is nothing to switch between,
 * so it renders as a static label instead of a dropdown.
 */
import { useSiteStore } from '@/stores/site'
import { useDeviceStore } from '@/stores/devices'
import { useIpamStore } from '@/stores/ipam'

const siteStore = useSiteStore()
const deviceStore = useDeviceStore()
const ipamStore = useIpamStore()

async function selectSite(id: number) {
  if (id === siteStore.activeSiteId) return
  siteStore.setActiveSite(id)
  // Site-scoped data must be refetched so the UI never shows another site's kit.
  await Promise.all([deviceStore.fetchDevices(), ipamStore.fetchAll()])
}
</script>

<template>
  <div v-if="siteStore.isSingleSite" class="flex items-center gap-2 text-sm">
    <span class="text-base-content/50">Site</span>
    <span class="font-medium">{{ siteStore.activeSite?.name }}</span>
    <span class="badge badge-xs badge-ghost">default</span>
  </div>

  <div v-else class="dropdown dropdown-end">
    <div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-2">
      <span class="text-base-content/50">Site</span>
      <span class="font-medium">
        {{ siteStore.activeSite?.name ?? 'Select a site' }}
      </span>
      <span class="text-xs opacity-60">▾</span>
    </div>
    <ul
      tabindex="0"
      class="dropdown-content menu bg-base-200 rounded-box border-base-300 z-30 mt-2 w-72 border p-2 shadow-lg"
    >
      <li class="menu-title">Available sites</li>
      <li v-for="site in siteStore.sites" :key="site.id">
        <button
          class="flex items-start justify-between gap-2"
          :class="{ 'menu-active': site.id === siteStore.activeSiteId }"
          @click="selectSite(site.id)"
        >
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ site.name }}</span>
            <span class="text-base-content/50 block truncate text-xs">
              {{ site.region?.name ?? site.slug }}
            </span>
          </span>
          <span v-if="site.id === siteStore.activeSiteId" class="text-primary">✓</span>
        </button>
      </li>
      <li v-if="!siteStore.sites.length" class="disabled">
        <span class="text-base-content/50 text-sm">No BNC-tagged sites found</span>
      </li>
    </ul>
  </div>
</template>
