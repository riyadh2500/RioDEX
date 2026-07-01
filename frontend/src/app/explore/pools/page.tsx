'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAllPairs } from '@/hooks/useAllPairs'
import TokenIcon from '@/components/TokenIcon'
import { formatCompact, formatUSD, cn } from '@/lib/utils'
import { Search, Loader2, ArrowUpDown, Plus } from 'lucide-react'
import { Pair } from '@/types/pair'

type SortKey = 'tvl' | 'volume' | 'apr'

export default function ExplorePoolsPage() {
  const { data: pairs = [], isLoading } = useAllPairs()
  const [query, setQuery]     = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('tvl')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const list = q
      ? pairs.filter(
          (p) =>
            p.token0.symbol.toLowerCase().includes(q) ||
            p.token1.symbol.toLowerCase().includes(q) ||
            p.address.toLowerCase().includes(q),
        )
      : pairs

    return [...list].sort((a, b) => {
      let diff = 0
      if (sortKey === 'tvl')    diff = (a.tvlUSD ?? 0)        - (b.tvlUSD ?? 0)
      if (sortKey === 'volume') diff = (a.volume24hUSD ?? 0)  - (b.volume24hUSD ?? 0)
      if (sortKey === 'apr')    diff = (a.apr ?? 0)           - (b.apr ?? 0)
      return sortAsc ? diff : -diff
    })
  }, [pairs, query, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((p) => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    return (
      <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-dex-text">
        {label}
        <ArrowUpDown size={11} className={cn(sortKey === k ? 'text-dex-pink' : 'text-dex-border')} />
      </button>
    )
  }

  // Summary stats
  const totalTVL    = pairs.reduce((s, p) => s + (p.tvlUSD ?? 0), 0)
  const totalVol24h = pairs.reduce((s, p) => s + (p.volume24hUSD ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pools',    value: String(pairs.length) },
          { label: 'Total TVL',      value: formatCompact(totalTVL) },
          { label: 'Volume 24h',     value: formatCompact(totalVol24h) },
          { label: 'Swap Fee',       value: '0.30%' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-dex-border bg-dex-surface p-4 shadow-card">
            <p className="text-xs text-dex-muted">{label}</p>
            <p className="mt-1 text-xl font-bold text-dex-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Search + add button */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl border border-dex-border bg-dex-surface px-3 py-2 shadow-card w-full max-w-sm">
          <Search size={15} className="shrink-0 text-dex-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pools…"
            className="flex-1 bg-transparent text-sm text-dex-text placeholder:text-dex-muted outline-none"
          />
        </div>
        <Link
          href="/liquidity/add"
          className="flex items-center gap-2 rounded-xl bg-dex-pink px-4 py-2 text-sm font-semibold text-white hover:bg-dex-purple transition-colors shadow-card"
        >
          <Plus size={15} /> New Pool
        </Link>
      </div>

      {/* Table */}
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
                  <th className="px-5 py-3 text-left font-medium">Pool</th>
                  <th className="px-5 py-3 text-right font-medium">
                    <SortHeader label="TVL" k="tvl" />
                  </th>
                  <th className="px-5 py-3 text-right font-medium hidden md:table-cell">
                    <SortHeader label="Volume 24h" k="volume" />
                  </th>
                  <th className="px-5 py-3 text-right font-medium hidden md:table-cell">Reserves</th>
                  <th className="px-5 py-3 text-right font-medium hidden lg:table-cell">
                    <SortHeader label="APR" k="apr" />
                  </th>
                  <th className="px-5 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-dex-muted text-sm">
                      No pools found
                    </td>
                  </tr>
                ) : (
                  filtered.map((pair, idx) => (
                    <tr
                      key={pair.address}
                      className={cn(
                        'transition-colors hover:bg-dex-surface-2',
                        idx !== filtered.length - 1 && 'border-b border-dex-border',
                      )}
                    >
                      <td className="px-5 py-3.5 text-dex-muted text-xs">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex -space-x-2">
                            <TokenIcon token={pair.token0} size={26} className="ring-2 ring-white" />
                            <TokenIcon token={pair.token1} size={26} className="ring-2 ring-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-dex-text">
                              {pair.token0.symbol} / {pair.token1.symbol}
                            </p>
                            <span className="text-xs rounded-full bg-dex-pink-light px-2 py-0.5 text-dex-pink font-medium">
                              0.30%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-dex-text">
                        {pair.tvlUSD ? formatCompact(pair.tvlUSD) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right text-dex-muted hidden md:table-cell">
                        {pair.volume24hUSD ? formatCompact(pair.volume24hUSD) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right hidden md:table-cell">
                        <div className="text-xs text-dex-muted">
                          <p>{Number(pair.reserve0).toFixed(4)} {pair.token0.symbol}</p>
                          <p>{Number(pair.reserve1).toFixed(4)} {pair.token1.symbol}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                        <span className="text-dex-green font-medium">
                          {pair.apr ? `${pair.apr.toFixed(2)}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/swap?tokenIn=${pair.token0.address}&tokenOut=${pair.token1.address}`}
                            className="rounded-lg bg-dex-pink-light px-2.5 py-1 text-xs font-semibold text-dex-pink hover:bg-dex-pink hover:text-white transition-colors"
                          >
                            Swap
                          </Link>
                          <Link
                            href={`/liquidity/add?tokenA=${pair.token0.address}&tokenB=${pair.token1.address}`}
                            className="hidden sm:block rounded-lg border border-dex-border px-2.5 py-1 text-xs font-medium text-dex-text hover:bg-dex-surface-2 transition-colors"
                          >
                            + Add
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
