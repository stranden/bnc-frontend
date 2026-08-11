<script setup lang="ts">
/**
 * VLAN provisioning form.
 *
 * Routing, DHCP and multicast are opt-in: a pure layer-2 media VLAN often
 * wants none of them, while a control VLAN wants all three.
 */
import { computed, reactive, ref, watch } from 'vue'
import type { VlanProvisionRequest } from '@/types/bnc'
import { useIpamStore } from '@/stores/ipam'
import { useSiteStore } from '@/stores/site'
import { cidrToGateway, isCidr, isIPv4 } from '@/utils/net'

const props = defineProps<{ modelValue: VlanProvisionRequest }>()
const emit = defineEmits<{ 'update:modelValue': [VlanProvisionRequest]; submit: [] }>()

const ipamStore = useIpamStore()
const siteStore = useSiteStore()

const form = reactive<VlanProvisionRequest>(structuredClone(props.modelValue))
const relayInput = ref((props.modelValue.dhcp.relay_servers ?? []).join(', '))

watch(
  () => props.modelValue,
  (value) => {
    Object.assign(form, structuredClone(value))
    relayInput.value = (value.dhcp.relay_servers ?? []).join(', ')
  },
)

watch(form, () => emit('update:modelValue', structuredClone(form)), { deep: true })

// Relay servers are entered as free text but stored as a list.
watch(relayInput, (value) => {
  form.dhcp.relay_servers = value
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean)
})

/** Offer the first usable address of the prefix as the SVI address. */
watch(
  () => [form.prefix, form.routing.enabled] as const,
  ([prefix, routingEnabled]) => {
    if (!routingEnabled || !prefix || form.routing.gateway) return
    const suggestion = cidrToGateway(prefix)
    if (suggestion) form.routing.gateway = suggestion
  },
)

const vidError = computed(() => {
  if (form.vid < 1 || form.vid > 4094) return 'VLAN ID must be between 1 and 4094.'
  if (ipamStore.usedVids.has(form.vid)) return `VLAN ${form.vid} already exists at this site.`
  return null
})

const prefixError = computed(() => {
  if (!form.prefix) return null
  return isCidr(form.prefix) ? null : 'Enter a subnet in CIDR form, e.g. 10.10.0.0/24.'
})

const gatewayError = computed(() => {
  if (!form.routing.enabled || !form.routing.gateway) return null
  return isCidr(form.routing.gateway)
    ? null
    : 'Enter the SVI address in CIDR form, e.g. 10.10.0.1/24.'
})

const relayError = computed(() => {
  if (!form.dhcp.enabled) return null
  const invalid = (form.dhcp.relay_servers ?? []).filter((s) => !isIPv4(s))
  return invalid.length ? `Not valid IPv4 addresses: ${invalid.join(', ')}` : null
})

const routingRequiredForMulticast = computed(
  () => form.multicast.enabled && form.multicast.pim_mode !== null && !form.routing.enabled,
)

const valid = computed(
  () =>
    Boolean(form.name && form.site) &&
    !vidError.value &&
    !prefixError.value &&
    !gatewayError.value &&
    !relayError.value,
)

defineExpose({ valid })

function submit() {
  if (!valid.value) return
  emit('submit')
}
</script>

