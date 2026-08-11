<script setup lang="ts">
/** Small status pill used for NetBox status values and link states. */
import { computed } from 'vue'

const props = defineProps<{
  status?: string | null
  size?: 'xs' | 'sm' | 'md'
}>()

const STATUS_CLASS: Record<string, string> = {
  active: 'badge-success',
  up: 'badge-success',
  planned: 'badge-info',
  staging: 'badge-warning',
  offline: 'badge-error',
  down: 'badge-ghost',
  deprecated: 'badge-error',
  unknown: 'badge-ghost',
}

const badgeClass = computed(() => STATUS_CLASS[props.status ?? 'unknown'] ?? 'badge-ghost')
const sizeClass = computed(() => `badge-${props.size ?? 'sm'}`)
</script>

<template>
  <span class="badge badge-soft capitalize" :class="[badgeClass, sizeClass]">
    {{ status ?? 'unknown' }}
  </span>
</template>
