<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import VlanForm from '@/components/VlanForm.vue'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { emptyVlanDraft, useIpamStore } from '@/stores/ipam'
import { useSiteStore } from '@/stores/site'
import { templateBadgeClass, useTemplateStore } from '@/stores/templates'
import { useToastStore } from '@/stores/toast'
import type { Vlan, VlanCreate } from '@/types/bnc'

const ipamStore = useIpamStore()
const siteStore = useSiteStore()
const templateStore = useTemplateStore()
const auth = useAuthStore()
const toasts = useToastStore()

templateStore.fetchTemplates()

const search = ref('')
const formOpen = ref(false)
const submitting = ref(false)
const draft = ref<VlanCreate>(emptyVlanDraft(siteStore.activeSiteId))
const deleteTarget = ref<Vlan | null>(null)
const deleting = ref(false)

// Keep the draft's site aligned with the active site while the form is closed.
watch(
  () => siteStore.activeSiteId,
  (siteId) => {
    if (!formOpen.value) draft.value = emptyVlanDraft(siteId)
  },
)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return ipamStore.visibleVlans
  return ipamStore.visibleVlans.filter((vlan) =>
    [vlan.name, String(vlan.vid), vlan.template].filter(Boolean).some((value) =>
      String(value).toLowerCase().includes(term),
    ),
  )
})

function templateName(slug: string | null | undefined): string {
  if (!slug) return '—'
  return templateStore.bySlug.get(slug)?.name ?? slug
}

function openCreate() {
  draft.value = {
    ...emptyVlanDraft(siteStore.activeSiteId),
    vid: ipamStore.suggestVid(100),
  }
  formOpen.value = true
}

async function save() {
  submitting.value = true
  try {
    const vlan = await ipamStore.createVlan(draft.value)
    toasts.success(`VLAN ${vlan.vid} (${vlan.name}) created`)
    formOpen.value = false
  } catch (err) {
    toasts.error('Could not create VLAN', err instanceof ApiError ? err.message : undefined)
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await ipamStore.deleteVlan(deleteTarget.value.vid, deleteTarget.value.site_id)
    toasts.success(`VLAN ${deleteTarget.value.vid} deleted`)
    deleteTarget.value = null
  } catch (err) {
    toasts.error('Could not delete VLAN', err instanceof ApiError ? err.message : undefined)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="VLANs"
      description="Layer-2 segments in NetBox, scoped to the active site. Tag a VLAN with a network template to describe its traffic class."
    >
      <template #actions>
        <button class="btn btn-sm btn-outline" :disabled="ipamStore.loading" @click="ipamStore.fetchAll()">
          <span v-if="ipamStore.loading" class="loading loading-spinner loading-xs" />
          Refresh
        </button>
        <button
          v-if="auth.canWrite"
          class="btn btn-sm btn-primary"
          :disabled="!siteStore.activeSiteId"
          :title="siteStore.activeSiteId ? undefined : 'Select a site first'"
          @click="openCreate"
        >
          Create VLAN
        </button>
      </template>
    </PageHeader>

    <div v-if="ipamStore.error" class="alert alert-error mb-4">
      <span>{{ ipamStore.error }}</span>
    </div>

    <div v-if="!siteStore.activeSiteId" class="alert alert-info mb-4">
      <span>Select a site to see its VLANs.</span>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Search VLAN, VID or template…"
        class="input input-bordered input-sm w-full max-w-xs"
      />
      <span class="text-base-content/50 ml-auto text-sm">
        {{ filtered.length }} of {{ ipamStore.visibleVlans.length }}
      </span>
    </div>

    <div class="card bg-base-100 border-base-300 border">
      <div v-if="ipamStore.loading && !ipamStore.vlans.length" class="p-6">
        <div class="skeleton mb-3 h-10 w-full" />
        <div class="skeleton mb-3 h-10 w-full" />
        <div class="skeleton h-10 w-full" />
      </div>

      <EmptyState
        v-else-if="!filtered.length"
        icon="⇄"
        title="No VLANs"
        description="Create a VLAN to carry media or control traffic at this site."
      />

      <div v-else class="overflow-x-auto">
        <table class="table-zebra table">
          <thead>
            <tr>
              <th>VID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Template</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vlan in filtered" :key="vlan.vid">
              <td class="font-net font-medium">{{ vlan.vid }}</td>
              <td class="font-net">{{ vlan.name }}</td>
              <td class="text-base-content/60 text-sm">{{ vlan.description ?? '—' }}</td>
              <td>
                <span class="badge badge-sm badge-soft" :class="templateBadgeClass(vlan.template)">
                  {{ templateName(vlan.template) }}
                </span>
              </td>
              <td class="text-right">
                <button
                  v-if="auth.canWrite"
                  class="btn btn-xs btn-ghost text-error"
                  @click="deleteTarget = vlan"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal
      :open="formOpen"
      title="Create VLAN"
      subtitle="Creates the VLAN in NetBox at the active site."
      size="lg"
      @close="formOpen = false"
    >
      <VlanForm v-model="draft" @submit="save" />
      <template #actions>
        <button class="btn btn-ghost btn-sm" @click="formOpen = false">Cancel</button>
        <button type="submit" form="vlan-form" class="btn btn-primary btn-sm" :disabled="submitting">
          <span v-if="submitting" class="loading loading-spinner loading-xs" />
          Create VLAN
        </button>
      </template>
    </BaseModal>

    <BaseModal :open="Boolean(deleteTarget)" title="Delete VLAN" @close="deleteTarget = null">
      <p>
        Delete VLAN <strong class="font-net">{{ deleteTarget?.vid }} ({{ deleteTarget?.name }})</strong>?
        Ports still assigned to it will block the deletion.
      </p>
      <template #actions>
        <button class="btn btn-ghost btn-sm" @click="deleteTarget = null">Cancel</button>
        <button class="btn btn-error btn-sm" :disabled="deleting" @click="confirmDelete">
          <span v-if="deleting" class="loading loading-spinner loading-xs" />
          Delete
        </button>
      </template>
    </BaseModal>
  </div>
</template>
