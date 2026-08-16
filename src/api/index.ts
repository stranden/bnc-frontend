/**
 * Typed API surface for the BNC backend.
 *
 * Endpoints annotated `backend: pending` do not exist upstream yet — calling
 * them will simply fail with a normal HTTP error until the backend
 * implements them. The signatures are the contract the backend is expected
 * to implement.
 */
import { http } from './http'
import type {
  ApplyTemplatesRequest,
  ApplyTemplatesResult,
  Device,
  DeviceCreate,
  DeviceInterface,
  DeviceType,
  DeviceUpdate,
  IPAddress,
  LoginRequest,
  LoginResponse,
  NetworkTemplate,
  Site,
  User,
  Vlan,
  VlanCreate,
  VlanUpdate,
} from '@/types/bnc'

export const authApi = {
  /** backend: pending — auth provider is not chosen yet. */
  login: (credentials: LoginRequest) =>
    http.post<LoginResponse>('/auth/login', credentials, { anonymous: true }),
  logout: () => http.post<{ status: string }>('/auth/logout'),
  me: () => http.get<User>('/auth/me'),
}

export const sitesApi = {
  /** backend: exists — GET /sites */
  list: () => http.get<Site[]>('/sites'),
  get: (id: number) => http.get<Site>(`/sites/${id}`),
}

export const devicesApi = {
  /** backend: exists — GET /devices */
  list: (siteId?: number | null) =>
    http.get<Device[]>('/devices', { query: { site_id: siteId ?? undefined } }),
  get: (id: number) => http.get<Device>(`/devices/${id}`),
  /** backend: pending */
  create: (payload: DeviceCreate) => http.post<Device>('/devices', payload),
  /** backend: pending */
  update: (id: number, payload: DeviceUpdate) => http.patch<Device>(`/devices/${id}`, payload),
  /** backend: pending */
  remove: (id: number) => http.delete<void>(`/devices/${id}`),
}

export const deviceTypesApi = {
  /** backend: exists — GET /device-types */
  list: () => http.get<DeviceType[]>('/device-types'),
}

export const interfacesApi = {
  /** backend: pending */
  listForDevice: (deviceId: number) =>
    http.get<DeviceInterface[]>('/interfaces', { query: { device_id: deviceId } }),
  /** backend: pending */
  update: (id: number, payload: Partial<DeviceInterface>) =>
    http.patch<DeviceInterface>(`/interfaces/${id}`, payload),
  /** backend: pending — pushes template config to the device via Nornir/NAPALM. */
  applyTemplates: (payload: ApplyTemplatesRequest) =>
    http.post<ApplyTemplatesResult>('/interfaces/apply-templates', payload),
}

export const templatesApi = {
  /** backend: exists — GET /templates. Read-only network templates (aes67, dante, data, smpte-2110). */
  list: () => http.get<NetworkTemplate[]>('/templates'),
  get: (slug: string) => http.get<NetworkTemplate>(`/templates/${slug}`),
}

export const vlansApi = {
  /** backend: exists — GET /vlans?site_id= */
  list: (siteId: number) => http.get<Vlan[]>('/vlans', { query: { site_id: siteId } }),
  get: (vid: number, siteId: number) =>
    http.get<Vlan>(`/vlans/${vid}`, { query: { site_id: siteId } }),
  /** backend: exists — POST /vlans */
  create: (payload: VlanCreate) => http.post<Vlan>('/vlans', payload),
  /** backend: exists — PATCH /vlans/{vid} */
  update: (vid: number, payload: VlanUpdate) => http.patch<Vlan>(`/vlans/${vid}`, payload),
  /** backend: exists — DELETE /vlans/{vid}?site_id= */
  remove: (vid: number, siteId: number) =>
    http.delete<void>(`/vlans/${vid}`, { query: { site_id: siteId } }),
}

export const ipAddressesApi = {
  /** backend: pending */
  list: () => http.get<IPAddress[]>('/ip-addresses'),
}

export const healthApi = {
  live: () => http.get<{ status: string }>('/healthz'),
  ready: () => http.get<{ status: string }>('/readyz'),
}
