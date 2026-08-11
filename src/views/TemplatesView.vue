<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import TemplateForm from '@/components/TemplateForm.vue'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/devices'
import { TEMPLATE_KIND_META, emptyTemplate, useTemplateStore } from '@/stores/templates'
import { useToastStore } from '@/stores/toast'
import type { SwitchportTemplate, SwitchportTemplateCreate } from '@/types/bnc'

const templateStore = useTemplateStore()
const deviceStore = useDeviceStore()
const auth = useAuthStore()
const toasts = useToastStore()

const kindFilter = ref('')
const formOpen = ref(false)
const submitting = ref(false)
const editingSlug = ref<string | null>(null)
const draft = ref<SwitchportTemplateCreate>(emptyTemplate())
const deleteTarget = ref<SwitchportTemplate | null>(null)
const deleting = ref(false)

const filtered = computed(() =>
  kindFilter.value
    ? templateStore.templates.filter((t) => t.kind === kindFilter.value)
    : templateStore.templates,
)

/** How many ports across all loaded devices currently use each template. */
const usageBySlug = computed(() => {
  const counts = new Map<string, number>()
  for (const iface of deviceStore.interfaces) {
    if (!iface.template) continue
    counts.set(iface.template, (counts.get(iface.template) ?? 0) + 1)
  }
  return counts
})

function openCreate() {
  editingSlug.value = null
  draft.value = emptyTemplate()
  formOpen.value = true
}

function openEdit(template: SwitchportTemplate) {
  editingSlug.value = template.slug
  const { id: _id, builtin: _b, created_at: _c, updated_at: _u, ...rest } = template
  draft.value = structuredClone(rest)
  formOpen.value = true
}

function openClone(template: SwitchportTemplate) {
  editingSlug.value = null
  draft.value = templateStore.cloneTemplate(template)
  formOpen.value = true
}

async function save() {
  submitting.value = true
  try {
    if (editingSlug.value) {
      await templateStore.updateTemplate(editingSlug.value, draft.value)
      toasts.success(`${draft.value.name} updated`)
    } else {
      await templateStore.createTemplate(draft.value)
      toasts.success(`${draft.value.name} created`)
    }
    formOpen.value = false
  } catch (err) {
    toasts.error('Could not save template', err instanceof ApiError ? err.message : undefined)
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await templateStore.deleteTemplate(deleteTarget.value.slug)
    toasts.success(`${deleteTarget.value.name} deleted`)
    deleteTarget.value = null
  } catch (err) {
    toasts.error('Could not delete template', err instanceof ApiError ? err.message : undefined)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Port templates"
      description="Broadcast profiles applied to switchports. Built-in profiles can be cloned but not edited."
    >
      <template #actions>
        <select v-model="kindFilter" class="select select-bordered select-sm">
          <option value="">All families</option>
          <option v-for="(meta, kind) in TEMPLATE_KIND_META" :key="kind" :value="kind">
            {{ meta.label }}
          </option>
        </select>
        <button v-if="auth.canWrite" class="btn btn-sm btn-primary" @click="openCreate">
          New template
        </button>
      </template>
    </PageHeader>

    <div v-if="templateStore.error" class="alert alert-error mb-4">
      <span>{{ templateStore.error }}</span>
    </div>

    <div v-if="templateStore.loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="n in 3" :key="n" class="card bg-base-100 border-base-300 border">
        <div class="card-body gap-3">
          <div class="skeleton h-5 w-2/3" />
          <div class="skeleton h-16 w-full" />
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="!filtered.length"
      icon="⛭"
      title="No templates"
      description="Create a profile to describe how a class of switchports should be configured."
    />

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="template in filtered"
        :key="template.slug"
        class="card bg-base-100 border-base-300 border"
      >
        <div class="card-body gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate font-semibold">{{ template.name }}</h2>
              <p class="text-base-content/50 font-net truncate text-xs">{{ template.slug }}</p>
            </div>
            <span class="badge badge-sm" :class="TEMPLATE_KIND_META[template.kind].badge">
              {{ TEMPLATE_KIND_META[template.kind].label }}
            </span>
          </div>

          <p v-if="template.description" class="text-base-content/60 line-clamp-3 text-sm">
            {{ template.description }}
          </p>

          <ul class="text-base-content/70 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <li>Mode: <span class="font-net">{{ template.mode }}</span></li>
            <li>MTU: <span class="font-net">{{ template.mtu ?? 'auto' }}</span></li>
            <li>
              PTP:
              <span class="font-net">{{ template.ptp.enabled ? template.ptp.profile : 'off' }}</span>
            </li>
            <li>
              IGMP:
              <span class="font-net">
                {{ template.multicast.igmp_snooping ? `v${template.multicast.igmp_version}` : 'off' }}
                {{ template.multicast.querier ? '+querier' : '' }}
              </span>
            </li>
            <li>DSCP: <span class="font-net">{{ template.qos.media_dscp ?? '—' }}</span></li>
            <li>
              In use:
              <span class="font-net">{{ usageBySlug.get(template.slug) ?? 0 }} ports</span>
            </li>
          </ul>

          <div class="card-actions items-center justify-end">
            <span v-if="template.builtin" class="badge badge-ghost badge-sm mr-auto">built-in</span>
            <button class="btn btn-xs btn-ghost" @click="openClone(template)">Clone</button>
            <button
              v-if="auth.canWrite && !template.builtin"
              class="btn btn-xs btn-ghost"
              @click="openEdit(template)"
            >
              Edit
            </button>
            <button
              v-if="auth.canWrite && !template.builtin"
              class="btn btn-xs btn-ghost text-error"
              @click="deleteTarget = template"
            >
              Delete
            </button>
          </div>
        </div>
      </article>
    </div>

    <BaseModal
      :open="formOpen"
      :title="editingSlug ? 'Edit template' : 'New template'"
      subtitle="Defines how BNC configures a switchport for this class of media traffic."
      size="xl"
      @close="formOpen = false"
    >
      <TemplateForm v-model="draft" :lock-slug="Boolean(editingSlug)" @submit="save" />
      <template #actions>
        <button class="btn btn-ghost btn-sm" @click="formOpen = false">Cancel</button>
        <button type="submit" form="template-form" class="btn btn-primary btn-sm" :disabled="submitting">
          <span v-if="submitting" class="loading loading-spinner loading-xs" />
          {{ editingSlug ? 'Save changes' : 'Create template' }}
        </button>
      </template>
    </BaseModal>

    <BaseModal
      :open="Boolean(deleteTarget)"
      title="Delete template"
      @close="deleteTarget = null"
    >
      <p>
        Delete <strong>{{ deleteTarget?.name }}</strong>? Ports already configured keep their current
        settings, but the profile can no longer be applied.
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
