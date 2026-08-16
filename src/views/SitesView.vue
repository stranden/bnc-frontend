<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useDeviceStore } from '@/stores/devices'
import { useIpamStore } from '@/stores/ipam'
import { useSiteStore } from '@/stores/site'
import { useToastStore } from '@/stores/toast'

const siteStore = useSiteStore()
const deviceStore = useDeviceStore()
const ipamStore = useIpamStore()
const toasts = useToastStore()

const deviceCountBySite = computed(() => {
  const counts = new Map<number, number>()
  for (const device of deviceStore.devices) {
    if (!device.site) continue
    counts.set(device.site.id, (counts.get(device.site.id) ?? 0) + 1)
  }
  return counts
})

async function activate(id: number) {
  siteStore.setActiveSite(id)
  await Promise.all([deviceStore.fetchDevices(), ipamStore.fetchAll()])
  toasts.success(`Active site set to ${siteStore.activeSite?.name ?? id}`)
}

async function refresh() {
  await siteStore.fetchSites(true)
}
</script>

<template>
  <div>
    <PageHeader
      title="Sites"
      description="Sites carrying the external-ctrl: bnc tag in NetBox. Selecting one scopes the rest of the UI."
    >
      <template #actions>
        <button class="btn btn-sm btn-outline" :disabled="siteStore.loading" @click="refresh">
          <span v-if="siteStore.loading" class="loading loading-spinner loading-xs" />
          Refresh
        </button>
      </template>
    </PageHeader>

    <div v-if="siteStore.error" class="alert alert-error mb-4">
      <span>{{ siteStore.error }}</span>
    </div>

    <div
      v-if="siteStore.isSingleSite"
      class="alert alert-info mb-4"
    >
      <span>
        Only one site is exposed by the backend, so it has been selected automatically and is
        remembered for future visits.
      </span>
    </div>

    <div v-if="siteStore.loading && !siteStore.sites.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="n in 3" :key="n" class="card bg-base-100 border-base-300 border">
        <div class="card-body gap-3">
          <div class="skeleton h-5 w-2/3" />
          <div class="skeleton h-4 w-1/3" />
          <div class="skeleton h-8 w-full" />
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="!siteStore.sites.length"
      icon="⌂"
      title="No BNC-tagged sites"
      description="Tag at least one site in NetBox with external-ctrl: bnc for it to appear here."
    />

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="site in siteStore.sites"
        :key="site.id"
        class="card bg-base-100 border transition-colors"
        :class="site.id === siteStore.activeSiteId ? 'border-primary' : 'border-base-300'"
      >
        <div class="card-body gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate font-semibold">{{ site.name }}</h2>
              <p v-if="site.site_group" class="text-base-content/50 font-net truncate text-xs">
                {{ site.site_group }}
              </p>
            </div>
          </div>

          <p v-if="site.description" class="text-base-content/60 line-clamp-2 text-sm">
            {{ site.description }}
          </p>

          <div class="text-base-content/60 flex flex-wrap gap-4 text-sm">
            <span v-if="site.tenant">◈ {{ site.tenant }}</span>
            <span>▦ {{ deviceCountBySite.get(site.id) ?? site.device_count }} devices</span>
            <span>⇄ {{ site.vlan_count }} VLANs</span>
          </div>

          <div class="card-actions justify-end">
            <span v-if="site.id === siteStore.activeSiteId" class="badge badge-primary badge-soft">
              Active site
            </span>
            <button v-else class="btn btn-sm btn-primary" @click="activate(site.id)">
              Set active
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
