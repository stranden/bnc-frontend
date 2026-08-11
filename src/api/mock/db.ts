/**
 * In-memory mock database, persisted to localStorage so the UI keeps its
 * state across reloads while the backend write endpoints do not exist yet.
 */
import { MOCK_SINGLE_SITE } from '@/config'
import type {
  Device,
  DeviceInterface,
  DeviceType,
  IPAddress,
  Prefix,
  Site,
  SwitchportTemplate,
  VLAN,
  VLANGroup,
} from '@/types/bnc'
import { BUILTIN_TEMPLATES } from './templates'

const STORAGE_KEY = 'bnc.mock.db.v1'

export interface MockDb {
  sites: Site[]
  deviceTypes: DeviceType[]
  devices: Device[]
  interfaces: DeviceInterface[]
  prefixes: Prefix[]
  ipAddresses: IPAddress[]
  vlanGroups: VLANGroup[]
  vlans: VLAN[]
  templates: SwitchportTemplate[]
  sequences: Record<string, number>
}

/** Set BNC_MOCK_SINGLE_SITE=true to exercise the auto-select-single-site path. */
const SINGLE_SITE = MOCK_SINGLE_SITE

function seedSites(): Site[] {
  const sites: Site[] = [
    {
      id: 1,
      name: 'Broadcast Centre',
      slug: 'broadcast-centre',
      status: 'active',
      region: { id: 10, name: 'Copenhagen', slug: 'copenhagen' },
      description: 'Main production facility — studios 1-4, MCR and central apparatus room.',
    },
    {
      id: 2,
      name: 'OB Truck Alpha',
      slug: 'ob-truck-alpha',
      status: 'active',
      region: { id: 11, name: 'Mobile', slug: 'mobile' },
      description: 'Outside broadcast unit, ST 2110 fly-away kit.',
    },
    {
      id: 3,
      name: 'Studio Annex',
      slug: 'studio-annex',
      status: 'planned',
      region: { id: 10, name: 'Copenhagen', slug: 'copenhagen' },
      description: 'Secondary studio block, commissioning Q3.',
    },
  ]
  return SINGLE_SITE ? sites.slice(0, 1) : sites
}

const DEVICE_TYPES: DeviceType[] = [
  {
    id: 1,
    model: 'Nexus 9336C-FX2',
    slug: 'n9k-c9336c-fx2',
    manufacturer: { id: 1, name: 'Cisco', slug: 'cisco' },
    u_height: 1,
  },
  {
    id: 2,
    model: 'Nexus 93180YC-FX3',
    slug: 'n9k-c93180yc-fx3',
    manufacturer: { id: 1, name: 'Cisco', slug: 'cisco' },
    u_height: 1,
  },
  {
    id: 3,
    model: 'Arista 7280CR3-32P4',
    slug: 'dcs-7280cr3-32p4',
    manufacturer: { id: 2, name: 'Arista', slug: 'arista' },
    u_height: 1,
  },
  {
    id: 4,
    model: 'Arista 7050SX3-48YC8',
    slug: 'dcs-7050sx3-48yc8',
    manufacturer: { id: 2, name: 'Arista', slug: 'arista' },
    u_height: 1,
  },
  {
    id: 5,
    model: 'Juniper QFX5120-48Y',
    slug: 'qfx5120-48y',
    manufacturer: { id: 3, name: 'Juniper', slug: 'juniper' },
    u_height: 1,
  },
]

const ROLE_LEAF = { id: 1, name: 'Media Leaf', slug: 'media-leaf' }
const ROLE_SPINE = { id: 2, name: 'Media Spine', slug: 'media-spine' }
const ROLE_EDGE = { id: 3, name: 'Edge Switch', slug: 'edge-switch' }

