<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="bg-base-200 grid min-h-screen place-items-center p-6 text-center">
    <div>
      <p class="text-6xl font-bold opacity-20">404</p>
      <h1 class="mt-4 text-xl font-semibold">Page not found</h1>
      <p class="text-base-content/60 mt-2 text-sm">
        The page you were looking for does not exist in BNC.
      </p>
      <RouterLink :to="{ name: 'dashboard' }" class="btn btn-primary btn-sm mt-6">
        Back to overview
      </RouterLink>
    </div>
  </div>
</template>
