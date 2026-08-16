import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { templatesApi } from '@/api'
import type { NetworkTemplate } from '@/types/bnc'

/** Presentation metadata per known template slug, used for badges. */
export const TEMPLATE_BADGE: Record<string, string> = {
  aes67: 'badge-secondary',
  dante: 'badge-accent',
  data: 'badge-neutral',
  'smpte-2110': 'badge-primary',
}

export function templateBadgeClass(slug: string | null | undefined): string {
  if (!slug) return 'badge-ghost'
  return TEMPLATE_BADGE[slug] ?? 'badge-ghost'
}

/**
 * Network templates (broadcast traffic classes such as AES67, Dante, Data
 * and SMPTE 2110). These are owned and maintained by the backend — the UI
 * only reads them, it cannot create, edit or delete them.
 */
export const useTemplateStore = defineStore('template', () => {
  const templates = ref<NetworkTemplate[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  const bySlug = computed(
    () => new Map(templates.value.map((t) => [t.slug, t] as const)),
  )

  async function fetchTemplates(force = false): Promise<void> {
    if (loaded.value && !force) return
    loading.value = true
    error.value = null
    try {
      templates.value = await templatesApi.list()
      loaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load templates'
    } finally {
      loading.value = false
    }
  }

  return {
    templates,
    loading,
    loaded,
    error,
    bySlug,
    fetchTemplates,
  }
})
