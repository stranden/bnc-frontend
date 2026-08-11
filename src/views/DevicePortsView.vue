<script setup lang="ts">
/**
 * Switchport template assignment.
 *
 * Ports are staged locally so an operator can lay out a whole patch before
 * pushing anything, then reviewed as a diff and applied in one operation.
 */
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/devices'
import { useIpamStore } from '@/stores/ipam'
import { TEMPLATE_KIND_META, useTemplateStore } from '@/stores/templates'
import { useToastStore } from '@/stores/toast'
import type { ApplyTemplatesResult, PortAssignment } from '@/types/bnc'

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()
const templateStore = useTemplateStore()
const ipamStore = useIpamStore()
const auth = useAuthStore()
const toasts = useToastStore()

const deviceId = computed(() => Number(route.params.id))
const device = computed(() => deviceStore.getDevice(deviceId.value))

const search = ref('')
const onlyChanged = ref(false)
const selected = ref<Set<number>>(new Set())
/** Staged template slug per interface id; absent means "unchanged". */
const staged = ref<Map<number, string | null>>(new Map())
const bulkTemplate = ref<string>('')
const bulkVlan = ref<number | null>(null)

const applying = ref(false)
const reviewOpen = ref(false)
const preview = ref<ApplyTemplatesResult | null>(null)

watch(
  deviceId,
  async (id) => {
    if (!Number.isFinite(id)) return
    staged.value = new Map()
    selected.value = new Set()
    await deviceStore.fetchInterfaces(id)
  },
  { immediate: true },
)

const canPush = computed(() => auth.canWrite && Boolean(device.value?.manageable))

