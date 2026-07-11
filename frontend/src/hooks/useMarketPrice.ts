'use client'

import { useQuery } from '@tanstack/react-query'
import { TESTNET_SYMBOL_TO_COINGECKO } from '@/config/testnetTokens'

interface CoinGeckoPrice {
  [id: string]: { usd: number; usd_24h_change: number }
}

// Map common token symbols to their CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  ETH:    'ethereum',
  WETH:   'ethereum',
  BTC:    'bitcoin',
  WBTC:   'wrapped-bitcoin',
  CIRBTC: 'bitcoin',
  USDC:   'usd-coin',
  USDT:   'tether',
  EURC:   'euro-coin',
  DAI:    'dai',
  LINK:   'chainlink',
  UNI:    'uniswap',
  AAVE:   'aave',
  MATIC:  'matic-network',
  BNB:    'binancecoin',
  SOL:    'solana',
  RIO:    'realio-network',
  ALGO:   'algorand',
  // Legacy testnet-prefixed symbols
  TETH:   'ethereum',
  TWBTC:  'wrapped-bitcoin',
  TUSDC:  'usd-coin',
  'TUSDC.E': 'usd-coin',
  TEURC:  'euro-coin',
  TUSDT:  'tether',
  TRIO:   'realio-network',
  TBNB:   'binancecoin',
}

function resolveId(symbol: string): string | undefined {
  const upper = symbol.toUpperCase()
  // Direct match
  if (SYMBOL_TO_COINGECKO_ID[upper]) return SYMBOL_TO_COINGECKO_ID[upper]
  // Testnet prefix (t or tw)
  if (TESTNET_SYMBOL_TO_COINGECKO[upper]) return TESTNET_SYMBOL_TO_COINGECKO[upper]
  return undefined
}

export interface MarketPrice {
  usd:         number
  change24h:   number
}

async function fetchPrices(ids: string[]): Promise<CoinGeckoPrice> {
  const joined = ids.join(',')
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${joined}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } },
  )
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)
  return res.json()
}

/**
 * Fetches live USD prices for one or more token symbols.
 * Returns a map of symbol → { usd, change24h }.
 * Falls back gracefully to the env-var price when the fetch fails.
 */
export function useMarketPrices(symbols: string[]) {
  const fallbackPrice = Number(process.env.NEXT_PUBLIC_NATIVE_USD_PRICE_LOCALHOST ?? 1)

  // Resolve symbols → CoinGecko IDs (skip unknowns)
  const ids = [...new Set(
    symbols
      .map((s) => resolveId(s))
      .filter(Boolean) as string[],
  )]

  const { data, isLoading, error } = useQuery<CoinGeckoPrice>({
    queryKey:        ['marketPrices', ids.sort().join(',')],
    queryFn:         () => fetchPrices(ids),
    enabled:         ids.length > 0,
    staleTime:       30_000,   // 30 sec — faster refresh
    refetchInterval: 30_000,
    retry:           2,
  })

  // Build symbol → price map
  const prices: Record<string, MarketPrice> = {}
  for (const symbol of symbols) {
    const id    = resolveId(symbol)
    const entry = id ? data?.[id] : undefined
    const upper = symbol.toUpperCase()
    prices[upper] = {
      usd:       entry?.usd            ?? ((upper === 'ETH' || upper === 'TETH' || upper === 'WETH') ? fallbackPrice : 0),
      change24h: entry?.usd_24h_change ?? 0,
    }
  }

  return { prices, isLoading, error }
}

/** Convenience hook — single token */
export function useMarketPrice(symbol: string | undefined): MarketPrice {
  const { prices } = useMarketPrices(symbol ? [symbol] : [])
  return symbol
    ? (prices[symbol.toUpperCase()] ?? { usd: 0, change24h: 0 })
    : { usd: 0, change24h: 0 }
}
