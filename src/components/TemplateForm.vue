<script setup lang="ts">
/**
 * Editor for a broadcast switchport profile.
 *
 * Grouped the way an engineer reasons about a media port: what VLAN it is in,
 * how big the frames are, whether it carries PTP, and how multicast behaves.
 */
import { computed, reactive, watch } from 'vue'
import type { SwitchportTemplateCreate, TemplateKind } from '@/types/bnc'
import { useIpamStore } from '@/stores/ipam'

const props = defineProps<{ modelValue: SwitchportTemplateCreate; lockSlug?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [SwitchportTemplateCreate]; submit: [] }>()

const ipamStore = useIpamStore()

const form = reactive<SwitchportTemplateCreate>(structuredClone(props.modelValue))

watch(
  () => props.modelValue,
  (value) => Object.assign(form, structuredClone(value)),
)

watch(form, () => emit('update:modelValue', structuredClone(form)), { deep: true })

/** Derive a slug from the name until the user has typed one themselves. */
watch(
  () => form.name,
  (name) => {
    if (props.lockSlug) return
    const auto = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    form.slug = auto
  },
)

const KINDS: Array<{ value: TemplateKind; label: string }> = [
  { value: 'st2110', label: 'SMPTE ST 2110' },
  { value: 'aes67', label: 'AES67' },
  { value: 'dante', label: 'Dante' },
  { value: 'data', label: 'Data' },
  { value: 'uplink', label: 'Uplink / trunk' },
  { value: 'custom', label: 'Custom' },
]

const isTrunk = computed(() => form.mode === 'tagged' || form.mode === 'tagged-all')

/** A querier without snooping does nothing useful; warn rather than silently allow. */
const multicastWarning = computed(() =>
  form.multicast.querier && !form.multicast.igmp_snooping
    ? 'An IGMP querier without snooping will flood multicast to every port on the VLAN.'
    : null,
)

const ptpWarning = computed(() =>
  form.ptp.enabled && form.qos.ptp_dscp === null
    ? 'PTP is enabled but no DSCP is set for clock traffic; clock packets will not be prioritised.'
    : null,
)

const mtuWarning = computed(() =>
  form.kind === 'st2110' && (form.mtu ?? 0) < 9000
    ? 'ST 2110-20 video typically needs jumbo frames (MTU ≥ 9000).'
    : null,
)
</script>

