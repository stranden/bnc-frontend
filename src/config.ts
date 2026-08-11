/**
 * Application configuration.
 *
 * Vite inlines `import.meta.env` at build time, which would mean rebuilding
 * the image for every environment. To avoid that, the container writes a
 * `/config.js` at startup that sets `window.__BNC_CONFIG__`, and those values
 * take precedence over the build-time defaults.
 *
 * Order of precedence: runtime `/config.js` → build-time `.env` → fallback.
 */

export interface RuntimeConfig {
  apiBaseUrl?: string
  useMock?: boolean | string
  mockUnimplemented?: boolean | string
  mockLatency?: number | string
  mockSingleSite?: boolean | string
  authProvider?: string
}

declare global {
  interface Window {
    __BNC_CONFIG__?: RuntimeConfig
  }
}

const runtime: RuntimeConfig = (typeof window !== 'undefined' && window.__BNC_CONFIG__) || {}

/** Unsubstituted `${VAR}` placeholders count as "not set". */
function isUnset(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (typeof value === 'string' && /^\$\{.*\}$/.test(value))
  )
}

function str(runtimeValue: unknown, buildValue: unknown, fallback: string): string {
  if (!isUnset(runtimeValue)) return String(runtimeValue)
  if (!isUnset(buildValue)) return String(buildValue)
  return fallback
}

function bool(runtimeValue: unknown, buildValue: unknown, fallback: boolean): boolean {
  const value = str(runtimeValue, buildValue, String(fallback)).toLowerCase()
  return value === 'true' || value === '1' || value === 'yes'
}

function num(runtimeValue: unknown, buildValue: unknown, fallback: number): number {
  const parsed = Number(str(runtimeValue, buildValue, String(fallback)))
  return Number.isFinite(parsed) ? parsed : fallback
}

export type AuthProviderName = 'dev' | 'token' | 'netbox'

/** Base URL for BNC backend calls. `/api` is proxied by nginx in the container. */
export const API_BASE_URL = str(
  runtime.apiBaseUrl,
  import.meta.env.VITE_API_BASE_URL,
  '/api',
).replace(/\/$/, '')

/** Serve every request from the built-in mock transport. */
export const USE_MOCK = bool(runtime.useMock, import.meta.env.VITE_USE_MOCK, true)

/** Keep mocking endpoints the backend has not implemented yet. */
export const MOCK_UNIMPLEMENTED = bool(
  runtime.mockUnimplemented,
  import.meta.env.VITE_MOCK_UNIMPLEMENTED,
  true,
)

/** Artificial latency for the mock transport, so loading states are visible. */
export const MOCK_LATENCY = num(runtime.mockLatency, import.meta.env.VITE_MOCK_LATENCY, 220)

/** Seed a single site, to exercise the auto-select-default-site behaviour. */
export const MOCK_SINGLE_SITE = bool(
  runtime.mockSingleSite,
  import.meta.env.VITE_MOCK_SINGLE_SITE,
  false,
)

export const AUTH_PROVIDER = str(
  runtime.authProvider,
  import.meta.env.VITE_AUTH_PROVIDER,
  'dev',
) as AuthProviderName
