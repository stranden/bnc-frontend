import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  /** Optional detail line, e.g. the backend error body. */
  detail?: string
}

let nextToastId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(kind: ToastKind, message: string, detail?: string): number {
    const id = nextToastId++
    toasts.value.push({ id, kind, message, detail })
    // Errors stay longer since they usually need reading.
    setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4000)
    return id
  }

  return {
    toasts,
    push,
    dismiss,
    success: (message: string, detail?: string) => push('success', message, detail),
    error: (message: string, detail?: string) => push('error', message, detail),
    info: (message: string, detail?: string) => push('info', message, detail),
    warning: (message: string, detail?: string) => push('warning', message, detail),
  }
})
