<script setup lang="ts">
import { onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { templateBadgeClass, useTemplateStore } from '@/stores/templates'

const templateStore = useTemplateStore()

onMounted(() => templateStore.fetchTemplates())
</script>

<template>
  <div>
    <PageHeader
      title="Network templates"
      description="Broadcast traffic classes maintained by the BNC backend. Tag a VLAN with one of these to describe what it carries."
    >
      <template #actions>
        <button
          class="btn btn-sm btn-outline"
          :disabled="templateStore.loading"
          @click="templateStore.fetchTemplates(true)"
        >
          <span v-if="templateStore.loading" class="loading loading-spinner loading-xs" />
          Refresh
        </button>
      </template>
    </PageHeader>

    <div v-if="templateStore.error" class="alert alert-error mb-4">
      <span>{{ templateStore.error }}</span>
    </div>

    <div v-if="templateStore.loading && !templateStore.templates.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="n in 3" :key="n" class="card bg-base-100 border-base-300 border">
        <div class="card-body gap-3">
          <div class="skeleton h-5 w-2/3" />
          <div class="skeleton h-10 w-full" />
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="!templateStore.templates.length"
      icon="⛭"
      title="No templates"
      description="The backend has not registered any network templates yet."
    />

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="template in templateStore.templates"
        :key="template.slug"
        class="card bg-base-100 border-base-300 border"
      >
        <div class="card-body gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate font-semibold">{{ template.name }}</h2>
              <p class="text-base-content/50 font-net truncate text-xs">{{ template.slug }}</p>
            </div>
            <span class="badge badge-sm" :class="templateBadgeClass(template.slug)">
              {{ template.slug }}
            </span>
          </div>

          <p v-if="template.description" class="text-base-content/60 text-sm">
            {{ template.description }}
          </p>
        </div>
      </article>
    </div>
  </div>
</template>
