import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Sleep for `ms` milliseconds */
export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/** Truncate a string to maxLen characters, appending '…' */
export function truncate(str: string, maxLen: number) {
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str
}

/** Format a large number with K / M / B suffixes */
export function formatCompact(value: number): string {
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3)  return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

/** Format percentage with sign */
export function formatPct(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/** Convert wei (bigint) to a float */
export function weiToFloat(wei: bigint, decimals = 18): number {
  return Number(wei) / 10 ** decimals
}

/** Returns ISO date string from a Unix timestamp (seconds) */
export function timestampToISO(ts: number): string {
  return new Date(ts * 1000).toISOString()
}

/** Relative time: "2 minutes ago" */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** Format a USD value with $ sign and commas */
export function formatUSD(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Shorten an Ethereum address: 0x1234…5678 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address === 'native') return address
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`
}
