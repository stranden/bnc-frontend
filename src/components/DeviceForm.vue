<script setup lang="ts">
/** Create/edit form for a device. Emits the payload; the parent persists it. */
import { computed, reactive, watch } from 'vue'
import type { Device, DeviceCreate } from '@/types/bnc'
import { useDeviceStore } from '@/stores/devices'
import { useSiteStore } from '@/stores/site'

const props = defineProps<{ device?: Device | null; submitting?: boolean }>()
const emit = defineEmits<{ submit: [DeviceCreate]; cancel: [] }>()

const deviceStore = useDeviceStore()
const siteStore = useSiteStore()

const form = reactive<DeviceCreate>({
  name: '',
  site: siteStore.activeSiteId ?? 0,
  device_type: 0,
  status: 'active',
  primary_ip4: '',
  manageable: false,
})

watch(
  () => props.device,
  (device) => {
    form.name = device?.name ?? ''
    form.site = device?.site?.id ?? siteStore.activeSiteId ?? 0
    form.device_type = device?.device_type?.id ?? 0
    form.status = device?.status ?? 'active'
    form.primary_ip4 = device?.primary_ip4?.display ?? ''
    form.manageable = device?.manageable ?? false
  },
  { immediate: true },
)

const nameError = computed(() => {
  if (!form.name) return null
  if (!/^[a-zA-Z0-9._-]+$/.test(form.name)) {
    return 'Use letters, digits, dots, dashes or underscores only.'
  }
  const clash = deviceStore.devices.some(
    (d) => d.id !== props.device?.id && d.name?.toLowerCase() === form.name.toLowerCase(),
  )
  return clash ? 'A device with this name already exists.' : null
})

const ipError = computed(() => {
  if (!form.primary_ip4) return null
  return /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(form.primary_ip4)
    ? null
    : 'Enter an IPv4 address in CIDR form, e.g. 10.0.0.11/24.'
})

const valid = computed(
  () => Boolean(form.name && form.site && form.device_type) && !nameError.value && !ipError.value,
)

function submit() {
  if (!valid.value) return
  emit('submit', { ...form, primary_ip4: form.primary_ip4 || null })
}
</script>

<template>
  <form id="device-form" class="grid gap-4" @submit.prevent="submit">
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Name</span></div>
      <input
        v-model.trim="form.name"
        type="text"
        required
        class="input input-bordered font-net w-full"
        :class="{ 'input-error': nameError }"
        placeholder="std1-leaf-01"
      />
      <div v-if="nameError" class="label">
        <span class="label-text-alt text-error">{{ nameError }}</span>
      </div>
    </label>

    <div class="grid gap-4 sm:grid-cols-2">
      <label class="form-control w-full">
        <div class="label"><span class="label-text">Site</span></div>
        <select v-model.number="form.site" required class="select select-bordered w-full">
          <option :value="0" disabled>Select a site</option>
          <option v-for="site in siteStore.sites" :key="site.id" :value="site.id">
            {{ site.name }}
          </option>
        </select>
      </label>

      <label class="form-control w-full">
        <div class="label"><span class="label-text">Device type</span></div>
        <select v-model.number="form.device_type" required class="select select-bordered w-full">
          <option :value="0" disabled>Select a type</option>
          <option v-for="type in deviceStore.deviceTypes" :key="type.id" :value="type.id">
            {{ type.manufacturer?.name }} {{ type.model }}
          </option>
        </select>
      </label>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <label class="form-control w-full">
        <div class="label"><span class="label-text">Status</span></div>
        <select v-model="form.status" class="select select-bordered w-full">
          <option value="active">Active</option>
          <option value="planned">Planned</option>
          <option value="staging">Staging</option>
          <option value="offline">Offline</option>
        </select>
      </label>

      <label class="form-control w-full">
        <div class="label"><span class="label-text">Management IPv4</span></div>
        <input
          v-model.trim="form.primary_ip4"
          type="text"
          class="input input-bordered font-net w-full"
          :class="{ 'input-error': ipError }"
          placeholder="10.0.0.11/24"
        />
        <div v-if="ipError" class="label">
          <span class="label-text-alt text-error">{{ ipError }}</span>
        </div>
      </label>
    </div>

    <label class="border-base-300 flex cursor-pointer items-start gap-3 rounded-lg border p-4">
      <input v-model="form.manageable" type="checkbox" class="checkbox checkbox-primary mt-0.5" />
      <span>
        <span class="block font-medium">Allow BNC to manage this device</span>
        <span class="text-base-content/60 text-sm">
          Applies the <code>bnc-state: manage</code> tag in NetBox. Without it BNC can read the
          device but never change switch ports or push configuration.
        </span>
      </span>
    </label>
  </form>
</template>
