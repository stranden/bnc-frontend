import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { vlansApi } from '@/api'
import type { Vlan, VlanCreate, VlanUpdate } from '@/types/bnc'
import { useSiteStore } from './site'

export function emptyVlanDraft(siteId: number | null): VlanCreate {
  return {
    site_id: siteId ?? 0,
    vid: 100,
    name: '',
    description: '',
    template: null,
  }
}

/**
 * VLANs, scoped to the active site (the backend requires `site_id` on every
 * VLAN request — there is no cross-site listing).
 */
export const useIpamStore = defineStore('ipam', () => {
  const vlans = ref<Vlan[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const siteStore = useSiteStore()

  const visibleVlans = computed(() => [...vlans.value].sort((a, b) => a.vid - b.vid))

  /** VLAN ids already taken at the active site, to validate new VLAN ids. */
  const usedVids = computed(() => new Set(visibleVlans.value.map((v) => v.vid)))

  async function fetchAll(): Promise<void> {
    const siteId = siteStore.activeSiteId
    if (siteId === null) {
      vlans.value = []
      return
    }

    loading.value = true
    error.value = null
    try {
      vlans.value = await vlansApi.list(siteId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load VLANs'
    } finally {
      loading.value = false
    }
  }

  // Reload whenever the active site changes.
  watch(() => siteStore.activeSiteId, fetchAll)

  async function createVlan(payload: VlanCreate): Promise<Vlan> {
    const vlan = await vlansApi.create(payload)
    await fetchAll()
    return vlan
  }

  async function updateVlan(vid: number, payload: VlanUpdate): Promise<Vlan> {
    const vlan = await vlansApi.update(vid, payload)
    await fetchAll()
    return vlan
  }

  async function deleteVlan(vid: number, siteId: number): Promise<void> {
    await vlansApi.remove(vid, siteId)
    vlans.value = vlans.value.filter((v) => v.vid !== vid)
  }

  /** Next free VLAN id at the active site, starting from `from`. */
  function suggestVid(from = 100): number {
    let candidate = from
    while (usedVids.value.has(candidate) && candidate < 4094) candidate += 1
    return candidate
  }

  return {
    vlans,
    loading,
    error,
    visibleVlans,
    usedVids,
    fetchAll,
    createVlan,
    updateVlan,
    deleteVlan,
    suggestVid,
  }
})
