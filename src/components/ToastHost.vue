<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toasts = useToastStore()

const alertClass: Record<string, string> = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
  warning: 'alert-warning',
}
</script>

<template>
  <div class="toast toast-end toast-bottom z-50 max-w-md">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts.toasts"
        :key="toast.id"
        class="alert shadow-lg"
        :class="alertClass[toast.kind]"
        role="status"
      >
        <div class="min-w-0">
          <p class="font-medium break-words">{{ toast.message }}</p>
          <p v-if="toast.detail" class="text-xs opacity-80 break-words">{{ toast.detail }}</p>
        </div>
        <button class="btn btn-ghost btn-xs" aria-label="Dismiss" @click="toasts.dismiss(toast.id)">
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