const interfaces = computed(() => {
  const term = search.value.trim().toLowerCase()
  return deviceStore.interfaces.filter((iface) => {
    if (onlyChanged.value && !staged.value.has(iface.id)) return false
    if (!term) return true
    return [iface.name, iface.template, iface.untagged_vlan?.name, iface.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

/** Template currently staged for a port, falling back to what is applied. */
function effectiveTemplate(interfaceId: number, current: string | null): string | null {
  return staged.value.has(interfaceId) ? (staged.value.get(interfaceId) ?? null) : current
}

const pendingChanges = computed(() => {
  const changes: Array<{ id: number; name: string; from: string | null; to: string | null }> = []
  for (const iface of deviceStore.interfaces) {
    if (!staged.value.has(iface.id)) continue
    const next = staged.value.get(iface.id) ?? null
    if (next === iface.template) continue
    changes.push({ id: iface.id, name: iface.name, from: iface.template, to: next })
  }
  return changes
})

const allVisibleSelected = computed(
  () => interfaces.value.length > 0 && interfaces.value.every((i) => selected.value.has(i.id)),
)

function toggleSelect(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleSelectAll() {
  selected.value = allVisibleSelected.value
    ? new Set()
    : new Set(interfaces.value.map((i) => i.id))
}

function stage(interfaceId: number, slug: string | null) {
  const next = new Map(staged.value)
  const iface = deviceStore.interfaces.find((i) => i.id === interfaceId)
  // Staging the value a port already has is not a change — drop it.
  if (iface && iface.template === slug) next.delete(interfaceId)
  else next.set(interfaceId, slug)
  staged.value = next
}

function applyBulk() {
  if (!selected.value.size) return
  const slug = bulkTemplate.value || null
  for (const id of selected.value) stage(id, slug)
  toasts.info(
    `${selected.value.size} port(s) staged as ${slug ? templateStore.bySlug.get(slug)?.name : 'unconfigured'}`,
  )
  selected.value = new Set()
}

function clearStaged() {
  staged.value = new Map()
  preview.value = null
}

function buildAssignments(): PortAssignment[] {
  return pendingChanges.value.map((change) => ({
    interface_id: change.id,
    template: change.to,
    untagged_vlan: bulkVlan.value ?? undefined,
  }))
}

async function review() {
  if (!pendingChanges.value.length) return
  applying.value = true
  try {
    preview.value = await deviceStore.applyTemplates(deviceId.value, buildAssignments(), true)
    reviewOpen.value = true
  } catch (err) {
    toasts.error('Could not compute changes', err instanceof ApiError ? err.message : undefined)
  } finally {
    applying.value = false
  }
}

async function apply() {
  applying.value = true
  try {
    const result = await deviceStore.applyTemplates(deviceId.value, buildAssignments(), false)
    if (result.errors.length) {
      toasts.warning(`Applied with ${result.errors.length} error(s)`, result.errors.join('; '))
    } else {
      toasts.success(`${result.changed} port(s) updated on ${device.value?.name}`)
    }
    clearStaged()
    reviewOpen.value = false
  } catch (err) {
    toasts.error('Could not apply templates', err instanceof ApiError ? err.message : undefined)
  } finally {
    applying.value = false
  }
}

function templateBadge(slug: string | null) {
  if (!slug) return { label: 'unconfigured', badge: 'badge-ghost' }
  const template = templateStore.bySlug.get(slug)
  if (!template) return { label: slug, badge: 'badge-error' }
  return { label: template.name, badge: TEMPLATE_KIND_META[template.kind].badge }
}
</script>

<template>
  <div>
    <PageHeader
      :title="device?.name ?? `Device ${deviceId}`"
      description="Assign broadcast profiles to switchports. Changes are staged locally, then pushed in one operation."
    >
      <template #actions>
        <RouterLink :to="{ name: 'devices' }" class="btn btn-sm btn-ghost">Back</RouterLink>
        <button
          class="btn btn-sm btn-outline"
          :disabled="!pendingChanges.length"
          @click="clearStaged"
        >
          Discard {{ pendingChanges.length || '' }}
        </button>
        <button
          class="btn btn-sm btn-primary"
          :disabled="!pendingChanges.length || !canPush || applying"
          :title="canPush ? undefined : 'Device is not tagged bnc-state: manage'"
          @click="review"
        >
          <span v-if="applying" class="loading loading-spinner loading-xs" />
          Review & apply
        </button>
      </template>
    </PageHeader>

    <div v-if="!device" class="alert alert-error mb-4">
      <span>Device not found.</span>
      <button class="btn btn-sm" @click="router.push({ name: 'devices' })">Back to devices</button>
    </div>

    <template v-else>
      <div v-if="!device.manageable" class="alert alert-warning mb-4">
        <span>
          <strong class="font-net">{{ device.name }}</strong> is not tagged
          <code>bnc-state: manage</code> in NetBox. Ports are shown read-only; tag the device to
          allow BNC to change it.
        </span>
      </div>

      <div class="card bg-base-100 border-base-300 mb-4 border">
        <div class="card-body flex-row flex-wrap items-end gap-3 p-4">
          <label class="form-control">
            <div class="label py-1"><span class="label-text text-xs">Bulk template</span></div>
            <select v-model="bulkTemplate" class="select select-bordered select-sm w-56">
              <option value="">— Unconfigure port —</option>
              <option v-for="template in templateStore.templates" :key="template.slug" :value="template.slug">
                {{ template.name }}
              </option>
            </select>
          </label>

          <label class="form-control">
            <div class="label py-1"><span class="label-text text-xs">VLAN override</span></div>
            <select v-model.number="bulkVlan" class="select select-bordered select-sm w-56">
              <option :value="null">Use template default</option>
              <option v-for="vlan in ipamStore.visibleVlans" :key="vlan.id" :value="vlan.id">
                {{ vlan.vid }} — {{ vlan.name }}
              </option>
            </select>
          </label>

          <button
            class="btn btn-sm btn-secondary"
            :disabled="!selected.size || !canPush"
            @click="applyBulk"
          >
            Stage on {{ selected.size }} selected
          </button>

          <div class="ml-auto flex items-end gap-2">
            <input
              v-model="search"
              type="search"
              placeholder="Filter ports…"
              class="input input-bordered input-sm w-48"
            />
            <label class="label cursor-pointer gap-2">
              <input v-model="onlyChanged" type="checkbox" class="checkbox checkbox-sm" />
              <span class="label-text text-xs">Changed only</span>
            </label>
          </div>
        </div>
      </div>

      <div v-if="pendingChanges.length" class="alert alert-info mb-4">
        <span>{{ pendingChanges.length }} port(s) staged and not yet pushed to the device.</span>
      </div>

      <div class="card bg-base-100 border-base-300 border">
        <div v-if="deviceStore.interfacesLoading" class="p-6">
          <div class="skeleton mb-3 h-10 w-full" />
          <div class="skeleton mb-3 h-10 w-full" />
          <div class="skeleton h-10 w-full" />
        </div>

        <EmptyState
          v-else-if="!interfaces.length"
          icon="⌁"
          title="No ports match"
          description="Clear the filter to see every interface on this switch."
        />

        <div v-else class="overflow-x-auto">
          <table class="table-pin-rows table-sm table">
            <thead>
              <tr>
                <th class="w-10">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :checked="allVisibleSelected"
                    :disabled="!canPush"
                    @change="toggleSelectAll"
                  />
                </th>
                <th>Port</th>
                <th>Link</th>
                <th>Current template</th>
                <th>VLAN</th>
                <th>MTU</th>
                <th class="w-64">Assign template</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="iface in interfaces"
                :key="iface.id"
                :class="{ 'bg-info/5': staged.has(iface.id) }"
              >
                <td>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :checked="selected.has(iface.id)"
                    :disabled="!canPush"
                    @change="toggleSelect(iface.id)"
                  />
                </td>
                <td class="font-net font-medium">{{ iface.name }}</td>
                <td>
                  <span
                    class="badge badge-xs"
                    :class="iface.link_state === 'up' ? 'badge-success' : 'badge-ghost'"
                  >
                    {{ iface.link_state ?? 'unknown' }}
                  </span>
                </td>
                <td>
                  <span class="badge badge-sm badge-soft" :class="templateBadge(iface.template).badge">
                    {{ templateBadge(iface.template).label }}
                  </span>
                </td>
                <td class="font-net text-xs">{{ iface.untagged_vlan?.name ?? '—' }}</td>
                <td class="font-net text-xs">{{ iface.mtu ?? '—' }}</td>
                <td>
                  <select
                    class="select select-bordered select-xs w-full"
                    :class="{ 'select-info': staged.has(iface.id) }"
                    :value="effectiveTemplate(iface.id, iface.template) ?? ''"
                    :disabled="!canPush"
                    @change="stage(iface.id, ($event.target as HTMLSelectElement).value || null)"
                  >
                    <option value="">— Unconfigured —</option>
                    <option
                      v-for="template in templateStore.templates"
                      :key="template.slug"
                      :value="template.slug"
                    >
                      {{ template.name }}
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <BaseModal
      :open="reviewOpen"
      title="Review changes"
      subtitle="These changes will be pushed to the device."
      size="lg"
      @close="reviewOpen = false"
    >
      <div v-if="preview?.errors.length" class="alert alert-error mb-4 text-sm">
        <span>{{ preview.errors.join('; ') }}</span>
      </div>

      <table class="table-sm table">
        <thead>
          <tr>
            <th>Port</th>
            <th>From</th>
            <th>To</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="change in preview?.changes ?? []" :key="change.interface">
            <td class="font-net">{{ change.interface }}</td>
            <td>
              <span class="badge badge-xs badge-ghost">{{ change.from ?? 'unconfigured' }}</span>
            </td>
            <td>
              <span class="badge badge-xs badge-primary">{{ change.to ?? 'unconfigured' }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!preview?.changes.length" class="text-base-content/60 py-4 text-sm">
        Nothing to change — the staged templates match the current configuration.
      </p>

      <template #actions>
        <button class="btn btn-ghost btn-sm" @click="reviewOpen = false">Cancel</button>
        <button
          class="btn btn-primary btn-sm"
          :disabled="applying || !preview?.changes.length"
          @click="apply"
        >
          <span v-if="applying" class="loading loading-spinner loading-xs" />
          Apply {{ preview?.changes.length ?? 0 }} change(s)
        </button>
      </template>
    </BaseModal>
  </div>
</template>
