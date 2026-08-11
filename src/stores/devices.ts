import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { deviceTypesApi, devicesApi, interfacesApi } from '@/api'
import type {
  ApplyTemplatesResult,
  Device,
  DeviceCreate,
  DeviceInterface,
  DeviceType,
  DeviceUpdate,
  PortAssignment,
} from '@/types/bnc'
import { useSiteStore } from './site'

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([])
  const deviceTypes = ref<DeviceType[]>([])
  const interfaces = ref<DeviceInterface[]>([])
  const loading = ref(false)
  const interfacesLoading = ref(false)
  const error = ref<string | null>(null)

  const siteStore = useSiteStore()

  /** Devices belonging to the active site; all devices when none is selected. */
  const visibleDevices = computed(() => {
    const siteId = siteStore.activeSiteId
    if (siteId === null) return devices.value
    return devices.value.filter((d) => d.site?.id === siteId)
  })

  const manageableDevices = computed(() => visibleDevices.value.filter((d) => d.manageable))

  const stats = computed(() => ({
    total: visibleDevices.value.length,
    active: visibleDevices.value.filter((d) => d.status === 'active').length,
    offline: visibleDevices.value.filter((d) => d.status === 'offline').length,
    manageable: manageableDevices.value.length,
  }))

  async function fetchDevices(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      devices.value = await devicesApi.list()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load devices'
    } finally {
      loading.value = false
    }
  }

  async function fetchDeviceTypes(): Promise<void> {
    if (deviceTypes.value.length) return
    try {
      deviceTypes.value = await deviceTypesApi.list()
    } catch {
      deviceTypes.value = []
    }
  }

  async function createDevice(payload: DeviceCreate): Promise<Device> {
    const device = await devicesApi.create(payload)
    devices.value = [...devices.value, device]
    return device
  }

  async function updateDevice(id: number, payload: DeviceUpdate): Promise<Device> {
    const device = await devicesApi.update(id, payload)
    devices.value = devices.value.map((d) => (d.id === id ? device : d))
    return device
  }

  async function deleteDevice(id: number): Promise<void> {
    await devicesApi.remove(id)
    devices.value = devices.value.filter((d) => d.id !== id)
    interfaces.value = interfaces.value.filter((i) => i.device.id !== id)
  }

  function getDevice(id: number): Device | undefined {
    return devices.value.find((d) => d.id === id)
  }

  async function fetchInterfaces(deviceId: number): Promise<void> {
    interfacesLoading.value = true
    try {
      interfaces.value = await interfacesApi.listForDevice(deviceId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load interfaces'
      interfaces.value = []
    } finally {
      interfacesLoading.value = false
    }
  }

  async function applyTemplates(
    deviceId: number,
    assignments: PortAssignment[],
    dryRun = false,
  ): Promise<ApplyTemplatesResult> {
    const result = await interfacesApi.applyTemplates({
      device: deviceId,
      assignments,
      dry_run: dryRun,
    })
    if (!dryRun) await fetchInterfaces(deviceId)
    return result
  }

  return {
    devices,
    deviceTypes,
    interfaces,
    loading,
    interfacesLoading,
    error,
    visibleDevices,
    manageableDevices,
    stats,
    fetchDevices,
    fetchDeviceTypes,
    createDevice,
    updateDevice,
    deleteDevice,
    getDevice,
    fetchInterfaces,
    applyTemplates,
  }
})
