import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { prefixesApi, vlanGroupsApi, vlansApi } from '@/api'
import type { Prefix, VLAN, VLANGroup, VlanProvisionRequest } from '@/types/bnc'
import { useSiteStore } from './site'

export function emptyVlanRequest(siteId: number | null): VlanProvisionRequest {
  return {
    site: siteId ?? 0,
    name: '',
    vid: 100,
    group: null,
    description: '',
    status: 'active',
    prefix: '',
    routing: {
      enabled: false,
      gateway: '',
      vrf: null,
      hsrp: { enabled: false, group: null, virtual_ip: '', priority: 100 },
    },
    dhcp: {
      enabled: false,
      relay_servers: [],
      pool_start: '',
      pool_end: '',
      lease_time: 86400,
    },
    multicast: {
      enabled: false,
      igmp_snooping: true,
      querier: true,
      igmp_version: 3,
      rendezvous_point: '',
      pim_mode: 'sparse',
      ssm_range: '232.0.0.0/8',
    },
  }
}

export const useIpamStore = defineStore('ipam', () => {
  const vlans = ref<VLAN[]>([])
  const vlanGroups = ref<VLANGroup[]>([])
  const prefixes = ref<Prefix[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const siteStore = useSiteStore()

  const visibleVlans = computed(() => {
    const siteId = siteStore.activeSiteId
    const list = siteId === null ? vlans.value : vlans.value.filter((v) => v.site?.id === siteId)
    return [...list].sort((a, b) => a.vid - b.vid)
  })

  const visibleGroups = computed(() => {
    const siteId = siteStore.activeSiteId
    if (siteId === null) return vlanGroups.value
    return vlanGroups.value.filter((g) => !g.site || g.site.id === siteId)
  })

  /** Prefix lookup keyed by VLAN id, so the VLAN table can show its subnet. */
  const prefixByVlan = computed(() => {
    const map = new Map<number, Prefix>()
    for (const prefix of prefixes.value) {
      if (prefix.vlan?.id) map.set(prefix.vlan.id, prefix)
    }
    return map
  })

  /** VLAN ids already taken at the active site, to validate new VLAN ids. */
  const usedVids = computed(() => new Set(visibleVlans.value.map((v) => v.vid)))

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [vlanResult, groupResult, prefixResult] = await Promise.all([
        vlansApi.list(),
        vlanGroupsApi.list(),
        prefixesApi.list(),
      ])
      vlans.value = vlanResult
      vlanGroups.value = groupResult
      prefixes.value = prefixResult
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load IPAM data'
    } finally {
      loading.value = false
    }
  }

  async function provisionVlan(payload: VlanProvisionRequest): Promise<VLAN> {
    const vlan = await vlansApi.provision(payload)
    await fetchAll()
    return vlan
  }

  async function deleteVlan(id: number): Promise<void> {
    await vlansApi.remove(id)
    vlans.value = vlans.value.filter((v) => v.id !== id)
    prefixes.value = prefixes.value.filter((p) => p.vlan?.id !== id)
  }

  /** Next free VLAN id at the active site, starting from `from`. */
  function suggestVid(from = 100): number {
    let candidate = from
    while (usedVids.value.has(candidate) && candidate < 4094) candidate += 1
    return candidate
  }

  return {
    vlans,
    vlanGroups,
    prefixes,
    loading,
    error,
    visibleVlans,
    visibleGroups,
    prefixByVlan,
    usedVids,
    fetchAll,
    provisionVlan,
    deleteVlan,
    suggestVid,
  }
})
