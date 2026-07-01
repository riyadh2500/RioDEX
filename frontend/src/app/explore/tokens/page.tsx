'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAllTokens } from '@/hooks/useAllTokens'
import { useTokenListStore } from '@/stores/useTokenListStore'
import { useMarketPrices } from '@/hooks/useMarketPrice'
import TokenIcon from '@/components/TokenIcon'
import PriceChart, { generateMockPriceData } from '@/components/PriceChart'
import { formatUSD, formatCompact, formatPct, cn } from '@/lib/utils'
import { Search, TrendingUp, TrendingDown, Loader2, ArrowUpDown } from 'lucide-react'
import { Token } from '@/types/token'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'

const network = getNetwork(DEFAULT_CHAIN_ID)

type SortKey = 'name' | 'price' | 'change' | 'volume'

export default function ExploreTokensPage() {
  const { isLoading } = useAllTokens()
  const getAllTokens = useTokenListStore((s) => s.getAllTokens)
  const tokens = useMemo(() => getAllTokens(), [getAllTokens])

  // Live prices from CoinGecko for all known tokens
  const symbols = useMemo(() => tokens.map((t) => t.symbol), [tokens])
  const { prices: livePrices } = useMarketPrices(symbols)

  const [query, setQuery]       = useState('')
  const [sortKey, setSortKey]   = useState<SortKey>('volume')
  const [sortAsc, setSortAsc]   = useState(false)
  const [selected, setSelected] = useState<Token | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const list = q
      ? tokens.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.address.toLowerCase().includes(q))
      : tokens

    return [...list].sort((a, b) => {
      let diff = 0
      if (sortKey === 'name')   diff = a.symbol.localeCompare(b.symbol)
      if (sortKey === 'price')  diff = (a.priceUSD ?? 0) - (b.priceUSD ?? 0)
      if (sortKey === 'change') diff = (a.priceChange24h ?? 0) - (b.priceChange24h ?? 0)
      if (sortKey === 'volume') diff = (a.volume24h ?? 0) - (b.volume24h ?? 0)
      return sortAsc ? diff : -diff
    })
  }, [tokens, query, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((p) => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    return (
      <button
        onClick={() => toggleSort(k)}
        className="flex items-center gap-1 hover:text-dex-text transition-colors"
      >
        {label}
        <ArrowUpDown size={11} className={cn(sortKey === k ? 'text-dex-pink' : 'text-dex-border')} />
      </button>
    )
  }

  const chartData = useMemo(
    () => generateMockPriceData(
      livePrices[selected?.symbol?.toUpperCase() ?? '']?.usd ?? selected?.priceUSD ?? 1,
      30,
    ),
    [selected, livePrices],
  )

  return (
    <div className="flex gap-6">
      {/* Table */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-dex-border bg-dex-surface px-3 py-2 shadow-card w-full max-w-sm">
          <Search size={15} className="shrink-0 text-dex-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens…"
            className="flex-1 bg-transparent text-sm text-dex-text placeholder:text-dex-muted outline-none"
          />
        </div>

        <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-dex-pink" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dex-border bg-dex-surface-2 text-xs text-dex-muted">
                    <th className="px-5 py-3 text-left font-medium w-8">#</th>
                    <th className="px-5 py-3 text-left font-medium">
                      <SortHeader label="Token" k="name" />
                    </th>
                    <th className="px-5 py-3 text-right font-medium">
                      <SortHeader label="Price" k="price" />
                    </th>
                    <th className="px-5 py-3 text-right font-medium">
                      <SortHeader label="24h Change" k="change" />
                    </th>
                    <th className="px-5 py-3 text-right font-medium hidden md:table-cell">
                      <SortHeader label="Volume 24h" k="volume" />
                    </th>
                    <th className="px-5 py-3 text-right font-medium hidden lg:table-cell">TVL</th>
                    <th className="px-5 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-dex-muted text-sm">
                        No tokens found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((token, idx) => {
                      const liveData = livePrices[token.symbol.toUpperCase()]
                      const change = liveData?.change24h ?? token.priceChange24h ?? 0
                      const price  = liveData?.usd       ?? token.priceUSD ?? 0
                      const isUp   = change >= 0
                      return (
                        <tr
                          key={token.address}
                          onClick={() => setSelected(token)}
                          className={cn(
                            'cursor-pointer transition-colors hover:bg-dex-surface-2',
                            idx !== filtered.length - 1 && 'border-b border-dex-border',
                            selected?.address === token.address && 'bg-dex-pink-light',
                          )}
                        >
                          <td className="px-5 py-3.5 text-dex-muted text-xs">{idx + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <TokenIcon token={token} size={28} />
                              <div>
                                <p className="font-semibold text-dex-text">{token.symbol}</p>
                                <p className="text-xs text-dex-muted">{token.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-dex-text tabular-nums">
                            {formatUSD(price)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={cn('flex items-center justify-end gap-1 font-medium text-xs', isUp ? 'text-dex-green' : 'text-dex-red')}>
                              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {formatPct(change)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right text-dex-muted hidden md:table-cell">
                            {token.volume24h ? formatCompact(token.volume24h) : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-dex-muted hidden lg:table-cell">
                            {token.liquidity ? formatCompact(token.liquidity) : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              href={`/swap?tokenOut=${token.address}`}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg bg-dex-pink-light px-2.5 py-1 text-xs font-semibold text-dex-pink hover:bg-dex-pink hover:text-white transition-colors"
                            >
                              Swap
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side panel — token detail */}
      {selected && (
        <div className="hidden xl:block w-72 shrink-0 space-y-4">
          <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card p-5 space-y-4 sticky top-24">
            <div className="flex items-center gap-3">
              <TokenIcon token={selected} size={40} />
              <div>
                <p className="font-bold text-dex-text">{selected.symbol}</p>
                <p className="text-xs text-dex-muted">{selected.name}</p>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-dex-text">
                {formatUSD(livePrices[selected.symbol.toUpperCase()]?.usd ?? selected.priceUSD ?? 0)}
              </p>
              <p className={cn('text-sm font-medium', (livePrices[selected.symbol.toUpperCase()]?.change24h ?? selected.priceChange24h ?? 0) >= 0 ? 'text-dex-green' : 'text-dex-red')}>
                {formatPct(livePrices[selected.symbol.toUpperCase()]?.change24h ?? selected.priceChange24h ?? 0)} (24h)
              </p>
            </div>
            <PriceChart data={chartData} height={120} color="#7C3AED" />
            <div className="space-y-2 text-xs">
              {[
                { label: 'Volume 24h',  value: selected.volume24h  ? formatCompact(selected.volume24h)  : '—' },
                { label: 'Liquidity',   value: selected.liquidity   ? formatCompact(selected.liquidity)   : '—' },
                { label: 'Address',     value: `${selected.address.slice(0, 8)}…${selected.address.slice(-6)}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-dex-muted">{label}</span>
                  <span className="font-medium text-dex-text">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/swap?tokenOut=${selected.address}`}
                className="flex-1 rounded-lg bg-dex-pink py-2 text-center text-xs font-semibold text-white hover:bg-dex-purple transition-colors"
              >
                Swap
              </Link>
              <Link
                href={`/liquidity/add?tokenA=${selected.address}`}
                className="flex-1 rounded-lg border border-dex-border py-2 text-center text-xs font-medium text-dex-text hover:bg-dex-surface-2 transition-colors"
              >
                Add Liquidity
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