<template>
  <form id="vlan-form" class="grid gap-6" @submit.prevent="submit">
    <section class="grid gap-4 sm:grid-cols-2">
      <label class="form-control w-full">
        <div class="label"><span class="label-text">VLAN name</span></div>
        <input
          v-model.trim="form.name"
          type="text"
          required
          class="input input-bordered font-net w-full"
          placeholder="ST2110-RED-VIDEO"
        />
      </label>

      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">VLAN ID</span>
          <button
            type="button"
            class="label-text-alt link link-hover"
            @click="form.vid = ipamStore.suggestVid(form.vid)"
          >
            suggest free
          </button>
        </div>
        <input
          v-model.number="form.vid"
          type="number"
          min="1"
          max="4094"
          required
          class="input input-bordered font-net w-full"
          :class="{ 'input-error': vidError }"
        />
        <div v-if="vidError" class="label">
          <span class="label-text-alt text-error">{{ vidError }}</span>
        </div>
      </label>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
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
        <div class="label"><span class="label-text">VLAN group</span></div>
        <select v-model.number="form.group" class="select select-bordered w-full">
          <option :value="null">No group</option>
          <option v-for="group in ipamStore.visibleGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </label>
    </section>

    <label class="form-control w-full">
      <div class="label">
        <span class="label-text">Subnet (optional)</span>
        <span class="label-text-alt text-base-content/50">creates a NetBox prefix</span>
      </div>
      <input
        v-model.trim="form.prefix"
        type="text"
        class="input input-bordered font-net w-full"
        :class="{ 'input-error': prefixError }"
        placeholder="10.10.0.0/24"
      />
      <div v-if="prefixError" class="label">
        <span class="label-text-alt text-error">{{ prefixError }}</span>
      </div>
    </label>

    <label class="form-control w-full">
      <div class="label"><span class="label-text">Description</span></div>
      <input
        v-model.trim="form.description"
        type="text"
        class="input input-bordered w-full"
        placeholder="Red network video essence for Studio 1"
      />
    </label>

    <!-- Routing -->
    <section class="border-base-300 rounded-box border">
      <label class="flex cursor-pointer items-center gap-3 px-4 py-3">
        <input v-model="form.routing.enabled" type="checkbox" class="toggle toggle-primary toggle-sm" />
        <span>
          <span class="block font-medium">Routing</span>
          <span class="text-base-content/60 text-sm">Create an SVI so this subnet is routed.</span>
        </span>
      </label>

      <div v-if="form.routing.enabled" class="border-base-300 grid gap-4 border-t px-4 py-4">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Gateway / SVI address</span></div>
          <input
            v-model.trim="form.routing.gateway"
            type="text"
            class="input input-bordered font-net w-full"
            :class="{ 'input-error': gatewayError }"
            placeholder="10.10.0.1/24"
          />
          <div v-if="gatewayError" class="label">
            <span class="label-text-alt text-error">{{ gatewayError }}</span>
          </div>
        </label>

        <label class="flex cursor-pointer items-center gap-3">
          <input
            v-model="form.routing.hsrp!.enabled"
            type="checkbox"
            class="toggle toggle-sm"
          />
          <span class="text-sm">First-hop redundancy (HSRP/VRRP) across a switch pair</span>
        </label>

        <div v-if="form.routing.hsrp?.enabled" class="grid gap-4 sm:grid-cols-3">
          <label class="form-control w-full">
            <div class="label"><span class="label-text">Group</span></div>
            <input v-model.number="form.routing.hsrp!.group" type="number" min="0" class="input input-bordered w-full" />
          </label>
          <label class="form-control w-full">
            <div class="label"><span class="label-text">Virtual IP</span></div>
            <input v-model.trim="form.routing.hsrp!.virtual_ip" type="text" class="input input-bordered font-net w-full" placeholder="10.10.0.254" />
          </label>
          <label class="form-control w-full">
            <div class="label"><span class="label-text">Priority</span></div>
            <input v-model.number="form.routing.hsrp!.priority" type="number" min="0" max="255" class="input input-bordered w-full" />
          </label>
        </div>
      </div>
    </section>

    <!-- DHCP -->
    <section class="border-base-300 rounded-box border">
      <label class="flex cursor-pointer items-center gap-3 px-4 py-3">
        <input v-model="form.dhcp.enabled" type="checkbox" class="toggle toggle-primary toggle-sm" />
        <span>
          <span class="block font-medium">DHCP</span>
          <span class="text-base-content/60 text-sm">
            Relay to central servers, or hand out a pool from the switch.
          </span>
        </span>
      </label>

      <div v-if="form.dhcp.enabled" class="border-base-300 grid gap-4 border-t px-4 py-4">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Relay servers (helper addresses)</span></div>
          <input
            v-model="relayInput"
            type="text"
            class="input input-bordered font-net w-full"
            :class="{ 'input-error': relayError }"
            placeholder="10.0.10.5, 10.0.10.6"
          />
          <div v-if="relayError" class="label">
            <span class="label-text-alt text-error">{{ relayError }}</span>
          </div>
        </label>

        <div class="grid gap-4 sm:grid-cols-3">
          <label class="form-control w-full">
            <div class="label"><span class="label-text">Pool start</span></div>
            <input v-model.trim="form.dhcp.pool_start" type="text" class="input input-bordered font-net w-full" placeholder="10.10.0.100" />
          </label>
          <label class="form-control w-full">
            <div class="label"><span class="label-text">Pool end</span></div>
            <input v-model.trim="form.dhcp.pool_end" type="text" class="input input-bordered font-net w-full" placeholder="10.10.0.200" />
          </label>
          <label class="form-control w-full">
            <div class="label"><span class="label-text">Lease (seconds)</span></div>
            <input v-model.number="form.dhcp.lease_time" type="number" min="60" class="input input-bordered w-full" />
          </label>
        </div>
      </div>
    </section>

    <!-- Multicast -->
    <section class="border-base-300 rounded-box border">
      <label class="flex cursor-pointer items-center gap-3 px-4 py-3">
        <input v-model="form.multicast.enabled" type="checkbox" class="toggle toggle-primary toggle-sm" />
        <span>
          <span class="block font-medium">Multicast / IGMP</span>
          <span class="text-base-content/60 text-sm">
            Required for ST 2110, AES67 and Dante media flows.
          </span>
        </span>
      </label>

      <div v-if="form.multicast.enabled" class="border-base-300 grid gap-4 border-t px-4 py-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex cursor-pointer items-center gap-3">
            <input v-model="form.multicast.igmp_snooping" type="checkbox" class="toggle toggle-sm" />
            <span class="text-sm">IGMP snooping</span>
          </label>
          <label class="flex cursor-pointer items-center gap-3">
            <input v-model="form.multicast.querier" type="checkbox" class="toggle toggle-sm" />
            <span class="text-sm">IGMP querier on this VLAN</span>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="form-control w-full">
            <div class="label"><span class="label-text">IGMP version</span></div>
            <select v-model.number="form.multicast.igmp_version" class="select select-bordered w-full">
              <option :value="2">IGMPv2</option>
              <option :value="3">IGMPv3 (SSM)</option>
            </select>
          </label>

          <label class="form-control w-full">
            <div class="label"><span class="label-text">PIM mode</span></div>
            <select v-model="form.multicast.pim_mode" class="select select-bordered w-full">
              <option :value="null">No routing (L2 only)</option>
              <option value="sparse">Sparse (PIM-SM)</option>
              <option value="ssm">Source-specific (PIM-SSM)</option>
              <option value="dense">Dense (PIM-DM)</option>
            </select>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label v-if="form.multicast.pim_mode === 'sparse'" class="form-control w-full">
            <div class="label"><span class="label-text">Rendezvous point</span></div>
            <input v-model.trim="form.multicast.rendezvous_point" type="text" class="input input-bordered font-net w-full" placeholder="10.0.0.254" />
          </label>

          <label v-if="form.multicast.pim_mode === 'ssm'" class="form-control w-full">
            <div class="label"><span class="label-text">SSM group range</span></div>
            <input v-model.trim="form.multicast.ssm_range" type="text" class="input input-bordered font-net w-full" placeholder="232.0.0.0/8" />
          </label>
        </div>

        <div v-if="routingRequiredForMulticast" class="alert alert-warning py-2 text-sm">
          <span>
            PIM routes multicast between subnets, which needs an SVI. Enable routing above or set
            PIM mode to “No routing”.
          </span>
        </div>
      </div>
    </section>
  </form>
</template>
