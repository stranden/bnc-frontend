/**
 * Types mirroring the BNC backend's Pydantic schemas (`app/models/schemas.py`).
 *
 * NetBox is the single source of truth; BNC only exposes slim projections of
 * the NetBox objects that carry the `external-ctrl: bnc` tag. Objects that
 * additionally carry `bnc-state: manage` may be actively changed by BNC.
 */

export interface NestedRef {
  id: number
  name?: string | null
  slug?: string | null
  display?: string | null
}

export type NetBoxStatus = 'active' | 'planned' | 'staging' | 'offline' | 'deprecated' | string

export interface Site {
  id: number
  name: string
  description?: string | null
  tenant?: string | null
  site_group?: string | null
  device_count: number
  vlan_count: number
  prefix_count: number
}

export interface DeviceType {
  id: number
  model: string
  slug: string
  manufacturer?: NestedRef | null
  u_height?: number | null
}

export interface Device {
  id: number
  name?: string | null
  status?: NetBoxStatus | null
  site?: NestedRef | null
  device_type?: NestedRef | null
  device_role?: NestedRef | null
  primary_ip4?: NestedRef | null
  primary_ip6?: NestedRef | null
  /**
   * True when the device carries the `bnc-state: manage` tag and BNC may push
   * configuration to it. Not yet returned by the backend — treated as
   * `undefined` (unknown) until the backend exposes it.
   */
  manageable?: boolean
}

export interface IPAddress {
  id: number
  address: string
  status?: NetBoxStatus | null
  description?: string | null
  assigned_object_id?: number | null
  assigned_object_type?: string | null
}

/* ------------------------------------------------------------------ *
 * Network templates (BNC-owned, read-only — GET /templates)
 * ------------------------------------------------------------------ */

/** Slug of a built-in BNC network template, e.g. `aes67`, `dante`, `data`, `smpte-2110`. */
export interface NetworkTemplate {
  slug: string
  name: string
  description: string
}

/* ------------------------------------------------------------------ *
 * VLANs (NetBox-backed, scoped per site — GET/POST/PATCH/DELETE /vlans)
 * ------------------------------------------------------------------ */

export interface Vlan {
  vid: number
  site_id: number
  name: string
  description?: string | null
  /** Slug of the NetworkTemplate tagging this VLAN's traffic class, or null. */
  template?: string | null
}

export interface VlanCreate {
  site_id: number
  vid: number
  name: string
  description?: string | null
  template?: string | null
}

export interface VlanUpdate {
  site_id: number
  name?: string | null
  description?: string | null
  template?: string | null
}

/* ------------------------------------------------------------------ *
 * Write payloads
 * ------------------------------------------------------------------ */

export interface DeviceCreate {
  name: string
  site: number
  device_type: number
  device_role?: number | null
  status?: NetBoxStatus
  primary_ip4?: string | null
  /** Request the `bnc-state: manage` tag so BNC may push config to the device. */
  manageable?: boolean
}

export type DeviceUpdate = Partial<DeviceCreate>

/* ------------------------------------------------------------------ *
 * Interfaces / switch ports
 * ------------------------------------------------------------------ */

export type InterfaceMode = 'access' | 'tagged' | 'tagged-all' | 'routed' | null

export interface DeviceInterface {
  id: number
  device: NestedRef
  name: string
  type?: string | null
  enabled: boolean
  mtu?: number | null
  mode?: InterfaceMode
  description?: string | null
  /** VID + name of the VLAN carried untagged on this port, if any. */
  untagged_vlan?: { vid: number; name: string } | null
  tagged_vlans?: Array<{ vid: number; name: string }>
  /** Slug of the BNC network template currently applied to this port, or null if none. */
  template: string | null
  /** Live link state as reported from the device, when known. */
  link_state?: 'up' | 'down' | 'unknown' | null
  speed?: number | null
}

/* ------------------------------------------------------------------ *
 * Port template assignment
 * ------------------------------------------------------------------ */

export interface PortAssignment {
  interface_id: number
  /** Slug of the NetworkTemplate to apply, or null to unconfigure the port. */
  template: string | null
  /** Per-port VLAN override (VID); falls back to the template's VLAN when absent. */
  untagged_vlan?: number | null
  description?: string | null
}

export interface ApplyTemplatesRequest {
  device: number
  assignments: PortAssignment[]
  /** When true, only compute the diff and do not push to the device. */
  dry_run?: boolean
}

export interface ApplyTemplatesResult {
  device: number
  dry_run: boolean
  changed: number
  /** Human readable per-port summary of what changed. */
  changes: Array<{ interface: string; from: string | null; to: string | null }>
  errors: string[]
}

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

export interface User {
  username: string
  display_name?: string
  email?: string | null
  /** Roles drive whether the UI offers write/push actions. */
  roles: string[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type?: string
  expires_in?: number
  user: User
}
