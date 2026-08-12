/**
 * HTTP transport for the BNC backend.
 *
 * The backend is still read-only (it only exposes list endpoints for the
 * NetBox objects tagged `external-ctrl: bnc`). Everything else the UI needs —
 * device CRUD, interfaces, switchport templates, VLAN provisioning — is
 * routed through the mock transport until the backend grows those endpoints.
 *
 * Set `USE_MOCK` to false (build-time `VITE_USE_MOCK`) once the backend is
 * complete; no component code changes. Endpoints the backend still doesn't
 * implement are listed explicitly in `api/mock` (`MOCKED_WRITE_ENDPOINTS`)
 * and stay mocked even when `USE_MOCK` is false.
 */
import { API_BASE_URL, USE_MOCK } from '@/config'
import { handleMock, isMockedEndpoint } from './mock'

export { API_BASE_URL, USE_MOCK }

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export class ApiError extends Error {
  readonly status: number
  readonly detail?: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  signal?: AbortSignal
  /** Skip attaching the bearer token (used by the login call itself). */
  anonymous?: boolean
}

type TokenReader = () => string | null
type UnauthorizedHandler = () => void

let readToken: TokenReader = () => null
let onUnauthorized: UnauthorizedHandler = () => {}

/** Wired up by the auth store so the transport stays free of store imports. */
export function configureAuthTransport(reader: TokenReader, unauthorized: UnauthorizedHandler) {
  readToken = reader
  onUnauthorized = unauthorized
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue
    params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function parseError(response: Response): Promise<ApiError> {
  let detail: unknown
  let message = `${response.status} ${response.statusText}`
  try {
    const data = await response.json()
    detail = data
    if (typeof data?.detail === 'string') message = data.detail
    else if (Array.isArray(data?.detail)) {
      // FastAPI validation errors.
      message = data.detail
        .map((e: { loc?: unknown[]; msg?: string }) => `${e.loc?.slice(1).join('.')}: ${e.msg}`)
        .join('; ')
    }
  } catch {
    /* response had no JSON body */
  }
  return new ApiError(message, response.status, detail)
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (USE_MOCK || isMockedEndpoint(method, path)) {
    return handleMock<T>(method, path, options)
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const token = options.anonymous ? null : readToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })

  if (response.status === 401) {
    onUnauthorized()
    throw await parseError(response)
  }
  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
