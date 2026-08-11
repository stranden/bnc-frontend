<script setup lang="ts">
/**
 * Login page.
 *
 * The authentication method for BNC is still undecided, so this view adapts
 * to whichever provider `VITE_AUTH_PROVIDER` selects (see stores/auth.ts).
 * The form itself does not change when a real provider is wired up.
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AUTH_PROVIDER, useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const showPassword = ref(false)

const isNetboxToken = computed(() => AUTH_PROVIDER === 'netbox')

const secretLabel = computed(() => (isNetboxToken.value ? 'NetBox API token' : 'Password'))
const secretPlaceholder = computed(() =>
  isNetboxToken.value ? '0123456789abcdef0123456789abcdef01234567' : '••••••••',
)

const providerNote = computed(() => {
  switch (AUTH_PROVIDER) {
    case 'netbox':
      return 'Sign in with your personal NetBox API token. BNC acts on your behalf against NetBox.'
    case 'token':
      return 'Credentials are verified by the BNC backend, which returns a bearer token.'
    default:
      return 'Development mode: any username with a password of at least 3 characters is accepted.'
  }
})

async function submit() {
  const ok = await auth.login({ username: username.value, password: password.value })
  if (!ok) return

  const redirect = route.query.redirect
  router.push(typeof redirect === 'string' ? redirect : { name: 'dashboard' })
}
</script>

<template>
  <div class="bg-base-200 grid min-h-screen place-items-center p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <div
          class="bg-primary text-primary-content mx-auto grid size-14 place-items-center rounded-2xl text-2xl font-bold"
        >
          B
        </div>
        <h1 class="mt-4 text-2xl font-semibold tracking-tight">Broadcast Network Controller</h1>
        <p class="text-base-content/60 mt-1 text-sm">
          NetBox-backed control plane for broadcast networks
        </p>
      </div>

      <div class="card bg-base-100 border-base-300 border shadow-xl">
        <form class="card-body gap-4" @submit.prevent="submit">
          <div v-if="auth.error" class="alert alert-error text-sm" role="alert">
            <span>{{ auth.error }}</span>
          </div>

          <label class="form-control w-full">
            <div class="label">
              <span class="label-text">Username</span>
            </div>
            <input
              v-model.trim="username"
              type="text"
              autocomplete="username"
              required
              class="input input-bordered w-full"
              placeholder="j.doe"
            />
          </label>

          <label class="form-control w-full">
            <div class="label">
              <span class="label-text">{{ secretLabel }}</span>
            </div>
            <div class="join w-full">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="isNetboxToken ? 'off' : 'current-password'"
                required
                class="input input-bordered join-item w-full"
                :class="{ 'font-net': isNetboxToken }"
                :placeholder="secretPlaceholder"
              />
              <button
                type="button"
                class="btn btn-outline join-item"
                :aria-label="showPassword ? 'Hide' : 'Show'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '🙈' : '👁' }}
              </button>
            </div>
          </label>

          <button type="submit" class="btn btn-primary w-full" :disabled="auth.loading">
            <span v-if="auth.loading" class="loading loading-spinner loading-sm" />
            {{ auth.loading ? 'Signing in…' : 'Sign in' }}
          </button>

          <p class="text-base-content/50 text-center text-xs">{{ providerNote }}</p>
        </form>
      </div>

      <p class="text-base-content/40 mt-6 text-center text-xs">
        Auth provider: <code>{{ AUTH_PROVIDER }}</code> — configurable via
        <code>VITE_AUTH_PROVIDER</code>
      </p>
    </div>
  </div>
</template>
