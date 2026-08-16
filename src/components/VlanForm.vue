<script setup lang="ts">
/**
 * VLAN create/edit form.
 *
 * Matches the backend's flat VLAN model: a VID + name at a site, an
 * optional description, and an optional network template tag (AES67,
 * Dante, Data, SMPTE 2110, ...).
 */
import { computed, reactive, watch } from 'vue'
import type { VlanCreate } from '@/types/bnc'
import { useIpamStore } from '@/stores/ipam'
import { useSiteStore } from '@/stores/site'
import { useTemplateStore } from '@/stores/templates'

const props = defineProps<{ modelValue: VlanCreate }>()
const emit = defineEmits<{ 'update:modelValue': [VlanCreate]; submit: [] }>()

const ipamStore = useIpamStore()
const siteStore = useSiteStore()
const templateStore = useTemplateStore()

const form = reactive<VlanCreate>(structuredClone(props.modelValue))

watch(
  () => props.modelValue,
  (value) => Object.assign(form, structuredClone(value)),
)

watch(form, () => emit('update:modelValue', structuredClone(form)), { deep: true })

const vidError = computed(() => {
  if (form.vid < 1 || form.vid > 4094) return 'VLAN ID must be between 1 and 4094.'
  if (ipamStore.usedVids.has(form.vid)) return `VLAN ${form.vid} already exists at this site.`
  return null
})

const valid = computed(() => Boolean(form.name && form.site_id) && !vidError.value)

defineExpose({ valid })

function submit() {
  if (!valid.value) return
  emit('submit')
}
</script>

<template>
  <form id="vlan-form" class="grid gap-4" @submit.prevent="submit">
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

    <label class="form-control w-full">
      <div class="label"><span class="label-text">Site</span></div>
      <select v-model.number="form.site_id" required class="select select-bordered w-full">
        <option :value="0" disabled>Select a site</option>
        <option v-for="site in siteStore.sites" :key="site.id" :value="site.id">
          {{ site.name }}
        </option>
      </select>
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

    <label class="form-control w-full">
      <div class="label">
        <span class="label-text">Network template</span>
        <span class="label-text-alt text-base-content/50">tags the VLAN's traffic class</span>
      </div>
      <select v-model="form.template" class="select select-bordered w-full">
        <option :value="null">No template</option>
        <option v-for="template in templateStore.templates" :key="template.slug" :value="template.slug">
          {{ template.name }}
        </option>
      </select>
    </label>
  </form>
</template>
