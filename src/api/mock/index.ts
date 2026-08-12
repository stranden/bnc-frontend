/**
 * Mock transport.
 *
 * Every route here mirrors the contract the BNC backend is expected to
 * expose. Routes marked "backend: exists" are already implemented upstream
 * (read-only list endpoints); the rest are the write/push endpoints the UI
 * needs and the backend will grow.
 */
import type {
  ApplyTemplatesRequest,
  ApplyTemplatesResult,
  Device,
  DeviceCreate,
  DeviceInterface,
  DeviceUpdate,
  LoginRequest,
  LoginResponse,
  Prefix,
  SwitchportTemplate,
  SwitchportTemplateCreate,
  VLAN,
  VlanProvisionRequest,
} from '@/types/bnc'
import { MOCK_LATENCY } from '@/config'
import { ApiError, type HttpMethod, type RequestOptions } from '../http'
import { getDb, nextId, persist, resetDb } from './db'

/** Artificial latency so loading states are visible during development. */
const LATENCY_MS = MOCK_LATENCY

const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Explicit 204 marker. Handlers must not return a bare `undefined` for a
 * successful delete, otherwise the dispatcher would fall through and keep
 * trying the remaining handlers after the mutation has already been applied.
 */
const NO_CONTENT = Symbol('no-content')

/**
 * Endpoints the real backend has not implemented yet — always served by the
 * mock, even when `USE_MOCK` is false. Kept in sync with the `backend:
 * pending` annotations in `src/api/index.ts`; move an entry out of this list
 * once the matching endpoint ships upstream.
 */
export const MOCKED_WRITE_ENDPOINTS: Array<[HttpMethod, RegExp]> = [
  // Auth — provider not chosen yet.
  ['POST', /^\/auth\/login$/],
  ['POST', /^\/auth\/logout$/],
  ['GET', /^\/auth\/me$/],
  // Devices — list/get exist upstream, writes do not.
  ['POST', /^\/devices$/],
  ['PATCH', /^\/devices\/\d+$/],
  ['PUT', /^\/devices\/\d+$/],
  ['DELETE', /^\/devices\/\d+$/],
  // Interfaces — nothing implemented upstream yet.
  ['GET', /^\/interfaces$/],
  ['PATCH', /^\/interfaces\/\d+$/],
  ['PUT', /^\/interfaces\/\d+$/],
  ['POST', /^\/interfaces\/apply-templates$/],
  // Switchport templates — BNC-owned, nothing upstream yet.
  ['GET', /^\/switchport-templates$/],
  ['POST', /^\/switchport-templates$/],
  ['GET', /^\/switchport-templates\/[^/]+$/],
  ['PATCH', /^\/switchport-templates\/[^/]+$/],
  ['PUT', /^\/switchport-templates\/[^/]+$/],
  ['DELETE', /^\/switchport-templates\/[^/]+$/],
  // VLANs — list exists upstream, provisioning/removal do not.
  ['POST', /^\/vlans$/],
  ['DELETE', /^\/vlans\/\d+$/],
]

