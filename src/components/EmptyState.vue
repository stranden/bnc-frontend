<script setup lang="ts">
/** Placeholder shown when a list has no rows, or an error/loading state. */
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <span class="text-4xl opacity-40">{{ icon ?? '◍' }}</span>
    <div>
      <p class="font-medium">{{ title }}</p>
      <p v-if="description" class="text-base-content/60 mt-1 max-w-md text-sm">
        {{ description }}
      </p>
    </div>
    <slot />
  </div>
</template>