<template>
  <form id="template-form" class="grid gap-6" @submit.prevent="emit('submit')">
    <section class="grid gap-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Template name</span></div>
          <input
            v-model.trim="form.name"
            type="text"
            required
            class="input input-bordered w-full"
            placeholder="Studio 1 ST 2110 camera"
          />
        </label>

        <label class="form-control w-full">
          <div class="label"><span class="label-text">Profile family</span></div>
          <select v-model="form.kind" class="select select-bordered w-full">
            <option v-for="kind in KINDS" :key="kind.value" :value="kind.value">
              {{ kind.label }}
            </option>
          </select>
        </label>
      </div>

      <label class="form-control w-full">
        <div class="label"><span class="label-text">Slug</span></div>
        <input
          v-model.trim="form.slug"
          type="text"
          :disabled="lockSlug"
          class="input input-bordered font-net w-full"
          placeholder="studio-1-st2110-camera"
        />
        <div class="label">
          <span class="label-text-alt text-base-content/50">
            Stable identifier used when applying the template to ports.
          </span>
        </div>
      </label>

      <label class="form-control w-full">
        <div class="label"><span class="label-text">Description</span></div>
        <textarea
          v-model.trim="form.description"
          rows="2"
          class="textarea textarea-bordered w-full"
          placeholder="What this port profile is for"
        />
      </label>
    </section>

    <div class="divider my-0 text-xs uppercase tracking-wide opacity-60">Layer 2</div>

    <section class="grid gap-4 sm:grid-cols-3">
      <label class="form-control w-full">
        <div class="label"><span class="label-text">Port mode</span></div>
        <select v-model="form.mode" class="select select-bordered w-full">
          <option value="access">Access</option>
          <option value="tagged">Tagged (trunk)</option>
          <option value="tagged-all">Tagged all</option>
          <option value="routed">Routed (L3)</option>
        </select>
      </label>

      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">{{ isTrunk ? 'Native VLAN' : 'Access VLAN' }}</span>
        </div>
        <select v-model.number="form.untagged_vlan" class="select select-bordered w-full">
          <option :value="null">Assign per port</option>
          <option v-for="vlan in ipamStore.visibleVlans" :key="vlan.id" :value="vlan.id">
            {{ vlan.vid }} — {{ vlan.name }}
          </option>
        </select>
      </label>

      <label class="form-control w-full">
        <div class="label"><span class="label-text">MTU</span></div>
        <input
          v-model.number="form.mtu"
          type="number"
          min="1500"
          max="9216"
          class="input input-bordered w-full"
        />
      </label>
    </section>

    <div v-if="mtuWarning" class="alert alert-warning py-2 text-sm">
      <span>{{ mtuWarning }}</span>
    </div>

    <label class="flex cursor-pointer items-center gap-3">
      <input v-model="form.enabled" type="checkbox" class="toggle toggle-primary toggle-sm" />
      <span class="text-sm">Bring the port up when this template is applied</span>
    </label>

    <div class="divider my-0 text-xs uppercase tracking-wide opacity-60">Quality of service</div>

    <section class="grid gap-4 sm:grid-cols-3">
      <label class="form-control w-full">
        <div class="label"><span class="label-text">Trust mode</span></div>
        <select v-model="form.qos.trust_mode" class="select select-bordered w-full">
          <option value="dscp">Trust DSCP</option>
          <option value="cos">Trust CoS</option>
          <option value="none">Untrusted</option>
        </select>
      </label>

      <label class="form-control w-full">
        <div class="label"><span class="label-text">Media DSCP</span></div>
        <input
          v-model.number="form.qos.media_dscp"
          type="number"
          min="0"
          max="63"
          class="input input-bordered w-full"
        />
      </label>

      <label class="form-control w-full">
        <div class="label"><span class="label-text">Clock (PTP) DSCP</span></div>
        <input
          v-model.number="form.qos.ptp_dscp"
          type="number"
          min="0"
          max="63"
          class="input input-bordered w-full"
        />
      </label>
    </section>

    <div class="divider my-0 text-xs uppercase tracking-wide opacity-60">PTP / clocking</div>

    <section class="grid gap-4">
      <label class="flex cursor-pointer items-center gap-3">
        <input v-model="form.ptp.enabled" type="checkbox" class="toggle toggle-primary toggle-sm" />
        <span class="text-sm">Enable PTP (IEEE 1588) on this port</span>
      </label>

      <div v-if="form.ptp.enabled" class="grid gap-4 sm:grid-cols-4">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Profile</span></div>
          <select v-model="form.ptp.profile" class="select select-bordered w-full">
            <option value="smpte-2059-2">SMPTE 2059-2</option>
            <option value="aes67">AES67</option>
            <option value="default">IEEE 1588 default</option>
          </select>
        </label>

        <label class="form-control w-full">
          <div class="label"><span class="label-text">Announce (log2 s)</span></div>
          <input v-model.number="form.ptp.announce_interval" type="number" min="-4" max="4" class="input input-bordered w-full" />
        </label>

        <label class="form-control w-full">
          <div class="label"><span class="label-text">Sync (log2 s)</span></div>
          <input v-model.number="form.ptp.sync_interval" type="number" min="-4" max="4" class="input input-bordered w-full" />
        </label>

        <label class="form-control w-full">
          <div class="label"><span class="label-text">Delay-req (log2 s)</span></div>
          <input v-model.number="form.ptp.delay_req_interval" type="number" min="-4" max="4" class="input input-bordered w-full" />
        </label>
      </div>

      <div v-if="ptpWarning" class="alert alert-warning py-2 text-sm">
        <span>{{ ptpWarning }}</span>
      </div>
    </section>

    <div class="divider my-0 text-xs uppercase tracking-wide opacity-60">Multicast</div>

    <section class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="flex cursor-pointer items-center gap-3">
          <input v-model="form.multicast.igmp_snooping" type="checkbox" class="toggle toggle-primary toggle-sm" />
          <span class="text-sm">IGMP snooping</span>
        </label>
        <label class="flex cursor-pointer items-center gap-3">
          <input v-model="form.multicast.querier" type="checkbox" class="toggle toggle-primary toggle-sm" />
          <span class="text-sm">Act as IGMP querier</span>
        </label>
        <label class="flex cursor-pointer items-center gap-3">
          <input v-model="form.multicast.block_unknown" type="checkbox" class="toggle toggle-primary toggle-sm" />
          <span class="text-sm">Block unknown multicast</span>
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
          <div class="label"><span class="label-text">Max multicast groups</span></div>
          <input
            v-model.number="form.multicast.max_groups"
            type="number"
            min="0"
            class="input input-bordered w-full"
            placeholder="unlimited"
          />
        </label>
      </div>

      <div v-if="multicastWarning" class="alert alert-warning py-2 text-sm">
        <span>{{ multicastWarning }}</span>
      </div>
    </section>

    <div class="divider my-0 text-xs uppercase tracking-wide opacity-60">Protection</div>

    <section class="grid gap-4 sm:grid-cols-3">
      <label class="flex cursor-pointer items-center gap-3">
        <input v-model="form.security.portfast" type="checkbox" class="toggle toggle-primary toggle-sm" />
        <span class="text-sm">Portfast / edge port</span>
      </label>
      <label class="flex cursor-pointer items-center gap-3">
        <input v-model="form.security.bpdu_guard" type="checkbox" class="toggle toggle-primary toggle-sm" />
        <span class="text-sm">BPDU guard</span>
      </label>
      <label class="form-control w-full">
        <div class="label"><span class="label-text">Storm control (pps)</span></div>
        <input
          v-model.number="form.security.storm_control_pps"
          type="number"
          min="0"
          class="input input-bordered w-full"
          placeholder="disabled"
        />
      </label>
    </section>
  </form>
</template>
