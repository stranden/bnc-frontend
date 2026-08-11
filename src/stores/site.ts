/**
 * Site store.
 *
 * Sites come from NetBox (scoped to the `external-ctrl: bnc` tag). When the
 * backend returns exactly one site there is nothing to choose, so it becomes
 * the active site automatically. The selection is persisted so it survives
 * reloads.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { sitesApi } from '@/api'
import { ApiError } from '@/api/http'
import type { Site } from '@/types/bnc'

const SITE_KEY = 'bnc.site.id'
/** Mirrored into a cookie so a future SSR/proxy layer can read the selection. */
const SITE_COOKIE = 'bnc_site'

function readStoredSiteId(): number | null {
  const stored = localStorage.getItem(SITE_KEY)
  if (stored) {
    const parsed = Number(stored)
    if (Number.isFinite(parsed)) return parsed
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${SITE_COOKIE}=([^;]*)`))
  if (match) {
    const parsed = Number(decodeURIComponent(match[1]))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function writeStoredSiteId(id: number | null): void {
  if (id === null) {
    localStorage.removeItem(SITE_KEY)
    document.cookie = `${SITE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    return
  }
  localStorage.setItem(SITE_KEY, String(id))
  // One year, matching how long a fixed installation realistically stays put.
  document.cookie = `${SITE_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

export const useSiteStore = defineStore('site', () => {
  const sites = ref<Site[]>([])
  const activeSiteId = ref<number | null>(readStoredSiteId())
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  const activeSite = computed(
    () => sites.value.find((s) => s.id === activeSiteId.value) ?? null,
  )
  const isSingleSite = computed(() => sites.value.length === 1)
  const requiresSelection = computed(
    () => loaded.value && sites.value.length > 1 && activeSite.value === null,
  )

  function setActiveSite(id: number | null): void {
    activeSiteId.value = id
    writeStoredSiteId(id)
  }

  async function fetchSites(force = false): Promise<Site[]> {
    if (loaded.value && !force) return sites.value

    loading.value = true
    error.value = null
    try {
      const result = await sitesApi.list()
      sites.value = result
      loaded.value = true

      // A single site needs no picker — select it and move on.
      if (result.length === 1) {
        setActiveSite(result[0].id)
      } else if (activeSiteId.value !== null && !result.some((s) => s.id === activeSiteId.value)) {
        // The persisted site vanished from NetBox (untagged or deleted).
        setActiveSite(null)
      }

      return result
    } catch (err) {
      error.value =
        err instanceof ApiError
          ? `Could not load sites: ${err.message}`
          : 'Could not load sites from the BNC backend.'
      return []
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    sites.value = []
    loaded.value = false
    error.value = null
    setActiveSite(null)
  }

  return {
    sites,
    activeSiteId,
    activeSite,
    isSingleSite,
    requiresSelection,
    loading,
    loaded,
    error,
    fetchSites,
    setActiveSite,
    reset,
  }
})
