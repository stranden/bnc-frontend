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

export const AUTH_PROVIDER = str(import.meta.env.VITE_AUTH_PROVIDER, 'dev') as AuthProviderName
