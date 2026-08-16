<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useDeviceStore } from '@/stores/devices'
import { useSiteStore } from '@/stores/site'
import { templateBadgeClass, useTemplateStore } from '@/stores/templates'

const siteStore = useSiteStore()
const deviceStore = useDeviceStore()
const templateStore = useTemplateStore()

const recentDevices = computed(() => deviceStore.visibleDevices.slice(0, 6))

/** VLAN count comes straight from the site(s) — no need to fetch every VLAN. */
const vlanCount = computed(() =>
  siteStore.activeSite
    ? siteStore.activeSite.vlan_count
    : siteStore.sites.reduce((sum, site) => sum + site.vlan_count, 0),
)

const cards = computed(() => [
  {
    label: 'Sites',
    value: siteStore.sites.length,
    hint: siteStore.isSingleSite ? 'single-site deployment' : 'BNC-tagged in NetBox',
    to: { name: 'sites' } as const,
  },
  {
    label: 'Devices',
    value: deviceStore.stats.total,
    hint: `${deviceStore.stats.manageable} manageable`,
    to: { name: 'devices' } as const,
  },
  {
    label: 'Templates',
    value: templateStore.templates.length,
    hint: 'network traffic classes',
    to: { name: 'templates' } as const,
  },
  {
    label: 'VLANs',
    value: vlanCount.value,
    hint: siteStore.activeSite ? `at ${siteStore.activeSite.name}` : 'select a site',
    to: { name: 'vlans' } as const,
  },
])
</script>

<template>
  <div>
    <PageHeader
      title="Overview"
      :description="
        siteStore.activeSite
          ? `Showing ${siteStore.activeSite.name}. NetBox remains the source of truth for every object below.`
          : 'Showing all BNC-tagged objects across every site.'
      "
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <RouterLink
        v-for="card in cards"
        :key="card.label"
        :to="card.to"
        class="card bg-base-100 border-base-300 hover:border-primary border transition-colors"
      >
        <div class="card-body gap-1 p-5">
          <p class="text-base-content/60 text-sm">{{ card.label }}</p>
          <p class="text-3xl font-semibold tabular-nums">{{ card.value }}</p>
          <p class="text-base-content/40 text-xs">{{ card.hint }}</p>
        </div>
      </RouterLink>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <section class="card bg-base-100 border-base-300 border lg:col-span-2">
        <div class="card-body p-0">
          <div class="border-base-300 flex items-center justify-between border-b px-5 py-4">
            <h2 class="font-semibold">Devices</h2>
            <RouterLink :to="{ name: 'devices' }" class="btn btn-xs btn-ghost">View all</RouterLink>
          </div>

          <div v-if="deviceStore.loading" class="p-5">
            <span class="loading loading-spinner loading-md" />
          </div>

          <div v-else-if="!recentDevices.length" class="text-base-content/50 p-5 text-sm">
            No devices tagged <code>external-ctrl: bnc</code> at this site.
          </div>

          <table v-else class="table-zebra table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Managed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="device in recentDevices" :key="device.id">
                <td class="font-medium">{{ device.name }}</td>
                <td class="text-base-content/60 text-sm">{{ device.device_type?.display ?? device.device_type?.name }}</td>
                <td><StatusBadge :status="device.status" /></td>
                <td>
                  <span
                    class="badge badge-xs"
                    :class="device.manageable ? 'badge-success' : 'badge-ghost'"
                  >
                    {{ device.manageable ? 'manage' : 'read-only' }}
                  </span>
                </td>
                <td class="text-right">
                  <RouterLink
                    :to="{ name: 'device-ports', params: { id: device.id } }"
                    class="btn btn-xs btn-ghost"
                  >
                    Ports
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card bg-base-100 border-base-300 border">
        <div class="card-body p-0">
          <div class="border-base-300 flex items-center justify-between border-b px-5 py-4">
            <h2 class="font-semibold">Templates</h2>
            <RouterLink :to="{ name: 'templates' }" class="btn btn-xs btn-ghost">View all</RouterLink>
          </div>
          <ul class="divide-base-300 divide-y">
            <li
              v-for="template in templateStore.templates.slice(0, 6)"
              :key="template.slug"
              class="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ template.name }}</p>
                <p class="text-base-content/50 truncate text-xs">{{ template.description }}</p>
              </div>
              <span class="badge badge-sm" :class="templateBadgeClass(template.slug)">
                {{ template.slug }}
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>
