/** Small IPv4 helpers used for form validation and gateway suggestions. */

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

export function isIPv4(value: string): boolean {
  return IPV4_RE.test(value.trim())
}

export function isCidr(value: string): boolean {
  const [address, mask, ...rest] = value.trim().split('/')
  if (rest.length || !address || mask === undefined) return false
  if (!isIPv4(address)) return false
  const prefixLength = Number(mask)
  return Number.isInteger(prefixLength) && prefixLength >= 0 && prefixLength <= 32
}

function toInt(address: string): number {
  return address
    .split('.')
    .reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function toDotted(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.')
}

/**
 * First usable host address of `cidr`, returned in CIDR form so it can be used
 * directly as an SVI address (e.g. `10.10.0.0/24` -> `10.10.0.1/24`).
 */
export function cidrToGateway(cidr: string): string | null {
  if (!isCidr(cidr)) return null

  const [address, mask] = cidr.trim().split('/')
  const prefixLength = Number(mask)
  // /31 and /32 have no separate gateway address.
  if (prefixLength > 30) return null

  const maskBits = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0
  const network = (toInt(address) & maskBits) >>> 0
  return `${toDotted((network + 1) >>> 0)}/${prefixLength}`
}

/** Broadcast address of a CIDR, used to sanity-check DHCP pools. */
export function cidrBroadcast(cidr: string): string | null {
  if (!isCidr(cidr)) return null
  const [address, mask] = cidr.trim().split('/')
  const prefixLength = Number(mask)
  const maskBits = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0
  const network = (toInt(address) & maskBits) >>> 0
  return toDotted((network | (~maskBits >>> 0)) >>> 0)
}

/** True when `address` falls inside `cidr`. */
export function isInCidr(address: string, cidr: string): boolean {
  if (!isIPv4(address) || !isCidr(cidr)) return false
  const [network, mask] = cidr.trim().split('/')
  const prefixLength = Number(mask)
  const maskBits = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0
  return ((toInt(address) & maskBits) >>> 0) === ((toInt(network) & maskBits) >>> 0)
}