export function isMockedEndpoint(method: HttpMethod, path: string): boolean {
  const clean = path.split('?')[0]
  return MOCKED_WRITE_ENDPOINTS.some(([m, re]) => m === method && re.test(clean))
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function notFound(what: string): never {
  throw new ApiError(`${what} not found`, 404)
}

function badRequest(message: string): never {
  throw new ApiError(message, 400)
}

/* ------------------------------------------------------------------ *
 * Route handlers
 * ------------------------------------------------------------------ */

function handleAuth(method: HttpMethod, path: string, body: unknown): unknown {
  if (method === 'POST' && path === '/auth/login') {
    const { username, password } = (body ?? {}) as LoginRequest
    if (!username || !password) badRequest('Username and password are required')
    // Dev provider: any non-empty credentials are accepted. Replace this once
    // the backend exposes a real identity provider.
    if (password.length < 3) throw new ApiError('Invalid username or password', 401)

    const response: LoginResponse = {
      access_token: `mock.${btoa(username)}.${Date.now()}`,
      token_type: 'bearer',
      expires_in: 8 * 60 * 60,
      user: {
        username,
        display_name: username.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: username.includes('@') ? username : `${username}@example.com`,
        roles: username === 'viewer' ? ['viewer'] : ['operator', 'admin'],
      },
    }
    return response
  }

  if (method === 'POST' && path === '/auth/logout') return { status: 'ok' }

  if (method === 'GET' && path === '/auth/me') {
    throw new ApiError('Not authenticated', 401)
  }

  return undefined
}

function handleDevices(method: HttpMethod, path: string, body: unknown, query: RequestOptions['query']): unknown {
  const db = getDb()

  if (method === 'GET' && path === '/devices') {
    const siteId = query?.site_id ?? query?.site
    return siteId ? db.devices.filter((d) => d.site?.id === Number(siteId)) : db.devices
  }

  const detail = /^\/devices\/(\d+)$/.exec(path)
  if (detail) {
    const id = Number(detail[1])
    const index = db.devices.findIndex((d) => d.id === id)
    if (index === -1) notFound(`Device ${id}`)

    if (method === 'GET') return db.devices[index]

    if (method === 'PATCH' || method === 'PUT') {
      const payload = (body ?? {}) as DeviceUpdate
      const device = db.devices[index]
      const site = payload.site ? db.sites.find((s) => s.id === Number(payload.site)) : undefined
      const type = payload.device_type
        ? db.deviceTypes.find((t) => t.id === Number(payload.device_type))
        : undefined

      db.devices[index] = {
        ...device,
        name: payload.name ?? device.name,
        status: payload.status ?? device.status,
        site: site ? { id: site.id, name: site.name, slug: site.slug } : device.site,
        device_type: type
          ? { id: type.id, name: type.model, slug: type.slug, display: type.model }
          : device.device_type,
        primary_ip4:
          payload.primary_ip4 === undefined
            ? device.primary_ip4
            : payload.primary_ip4
              ? { id: device.primary_ip4?.id ?? nextId('prefix'), display: payload.primary_ip4, name: payload.primary_ip4 }
              : null,
        manageable: payload.manageable ?? device.manageable,
      }
      persist()
      return db.devices[index]
    }

    if (method === 'DELETE') {
      db.devices.splice(index, 1)
      db.interfaces = db.interfaces.filter((i) => i.device.id !== id)
      persist()
      return NO_CONTENT
    }
  }

  if (method === 'POST' && path === '/devices') {
    const payload = (body ?? {}) as DeviceCreate
    if (!payload.name) badRequest('Device name is required')
    if (!payload.site) badRequest('Site is required')
    if (!payload.device_type) badRequest('Device type is required')
    if (db.devices.some((d) => d.name?.toLowerCase() === payload.name.toLowerCase())) {
      badRequest(`A device named '${payload.name}' already exists`)
    }

    const site = db.sites.find((s) => s.id === Number(payload.site))
    const type = db.deviceTypes.find((t) => t.id === Number(payload.device_type))
    if (!site) badRequest('Unknown site')
    if (!type) badRequest('Unknown device type')

    const device: Device = {
      id: nextId('device'),
      name: payload.name,
      status: payload.status ?? 'active',
      site: { id: site.id, name: site.name, slug: site.slug },
      device_type: { id: type.id, name: type.model, slug: type.slug, display: type.model },
      device_role: { id: 1, name: 'Media Leaf', slug: 'media-leaf' },
      primary_ip4: payload.primary_ip4
        ? { id: nextId('prefix'), display: payload.primary_ip4, name: payload.primary_ip4 }
        : null,
      primary_ip6: null,
      manageable: payload.manageable ?? false,
    }
    db.devices.push(device)

    // Give the new device a plausible set of unconfigured ports.
    const portCount = 48
    for (let port = 1; port <= portCount; port += 1) {
      db.interfaces.push({
        id: nextId('interface'),
        device: { id: device.id, name: device.name ?? '' },
        name: `Ethernet1/${port}`,
        type: '25gbase-x-sfp28',
        enabled: false,
        mtu: 1500,
        mode: 'access',
        description: 'unused',
        untagged_vlan: null,
        tagged_vlans: [],
        template: null,
        link_state: 'down',
        speed: 25000,
      })
    }
    persist()
    return device
  }

  return undefined
}

function handleInterfaces(method: HttpMethod, path: string, body: unknown, query: RequestOptions['query']): unknown {
  const db = getDb()

  if (method === 'GET' && path === '/interfaces') {
    const deviceId = query?.device_id
    return deviceId ? db.interfaces.filter((i) => i.device.id === Number(deviceId)) : db.interfaces
  }

  const detail = /^\/interfaces\/(\d+)$/.exec(path)
  if (detail && (method === 'PATCH' || method === 'PUT')) {
    const id = Number(detail[1])
    const index = db.interfaces.findIndex((i) => i.id === id)
    if (index === -1) notFound(`Interface ${id}`)
    db.interfaces[index] = { ...db.interfaces[index], ...(body as Partial<DeviceInterface>) }
    persist()
    return db.interfaces[index]
  }

  if (method === 'POST' && path === '/interfaces/apply-templates') {
    const payload = (body ?? {}) as ApplyTemplatesRequest
    const device = db.devices.find((d) => d.id === Number(payload.device))
    if (!device) notFound(`Device ${payload.device}`)
    if (!device.manageable) {
      throw new ApiError(
        `Device '${device.name}' is not tagged 'bnc-state: manage'; write operations are not allowed`,
        403,
      )
    }

    const result: ApplyTemplatesResult = {
      device: device.id,
      dry_run: Boolean(payload.dry_run),
      changed: 0,
      changes: [],
      errors: [],
    }

    for (const assignment of payload.assignments ?? []) {
      const iface = db.interfaces.find((i) => i.id === assignment.interface_id)
      if (!iface) {
        result.errors.push(`Interface ${assignment.interface_id} not found`)
        continue
      }

      const template = assignment.template
        ? db.templates.find((t) => t.slug === assignment.template)
        : null
      if (assignment.template && !template) {
        result.errors.push(`Template '${assignment.template}' not found`)
        continue
      }

      const from = iface.template
      if (from === (template?.slug ?? null) && assignment.untagged_vlan === undefined) continue

      result.changes.push({ interface: iface.name, from, to: template?.slug ?? null })
      result.changed += 1

      if (payload.dry_run) continue

      const vlanId = assignment.untagged_vlan ?? template?.untagged_vlan ?? null
      const vlan = vlanId ? db.vlans.find((v) => v.id === vlanId) : null

      iface.template = template?.slug ?? null
      iface.enabled = template ? template.enabled : false
      iface.mtu = template?.mtu ?? iface.mtu
      iface.mode = template?.mode ?? iface.mode
      iface.untagged_vlan = vlan ? { id: vlan.id, name: vlan.name, display: `${vlan.name} (${vlan.vid})` } : template ? iface.untagged_vlan : null
      iface.description = assignment.description ?? (template ? template.name : 'unused')
      iface.link_state = template ? 'up' : 'down'
    }

    if (!payload.dry_run) persist()
    return result
  }

  return undefined
}

function handleTemplates(method: HttpMethod, path: string, body: unknown): unknown {
  const db = getDb()

  if (method === 'GET' && path === '/switchport-templates') return db.templates

  if (method === 'POST' && path === '/switchport-templates') {
    const payload = (body ?? {}) as SwitchportTemplateCreate
    if (!payload.name) badRequest('Template name is required')
    const slug = payload.slug || slugify(payload.name)
    if (db.templates.some((t) => t.slug === slug)) {
      badRequest(`A template with slug '${slug}' already exists`)
    }
    const template: SwitchportTemplate = {
      ...payload,
      slug,
      id: `tpl-${nextId('template')}`,
      builtin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.templates.push(template)
    persist()
    return template
  }

  const detail = /^\/switchport-templates\/([^/]+)$/.exec(path)
  if (detail) {
    const slug = decodeURIComponent(detail[1])
    const index = db.templates.findIndex((t) => t.slug === slug)
    if (index === -1) notFound(`Template '${slug}'`)

    if (method === 'GET') return db.templates[index]

    if (method === 'PATCH' || method === 'PUT') {
      const existing = db.templates[index]
      if (existing.builtin) {
        badRequest(`'${existing.name}' is a built-in template — clone it to make changes`)
      }
      db.templates[index] = {
        ...existing,
        ...(body as Partial<SwitchportTemplate>),
        id: existing.id,
        slug: existing.slug,
        builtin: false,
        updated_at: new Date().toISOString(),
      }
      persist()
      return db.templates[index]
    }

    if (method === 'DELETE') {
      const existing = db.templates[index]
      if (existing.builtin) badRequest(`'${existing.name}' is a built-in template and cannot be deleted`)
      const inUse = db.interfaces.filter((i) => i.template === existing.slug).length
      if (inUse > 0) badRequest(`Template is applied to ${inUse} port(s) and cannot be deleted`)
      db.templates.splice(index, 1)
      persist()
      return NO_CONTENT
    }
  }

  return undefined
}

function handleIpam(method: HttpMethod, path: string, body: unknown, query: RequestOptions['query']): unknown {
  const db = getDb()

  if (method === 'GET' && path === '/vlans') {
    const siteId = query?.site_id
    return siteId ? db.vlans.filter((v) => v.site?.id === Number(siteId)) : db.vlans
  }
  if (method === 'GET' && path === '/vlan-groups') return db.vlanGroups
  if (method === 'GET' && path === '/prefixes') {
    const siteId = query?.site_id
    return siteId ? db.prefixes.filter((p) => p.site?.id === Number(siteId)) : db.prefixes
  }
  if (method === 'GET' && path === '/ip-addresses') return db.ipAddresses

  if (method === 'POST' && path === '/vlans') {
    const payload = (body ?? {}) as VlanProvisionRequest
    if (!payload.name) badRequest('VLAN name is required')
    if (payload.vid === undefined || payload.vid === null) badRequest('VLAN ID is required')
    if (payload.vid < 1 || payload.vid > 4094) badRequest('VLAN ID must be between 1 and 4094')

    const site = db.sites.find((s) => s.id === Number(payload.site))
    if (!site) badRequest('Unknown site')
    if (db.vlans.some((v) => v.vid === payload.vid && v.site?.id === site.id)) {
      badRequest(`VLAN ${payload.vid} already exists at ${site.name}`)
    }
    if (payload.prefix && db.prefixes.some((p) => p.prefix === payload.prefix)) {
      badRequest(`Prefix ${payload.prefix} already exists`)
    }

    const group = payload.group ? db.vlanGroups.find((g) => g.id === Number(payload.group)) : undefined
    const vlan: VLAN = {
      id: nextId('vlan'),
      name: payload.name,
      vid: payload.vid,
      status: payload.status ?? 'active',
      group: group ? { id: group.id, name: group.name, slug: group.slug } : null,
      site: { id: site.id, name: site.name, slug: site.slug },
    }
    db.vlans.push(vlan)

    if (payload.prefix) {
      const prefix: Prefix = {
        id: nextId('prefix'),
        prefix: payload.prefix,
        status: 'active',
        site: { id: site.id, name: site.name, slug: site.slug },
        vlan: { id: vlan.id, name: vlan.name, display: `${vlan.name} (${vlan.vid})` },
        description:
          payload.description ||
          [
            payload.routing.enabled ? 'routed' : null,
            payload.dhcp.enabled ? 'dhcp' : null,
            payload.multicast.enabled ? 'multicast' : null,
          ]
            .filter(Boolean)
            .join(', ') ||
          undefined,
      }
      db.prefixes.push(prefix)
    }

    persist()
    return vlan
  }

  const vlanDetail = /^\/vlans\/(\d+)$/.exec(path)
  if (vlanDetail && method === 'DELETE') {
    const id = Number(vlanDetail[1])
    const index = db.vlans.findIndex((v) => v.id === id)
    if (index === -1) notFound(`VLAN ${id}`)
    const inUse = db.interfaces.filter((i) => i.untagged_vlan?.id === id).length
    if (inUse > 0) badRequest(`VLAN is assigned to ${inUse} port(s) and cannot be deleted`)
    db.vlans.splice(index, 1)
    db.prefixes = db.prefixes.filter((p) => p.vlan?.id !== id)
    persist()
    return NO_CONTENT
  }

  return undefined
}

function handleGeneric(method: HttpMethod, path: string): unknown {
  const db = getDb()

  if (method === 'GET' && path === '/sites') return db.sites
  if (method === 'GET' && path === '/device-types') return db.deviceTypes
  if (method === 'GET' && path === '/healthz') return { status: 'ok' }
  if (method === 'GET' && path === '/readyz') return { status: 'ready' }
  if (method === 'POST' && path === '/mock/reset') {
    resetDb()
    return { status: 'reset' }
  }

  const siteDetail = /^\/sites\/(\d+)$/.exec(path)
  if (siteDetail && method === 'GET') {
    const site = db.sites.find((s) => s.id === Number(siteDetail[1]))
    if (!site) notFound(`Site ${siteDetail[1]}`)
    return site
  }

  return undefined
}

export async function handleMock<T>(
  method: HttpMethod,
  rawPath: string,
  options: RequestOptions = {},
): Promise<T> {
  await delay()

  const path = rawPath.split('?')[0]
  const { body, query } = options

  const handlers = [
    () => handleAuth(method, path, body),
    () => handleDevices(method, path, body, query),
    () => handleInterfaces(method, path, body, query),
    () => handleTemplates(method, path, body),
    () => handleIpam(method, path, body, query),
    () => handleGeneric(method, path),
  ]

  for (const handler of handlers) {
    const result = handler()
    if (result === NO_CONTENT) return undefined as T
    if (result !== undefined) return result as T
  }

  throw new ApiError(`No mock handler for ${method} ${path}`, 404)
}
