<script setup lang="ts">
/**
 * Site switcher shown in the top bar.
 *
 * When the backend returns a single site there is nothing to switch between,
 * so it renders as a static label instead of a dropdown.
 */
import { useSiteStore } from '@/stores/site'

const siteStore = useSiteStore()

</script>

<template>
  <RouterLink class="btn btn-sm btn-ghost gap-2" :to="{ name: 'sites' }">
    <span class="text-base-content/50">Site</span>
    <span class="font-medium">
      {{ siteStore.activeSite?.name ?? 'Select a site' }}
    </span>
  </RouterLink>
</template>
