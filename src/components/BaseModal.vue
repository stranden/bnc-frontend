<script setup lang="ts">
/**
 * Reusable modal built on the native <dialog> element so Escape, focus
 * trapping and the backdrop come for free.
 */
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    size?: 'md' | 'lg' | 'xl'
  }>(),
  { size: 'md' },
)

const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open) dialog.value?.showModal()
    else dialog.value?.close()
  },
)

const widthClass = {
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}
</script>

<template>
  <dialog ref="dialog" class="modal" @close="emit('close')">
    <div class="modal-box w-11/12 p-0" :class="widthClass[props.size]">
      <header class="border-base-300 flex items-start justify-between gap-4 border-b px-6 py-4">
        <div>
          <h3 class="text-lg font-semibold">{{ title }}</h3>
          <p v-if="subtitle" class="text-base-content/60 text-sm">{{ subtitle }}</p>
        </div>
        <button class="btn btn-sm btn-ghost btn-circle" aria-label="Close" @click="emit('close')">
          ✕
        </button>
      </header>

      <div class="max-h-[70vh] overflow-y-auto px-6 py-5">
        <slot />
      </div>

      <footer
        v-if="$slots.actions"
        class="border-base-300 bg-base-200/40 flex justify-end gap-2 border-t px-6 py-4"
      >
        <slot name="actions" />
      </footer>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="emit('close')">close</button>
    </form>
  </dialog>
</template>
