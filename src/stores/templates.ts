import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { templatesApi } from '@/api'
import type { SwitchportTemplate, SwitchportTemplateCreate, TemplateKind } from '@/types/bnc'

/** Presentation metadata per profile family, used for badges and icons. */
export const TEMPLATE_KIND_META: Record<TemplateKind, { label: string; badge: string; accent: string }> = {
  st2110: { label: 'SMPTE 2110', badge: 'badge-primary', accent: 'text-primary' },
  aes67: { label: 'AES67', badge: 'badge-secondary', accent: 'text-secondary' },
  dante: { label: 'Dante', badge: 'badge-accent', accent: 'text-accent' },
  data: { label: 'Data', badge: 'badge-neutral', accent: 'text-base-content' },
  uplink: { label: 'Uplink', badge: 'badge-info', accent: 'text-info' },
  custom: { label: 'Custom', badge: 'badge-ghost', accent: 'text-base-content' },
}

export function emptyTemplate(): SwitchportTemplateCreate {
  return {
    name: '',
    slug: '',
    kind: 'custom',
    description: '',
    mode: 'access',
    untagged_vlan: null,
    tagged_vlans: [],
    mtu: 1500,
    speed: null,
    enabled: true,
    qos: { media_dscp: 34, ptp_dscp: 46, trust_mode: 'dscp' },
    ptp: {
      enabled: false,
      profile: null,
      announce_interval: null,
      sync_interval: null,
      delay_req_interval: null,
    },
    multicast: {
      igmp_snooping: true,
      querier: false,
      igmp_version: 3,
      block_unknown: true,
      max_groups: null,
    },
    security: { portfast: true, bpdu_guard: true, storm_control_pps: null },
  }
}

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<SwitchportTemplate[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  const bySlug = computed(
    () => new Map(templates.value.map((t) => [t.slug, t] as const)),
  )
  const builtins = computed(() => templates.value.filter((t) => t.builtin))
  const custom = computed(() => templates.value.filter((t) => !t.builtin))

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

  async function createTemplate(payload: SwitchportTemplateCreate): Promise<SwitchportTemplate> {
    const template = await templatesApi.create(payload)
    templates.value = [...templates.value, template]
    return template
  }

  async function updateTemplate(
    slug: string,
    payload: Partial<SwitchportTemplate>,
  ): Promise<SwitchportTemplate> {
    const template = await templatesApi.update(slug, payload)
    templates.value = templates.value.map((t) => (t.slug === slug ? template : t))
    return template
  }

  async function deleteTemplate(slug: string): Promise<void> {
    await templatesApi.remove(slug)
    templates.value = templates.value.filter((t) => t.slug !== slug)
  }

  /** Clone a built-in into an editable custom template. */
  function cloneTemplate(source: SwitchportTemplate): SwitchportTemplateCreate {
    const { id: _id, builtin: _builtin, created_at: _c, updated_at: _u, ...rest } = source
    return {
      ...structuredClone(rest),
      name: `${source.name} (copy)`,
      slug: '',
    }
  }

  return {
    templates,
    loading,
    loaded,
    error,
    bySlug,
    builtins,
    custom,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate,
  }
})
