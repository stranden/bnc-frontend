<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import DeviceForm from '@/components/DeviceForm.vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useDeviceStore } from '@/stores/devices'
import { useToastStore } from '@/stores/toast'
import type { Device, DeviceCreate } from '@/types/bnc'

const deviceStore = useDeviceStore()
const auth = useAuthStore()
const toasts = useToastStore()

const search = ref('')
const statusFilter = ref('')
const manageFilter = ref('')

const editing = ref<Device | null>(null)
const formOpen = ref(false)
const submitting = ref(false)
const deleteTarget = ref<Device | null>(null)
const deleting = ref(false)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return deviceStore.visibleDevices.filter((device) => {
    if (statusFilter.value && device.status !== statusFilter.value) return false
    if (manageFilter.value === 'managed' && !device.manageable) return false
    if (manageFilter.value === 'readonly' && device.manageable) return false
    if (!term) return true
    return [device.name, device.device_type?.display, device.device_role?.name, device.primary_ip4?.display]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
})

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(device: Device) {
  editing.value = device
  formOpen.value = true
}

async function save(payload: DeviceCreate) {
  submitting.value = true
  try {
    if (editing.value) {
      await deviceStore.updateDevice(editing.value.id, payload)
      toasts.success(`${payload.name} updated`)
    } else {
      await deviceStore.createDevice(payload)
      toasts.success(`${payload.name} created`)
    }
    formOpen.value = false
    editing.value = null
  } catch (err) {
    toasts.error(
      editing.value ? 'Could not update device' : 'Could not create device',
      err instanceof ApiError ? err.message : undefined,
    )
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deviceStore.deleteDevice(deleteTarget.value.id)
    toasts.success(`${deleteTarget.value.name} deleted`)
    deleteTarget.value = null
  } catch (err) {
    toasts.error('Could not delete device', err instanceof ApiError ? err.message : undefined)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Devices"
      description="Switches exposed by NetBox to BNC. Only devices tagged bnc-state: manage can be changed."
    >
      <template #actions>
        <button class="btn btn-sm btn-outline" :disabled="deviceStore.loading" @click="deviceStore.fetchDevices()">
          <span v-if="deviceStore.loading" class="loading loading-spinner loading-xs" />
          Refresh
        </button>
        <button v-if="auth.canWrite" class="btn btn-sm btn-primary" @click="openCreate">
          Add device
        </button>
      </template>
    </PageHeader>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Search name, type or IP…"
        class="input input-bordered input-sm w-full max-w-xs"
      />
      <select v-model="statusFilter" class="select select-bordered select-sm">
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="planned">Planned</option>
        <option value="staging">Staging</option>
        <option value="offline">Offline</option>
      </select>
      <select v-model="manageFilter" class="select select-bordered select-sm">
        <option value="">Any control state</option>
        <option value="managed">BNC-managed</option>
        <option value="readonly">Read-only</option>
      </select>
      <span class="text-base-content/50 ml-auto text-sm">
        {{ filtered.length }} of {{ deviceStore.visibleDevices.length }}
      </span>
    </div>

    <div v-if="deviceStore.error" class="alert alert-error mb-4">
      <span>{{ deviceStore.error }}</span>
    </div>

    <div class="card bg-base-100 border-base-300 border">
      <div v-if="deviceStore.loading && !deviceStore.devices.length" class="p-6">
        <div class="skeleton mb-3 h-10 w-full" />
        <div class="skeleton mb-3 h-10 w-full" />
        <div class="skeleton h-10 w-full" />
      </div>

      <EmptyState
        v-else-if="!filtered.length"
        icon="▦"
        title="No devices match"
        description="Adjust the filters, or tag a device in NetBox with external-ctrl: bnc."
      />

      <div v-else class="overflow-x-auto">
        <table class="table-zebra table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Role</th>
              <th>Management IP</th>
              <th>Status</th>
              <th>Control</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="device in filtered" :key="device.id">
              <td class="font-net font-medium">{{ device.name }}</td>
              <td class="text-sm">{{ device.device_type?.display ?? device.device_type?.name }}</td>
              <td class="text-base-content/60 text-sm">{{ device.device_role?.name ?? '—' }}</td>
              <td class="font-net text-sm">{{ device.primary_ip4?.display ?? '—' }}</td>
              <td><StatusBadge :status="device.status" /></td>
              <td>
                <span
                  class="badge badge-sm badge-soft"
                  :class="device.manageable ? 'badge-success' : 'badge-ghost'"
                  :title="
                    device.manageable
                      ? 'Tagged bnc-state: manage — BNC may push configuration'
                      : 'Read-only: tag the device bnc-state: manage to allow changes'
                  "
                >
                  {{ device.manageable ? 'manage' : 'read-only' }}
                </span>
              </td>
              <td>
                <div class="flex justify-end gap-1">
                  <RouterLink
                    :to="{ name: 'device-ports', params: { id: device.id } }"
                    class="btn btn-xs btn-ghost"
                  >
                    Ports
                  </RouterLink>
                  <button
                    v-if="auth.canWrite"
                    class="btn btn-xs btn-ghost"
                    @click="openEdit(device)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="auth.canWrite"
                    class="btn btn-xs btn-ghost text-error"
                    @click="deleteTarget = device"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal
      :open="formOpen"
      :title="editing ? `Edit ${editing.name}` : 'Add device'"
      subtitle="Changes are written back to NetBox, which stays the source of truth."
      size="lg"
      @close="formOpen = false"
    >
      <DeviceForm :device="editing" :submitting="submitting" @submit="save" />
      <template #actions>
        <button class="btn btn-ghost btn-sm" @click="formOpen = false">Cancel</button>
        <button type="submit" form="device-form" class="btn btn-primary btn-sm" :disabled="submitting">
          <span v-if="submitting" class="loading loading-spinner loading-xs" />
          {{ editing ? 'Save changes' : 'Create device' }}
        </button>
      </template>
    </BaseModal>

    <BaseModal
      :open="Boolean(deleteTarget)"
      title="Delete device"
      subtitle="This removes the device from NetBox."
      @close="deleteTarget = null"
    >
      <p>
        Delete <strong class="font-net">{{ deleteTarget?.name }}</strong> and all of its interface
        assignments? This cannot be undone.
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
