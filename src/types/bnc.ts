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
  slug: string
  status?: NetBoxStatus | null
  region?: NestedRef | null
  description?: string | null
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

export interface Prefix {
  id: number
  prefix: string
  status?: NetBoxStatus | null
  site?: NestedRef | null
  vlan?: NestedRef | null
  description?: string | null
}

export interface IPAddress {
  id: number
  address: string
  status?: NetBoxStatus | null
  description?: string | null
  assigned_object_id?: number | null
  assigned_object_type?: string | null
}

export interface VLANGroup {
  id: number
  name: string
  slug: string
  site?: NestedRef | null
}

export interface VLAN {
  id: number
  name: string
  vid: number
  status?: NetBoxStatus | null
  group?: NestedRef | null
  site?: NestedRef | null
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
  untagged_vlan?: NestedRef | null
  tagged_vlans?: NestedRef[]
  /** Slug of the BNC switchport template currently applied, or null if none. */
  template: string | null
  /** Live link state as reported from the device, when known. */
  link_state?: 'up' | 'down' | 'unknown' | null
  speed?: number | null
}

/* ------------------------------------------------------------------ *
 * Switchport templates (BNC-owned, broadcast profiles)
 * ------------------------------------------------------------------ */

export type TemplateKind = 'aes67' | 'st2110' | 'dante' | 'data' | 'uplink' | 'custom'

export interface SwitchportTemplate {
  id: string
  name: string
  slug: string
  kind: TemplateKind
  description?: string
  /** Built-in templates ship with BNC and cannot be deleted. */
  builtin?: boolean

  mode: Exclude<InterfaceMode, null>
  untagged_vlan?: number | null
  tagged_vlans?: number[]

  mtu?: number | null
  /** Speed in Mbps; null lets the port auto-negotiate. */
  speed?: number | null
  enabled: boolean

  /** Quality of service / PTP behaviour, the part that matters for broadcast. */
  qos: {
    /** DSCP applied to media (RTP) traffic. */
    media_dscp?: number | null
    /** DSCP applied to PTP / clock traffic. */
    ptp_dscp?: number | null
    trust_mode?: 'dscp' | 'cos' | 'none'
  }

  ptp: {
    enabled: boolean
    profile?: 'smpte-2059-2' | 'aes67' | 'default' | null
    /** Announce/sync/delay-req intervals as log2 seconds, per IEEE 1588. */
    announce_interval?: number | null
    sync_interval?: number | null
    delay_req_interval?: number | null
  }

  multicast: {
    igmp_snooping: boolean
    /** Send IGMP queries on this port's VLAN. */
    querier: boolean
    igmp_version?: 2 | 3 | null
    /** Suppress unknown multicast flooding towards the endpoint. */
    block_unknown: boolean
    /** Max multicast groups the port may join; null = unlimited. */
    max_groups?: number | null
  }

  security: {
    portfast: boolean
    bpdu_guard: boolean
    storm_control_pps?: number | null
  }

  created_at?: string
  updated_at?: string
}

export type SwitchportTemplateCreate = Omit<
  SwitchportTemplate,
  'id' | 'builtin' | 'created_at' | 'updated_at'
>

/* ------------------------------------------------------------------ *
 * VLAN / subnet provisioning
 * ------------------------------------------------------------------ */

export interface VlanProvisionRequest {
  site: number
  name: string
  vid: number
  group?: number | null
  description?: string
  status?: NetBoxStatus

  /** CIDR for the subnet backing this VLAN, e.g. `10.10.10.0/24`. */
  prefix?: string | null

  routing: {
    enabled: boolean
    /** SVI address in CIDR form, e.g. `10.10.10.1/24`. */
    gateway?: string | null
    /** VRF id in NetBox, when the SVI lives outside the global table. */
    vrf?: number | null
    /** First-hop redundancy for a redundant pair of switches. */
    hsrp?: {
      enabled: boolean
      group?: number | null
      virtual_ip?: string | null
      priority?: number | null
    }
  }

  dhcp: {
    enabled: boolean
    /** DHCP relay targets (helper addresses). */
    relay_servers?: string[]
    /** Range handed out when BNC itself manages the scope. */
    pool_start?: string | null
    pool_end?: string | null
    lease_time?: number | null
  }

  multicast: {
    enabled: boolean
    igmp_snooping: boolean
    querier: boolean
    igmp_version?: 2 | 3 | null
    /** Rendezvous point for PIM-SM, when the VLAN is routed for multicast. */
    rendezvous_point?: string | null
    pim_mode?: 'sparse' | 'dense' | 'ssm' | null
    /** SSM group range, e.g. `232.0.0.0/8`. */
    ssm_range?: string | null
  }
}

/* ------------------------------------------------------------------ *
 * Port template assignment
 * ------------------------------------------------------------------ */

export interface PortAssignment {
  interface_id: number
  template: string | null
  /** Per-port VLAN override; falls back to the template's VLAN when absent. */
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