function seedDevices(sites: Site[]): Device[] {
  const siteRef = (id: number) => {
    const site = sites.find((s) => s.id === id) ?? sites[0]
    return { id: site.id, name: site.name, slug: site.slug }
  }
  const typeRef = (id: number) => {
    const t = DEVICE_TYPES.find((d) => d.id === id)!
    return { id: t.id, name: t.model, slug: t.slug, display: t.model }
  }

  const devices: Device[] = [
    {
      id: 1,
      name: 'car-spine-01',
      status: 'active',
      site: siteRef(1),
      device_type: typeRef(1),
      device_role: ROLE_SPINE,
      primary_ip4: { id: 101, display: '10.0.0.1/24', name: '10.0.0.1/24' },
      primary_ip6: null,
      manageable: true,
    },
    {
      id: 2,
      name: 'car-spine-02',
      status: 'active',
      site: siteRef(1),
      device_type: typeRef(1),
      device_role: ROLE_SPINE,
      primary_ip4: { id: 102, display: '10.0.0.2/24', name: '10.0.0.2/24' },
      primary_ip6: null,
      manageable: true,
    },
    {
      id: 3,
      name: 'std1-leaf-01',
      status: 'active',
      site: siteRef(1),
      device_type: typeRef(2),
      device_role: ROLE_LEAF,
      primary_ip4: { id: 103, display: '10.0.0.11/24', name: '10.0.0.11/24' },
      primary_ip6: null,
      manageable: true,
    },
    {
      id: 4,
      name: 'std2-leaf-01',
      status: 'active',
      site: siteRef(1),
      device_type: typeRef(4),
      device_role: ROLE_LEAF,
      primary_ip4: { id: 104, display: '10.0.0.12/24', name: '10.0.0.12/24' },
      primary_ip6: null,
      manageable: false,
    },
    {
      id: 5,
      name: 'mcr-edge-01',
      status: 'staging',
      site: siteRef(1),
      device_type: typeRef(5),
      device_role: ROLE_EDGE,
      primary_ip4: null,
      primary_ip6: null,
      manageable: false,
    },
  ]

  if (sites.some((s) => s.id === 2)) {
    devices.push(
      {
        id: 6,
        name: 'ob-alpha-leaf-01',
        status: 'active',
        site: siteRef(2),
        device_type: typeRef(3),
        device_role: ROLE_LEAF,
        primary_ip4: { id: 105, display: '10.20.0.11/24', name: '10.20.0.11/24' },
        primary_ip6: null,
        manageable: true,
      },
      {
        id: 7,
        name: 'ob-alpha-leaf-02',
        status: 'offline',
        site: siteRef(2),
        device_type: typeRef(3),
        device_role: ROLE_LEAF,
        primary_ip4: null,
        primary_ip6: null,
        manageable: true,
      },
    )
  }

  return devices
}

const VLAN_SEED: Array<{ vid: number; name: string; site: number; template?: string }> = [
  { vid: 100, name: 'ST2110-RED-VIDEO', site: 1, template: 'smpte-2110' },
  { vid: 101, name: 'ST2110-BLUE-VIDEO', site: 1, template: 'smpte-2110' },
  { vid: 110, name: 'AES67-RED-AUDIO', site: 1, template: 'aes67' },
  { vid: 120, name: 'DANTE-PROD', site: 1, template: 'dante' },
  { vid: 200, name: 'PTP-CLOCK', site: 1 },
  { vid: 300, name: 'CONTROL-DATA', site: 1, template: 'standard-data' },
  { vid: 400, name: 'MGMT', site: 1 },
]

function seedVlans(sites: Site[]): { vlans: VLAN[]; groups: VLANGroup[]; prefixes: Prefix[] } {
  const groups: VLANGroup[] = [
    { id: 1, name: 'Broadcast Centre Media', slug: 'car-media', site: { id: 1, name: 'Broadcast Centre', slug: 'broadcast-centre' } },
  ]
  if (sites.some((s) => s.id === 2)) {
    groups.push({
      id: 2,
      name: 'OB Alpha Media',
      slug: 'ob-alpha-media',
      site: { id: 2, name: 'OB Truck Alpha', slug: 'ob-truck-alpha' },
    })
  }

  const vlans: VLAN[] = VLAN_SEED.map((v, index) => ({
    id: index + 1,
    name: v.name,
    vid: v.vid,
    status: 'active',
    group: { id: 1, name: groups[0].name, slug: groups[0].slug },
    site: { id: 1, name: 'Broadcast Centre', slug: 'broadcast-centre' },
  }))

  const prefixes: Prefix[] = vlans.map((vlan, index) => ({
    id: index + 1,
    prefix: `10.${Math.floor(vlan.vid / 100)}.${vlan.vid % 100}.0/24`,
    status: 'active',
    site: { id: 1, name: 'Broadcast Centre', slug: 'broadcast-centre' },
    vlan: { id: vlan.id, name: vlan.name, display: `${vlan.name} (${vlan.vid})` },
    description: `Subnet for ${vlan.name}`,
  }))

  return { vlans, groups, prefixes }
}

