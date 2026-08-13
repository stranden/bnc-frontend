/**
 * UI store.
 *
 * Holds cross-cutting UI state that should survive navigation and page
 * reloads, such as whether the app drawer is expanded or collapsed.
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const DRAWER_OPEN_KEY = 'bnc.ui.drawerOpen'

function readStoredDrawerOpen(): boolean {
  const stored = localStorage.getItem(DRAWER_OPEN_KEY)
  if (stored === null) return true
  return stored === 'true'
}

export const useUiStore = defineStore('ui', () => {
  const drawerOpen = ref(readStoredDrawerOpen())

  watch(drawerOpen, (value) => {
    localStorage.setItem(DRAWER_OPEN_KEY, String(value))
  })

  return {
    drawerOpen,
  }
})
