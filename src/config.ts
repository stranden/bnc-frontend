/**
 * Application configuration.
 *
 * Values come from `.env` at build time, falling back to sensible defaults
 * if not set. Inject different values by providing a `.env` file (or
 * `VITE_*` build args) per environment.
 */

export type AuthProviderName = 'dev' | 'token' | 'netbox'

function str(buildValue: unknown, fallback: string): string {
  return buildValue === undefined || buildValue === '' ? fallback : String(buildValue)
}

function bool(buildValue: unknown, fallback: boolean): boolean {
  if (buildValue === undefined || buildValue === '') return fallback
  const value = String(buildValue).toLowerCase()
  return value === 'true' || value === '1' || value === 'yes'
}

function num(buildValue: unknown, fallback: number): number {
  const parsed = Number(buildValue)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Base URL for BNC backend calls. `/api` is proxied by nginx in the container. */
export const API_BASE_URL = str(import.meta.env.VITE_API_BASE_URL, '/api').replace(/\/$/, '')

/** Serve every request from the built-in mock transport. */
export const USE_MOCK = bool(import.meta.env.VITE_USE_MOCK, true)

/** Artificial latency for the mock transport, so loading states are visible. */
export const MOCK_LATENCY = num(import.meta.env.VITE_MOCK_LATENCY, 220)

/** Seed a single site, to exercise the auto-select-default-site behaviour. */
export const MOCK_SINGLE_SITE = bool(import.meta.env.VITE_MOCK_SINGLE_SITE, false)

export const AUTH_PROVIDER = str(import.meta.env.VITE_AUTH_PROVIDER, 'dev') as AuthProviderName