/** Interface naming and port count per device type, so ports look realistic. */
const PORT_LAYOUT: Record<number, { prefix: string; count: number; uplinkPrefix: string; uplinks: number }> = {
  1: { prefix: 'Ethernet1/', count: 36, uplinkPrefix: 'Ethernet1/', uplinks: 0 },
  2: { prefix: 'Ethernet1/', count: 48, uplinkPrefix: 'Ethernet1/', uplinks: 6 },
  3: { prefix: 'Ethernet', count: 32, uplinkPrefix: 'Ethernet', uplinks: 4 },
  4: { prefix: 'Ethernet', count: 48, uplinkPrefix: 'Ethernet', uplinks: 8 },
  5: { prefix: 'xe-0/0/', count: 48, uplinkPrefix: 'et-0/0/', uplinks: 4 },
}

function seedInterfaces(devices: Device[], vlans: VLAN[]): DeviceInterface[] {
  const interfaces: DeviceInterface[] = []
  let id = 1

  for (const device of devices) {
    const layout = PORT_LAYOUT[device.device_type?.id ?? 2] ?? PORT_LAYOUT[2]
    const deviceRef = { id: device.id, name: device.name ?? `device-${device.id}` }

    for (let port = 1; port <= layout.count; port += 1) {
      const isUplink = port > layout.count - layout.uplinks
      const seededTemplate = isUplink
        ? 'media-uplink'
        : port <= 8
          ? 'smpte-2110'
          : port <= 12
            ? 'aes67'
            : port <= 16
              ? 'dante'
              : port <= 24
                ? 'standard-data'
                : null

      const vlan = seededTemplate
        ? vlans.find((v) =>
            seededTemplate === 'smpte-2110'
              ? v.vid === 100
              : seededTemplate === 'aes67'
                ? v.vid === 110
                : seededTemplate === 'dante'
                  ? v.vid === 120
                  : seededTemplate === 'standard-data'
                    ? v.vid === 300
                    : false,
          )
        : undefined

      interfaces.push({
        id: id++,
        device: deviceRef,
        name: `${isUplink ? layout.uplinkPrefix : layout.prefix}${port}`,
        type: isUplink ? '100gbase-x-qsfp28' : '25gbase-x-sfp28',
        enabled: seededTemplate !== null,
        mtu: seededTemplate === 'smpte-2110' || isUplink ? 9216 : 1500,
        mode: isUplink ? 'tagged-all' : 'access',
        description: seededTemplate ? '' : 'unused',
        untagged_vlan: vlan ? { id: vlan.id, name: vlan.name, display: `${vlan.name} (${vlan.vid})` } : null,
        tagged_vlans: [],
        template: seededTemplate,
        link_state: device.status === 'offline' ? 'down' : seededTemplate ? 'up' : 'down',
        speed: isUplink ? 100000 : 25000,
      })
    }
  }

  return interfaces
}

function seedIpAddresses(devices: Device[]): IPAddress[] {
  return devices
    .filter((d) => d.primary_ip4)
    .map((d, index) => ({
      id: 100 + index + 1,
      address: d.primary_ip4!.display ?? d.primary_ip4!.name ?? '0.0.0.0/32',
      status: 'active',
      description: `Management address for ${d.name}`,
      assigned_object_id: d.id,
      assigned_object_type: 'dcim.interface',
    }))
}

function buildSeed(): MockDb {
  const sites = seedSites()
  const devices = seedDevices(sites)
  const { vlans, groups, prefixes } = seedVlans(sites)

  return {
    sites,
    deviceTypes: DEVICE_TYPES,
    devices,
    interfaces: seedInterfaces(devices, vlans),
    prefixes,
    ipAddresses: seedIpAddresses(devices),
    vlanGroups: groups,
    vlans,
    templates: structuredClone(BUILTIN_TEMPLATES),
    sequences: {
      device: 100,
      vlan: 100,
      prefix: 100,
      interface: 10000,
      template: 100,
      vlanGroup: 100,
    },
  }
}

let db: MockDb | null = null

function load(): MockDb {
  if (db) return db

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb
      // Re-seed built-ins so template changes in code reach existing sessions.
      const custom = parsed.templates.filter((t) => !t.builtin)
      parsed.templates = [...structuredClone(BUILTIN_TEMPLATES), ...custom]
      db = parsed
      return db
    }
  } catch {
    /* corrupt or unavailable storage — fall through to a fresh seed */
  }

  db = buildSeed()
  persist()
  return db
}

export function persist(): void {
  if (!db) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* storage full or disabled — mock state stays in memory only */
  }
}

export function getDb(): MockDb {
  return load()
}

export function resetDb(): MockDb {
  db = buildSeed()
  persist()
  return db
}

export function nextId(sequence: keyof MockDb['sequences'] | string): number {
  const database = load()
  const current = database.sequences[sequence] ?? 1
  database.sequences[sequence] = current + 1
  return current + 1
}
