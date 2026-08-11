/**
 * Typed API surface for the BNC backend.
 *
 * Endpoints annotated `backend: pending` do not exist upstream yet and are
 * served by the mock transport (see `api/mock`). The signatures are the
 * contract the backend is expected to implement.
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
  Prefix,
  Site,
  SwitchportTemplate,
  SwitchportTemplateCreate,
  User,
  VLAN,
  VLANGroup,
  VlanProvisionRequest,
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
  /** backend: pending — BNC-owned switchport profiles. */
  list: () => http.get<SwitchportTemplate[]>('/switchport-templates'),
  get: (slug: string) => http.get<SwitchportTemplate>(`/switchport-templates/${slug}`),
  create: (payload: SwitchportTemplateCreate) =>
    http.post<SwitchportTemplate>('/switchport-templates', payload),
  update: (slug: string, payload: Partial<SwitchportTemplate>) =>
    http.patch<SwitchportTemplate>(`/switchport-templates/${slug}`, payload),
  remove: (slug: string) => http.delete<void>(`/switchport-templates/${slug}`),
}

export const vlansApi = {
  /** backend: exists — GET /vlans */
  list: (siteId?: number | null) =>
    http.get<VLAN[]>('/vlans', { query: { site_id: siteId ?? undefined } }),
  /** backend: pending — provisions VLAN + prefix + routing/DHCP/multicast. */
  provision: (payload: VlanProvisionRequest) => http.post<VLAN>('/vlans', payload),
  remove: (id: number) => http.delete<void>(`/vlans/${id}`),
}

export const vlanGroupsApi = {
  /** backend: exists — GET /vlan-groups */
  list: () => http.get<VLANGroup[]>('/vlan-groups'),
}

export const prefixesApi = {
  /** backend: exists — GET /prefixes */
  list: (siteId?: number | null) =>
    http.get<Prefix[]>('/prefixes', { query: { site_id: siteId ?? undefined } }),
}

export const ipAddressesApi = {
  /** backend: exists — GET /ip-addresses */
  list: () => http.get<IPAddress[]>('/ip-addresses'),
}

export const healthApi = {
  live: () => http.get<{ status: string }>('/healthz'),
  ready: () => http.get<{ status: string }>('/readyz'),
}
