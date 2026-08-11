/**
 * Authentication store.
 *
 * The auth provider is deliberately pluggable because the backend has not
 * settled on one yet. `VITE_AUTH_PROVIDER` (build time) or `BNC_AUTH_PROVIDER`
 * (runtime, in the container) selects the strategy:
 *
 *   - `dev`   — accepts any credentials locally, no backend call. Default
 *               while the backend has no auth at all.
 *   - `token` — POSTs to `/auth/login` and stores the returned bearer token.
 *   - `netbox`— the user supplies their own NetBox API token, which is passed
 *               straight through as the bearer token.
 *
 * Adding OIDC/SAML later means adding one branch to `login()` — nothing in
 * the views or router changes.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api'
import { ApiError, configureAuthTransport } from '@/api/http'
import { AUTH_PROVIDER, type AuthProviderName } from '@/config'
import type { LoginRequest, User } from '@/types/bnc'

export type AuthProvider = AuthProviderName

export { AUTH_PROVIDER }

const TOKEN_KEY = 'bnc.auth.token'
const USER_KEY = 'bnc.auth.user'

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(loadUser())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const roles = computed(() => user.value?.roles ?? [])
  /** Read-only users must not be offered write/push actions. */
  const canWrite = computed(
    () => roles.value.includes('operator') || roles.value.includes('admin'),
  )
  const displayName = computed(() => user.value?.display_name || user.value?.username || 'Unknown')

  function persistSession(nextToken: string | null, nextUser: User | null) {
    token.value = nextToken
    user.value = nextUser

    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken)
    else localStorage.removeItem(TOKEN_KEY)

    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    else localStorage.removeItem(USER_KEY)
  }

  async function login(credentials: LoginRequest): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      if (AUTH_PROVIDER === 'netbox') {
        // The password field carries the NetBox API token in this mode.
        if (!credentials.password) throw new ApiError('A NetBox API token is required', 400)
        persistSession(credentials.password, {
          username: credentials.username || 'netbox-token',
          display_name: credentials.username || 'NetBox Token',
          roles: ['operator'],
        })
        return true
      }

      const response = await authApi.login(credentials)
      persistSession(response.access_token, response.user)
      return true
    } catch (err) {
      error.value =
        err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.'
      persistSession(null, null)
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    if (AUTH_PROVIDER === 'token' && token.value) {
      // A failed logout must never trap the user in an authenticated shell.
      await authApi.logout().catch(() => undefined)
    }
    persistSession(null, null)
  }

  /** Called by the transport on a 401 so an expired session drops the user out. */
  function handleUnauthorized(): void {
    persistSession(null, null)
    error.value = 'Your session expired. Please sign in again.'
  }

  configureAuthTransport(() => token.value, handleUnauthorized)

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    roles,
    canWrite,
    displayName,
    provider: AUTH_PROVIDER,
    login,
    logout,
    handleUnauthorized,
  }
})
