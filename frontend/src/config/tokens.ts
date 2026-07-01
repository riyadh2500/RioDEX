import { Token } from '@/types/token'
import { DEFAULT_CHAIN_ID, getNetwork, NETWORKS } from './networks'

// ─── Native pseudo-token ────────────────────────────────────────────────────
export function getNativeToken(chainId: number = DEFAULT_CHAIN_ID): Token {
  let network
  try { network = getNetwork(chainId) }
  catch { network = getNetwork(DEFAULT_CHAIN_ID) }
  return {
    address: 'native',
    symbol:  network.nativeCurrency.symbol,
    name:    network.nativeCurrency.name,
    decimals: network.nativeCurrency.decimals,
    logoURI: network.logoUrl,
    chainId,
  }
}

// ─── WETH token — returns '' if not configured ────────────────────────────────
export function getWETHToken(chainId: number = DEFAULT_CHAIN_ID): Token {
  let network
  try { network = getNetwork(chainId) }
  catch { network = getNetwork(DEFAULT_CHAIN_ID) }
  return {
    address:  network.contracts.weth ?? '',
    symbol:   `W${network.nativeCurrency.symbol}`,
    name:     `Wrapped ${network.nativeCurrency.name}`,
    decimals: network.nativeCurrency.decimals,
    logoURI:  network.logoUrl,
    chainId,
  }
}

export const DEFAULT_TOKENS: Token[] = [
  getNativeToken(DEFAULT_CHAIN_ID),
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function isNativeToken(address: string): boolean {
  return address.toLowerCase() === 'native'
}

export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  displayDecimals = 6,
): string {
  if (raw === BigInt(0)) return '0'
  const divisor = BigInt(10) ** BigInt(decimals)
  const whole   = raw / divisor
  const frac    = raw % divisor
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, displayDecimals)
  const trimmed = fracStr.replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole.toString()
}

export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!value || value === '.') return BigInt(0)
  const [whole = '0', frac = ''] = value.split('.')
  const fracPadded = frac.slice(0, decimals).padEnd(decimals, '0')
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(fracPadded)
}

export function formatUSD(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address === 'native') return address
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`
}
