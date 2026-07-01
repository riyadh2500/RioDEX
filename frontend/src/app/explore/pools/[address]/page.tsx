'use client'

import React, { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAllPairs } from '@/hooks/useAllPairs'
import TokenIcon from '@/components/TokenIcon'
import PriceChart, { generateMockPriceData } from '@/components/PriceChart'
import { formatUSD, formatCompact, shortenAddress, cn } from '@/lib/utils'
import { ArrowLeft, ExternalLink, Loader2, Plus } from 'lucide-react'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'

const network = getNetwork(DEFAULT_CHAIN_ID)

export default function PoolDetailPage() {
  const { address } = useParams<{ address: string }>()
  const { data: pairs = [], isLoading } = useAllPairs()

  const pair = pairs.find((p) => p.address.toLowerCase() === address?.toLowerCase())

  const tvlChartData    = useMemo(() => generateMockPriceData(pair?.tvlUSD ?? 100_000, 30, 0.03), [pair])
  const volumeChartData = useMemo(() => generateMockPriceData(pair?.volume24hUSD ?? 10_000, 30, 0.08), [pair])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-dex-pink" />
      </div>
    )
  }

  if (!pair) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-dex-muted">Pool not found</p>
        <Link href="/explore/pools" className="text-dex-pink hover:underline text-sm">← Back to Pools</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/explore/pools" className="text-dex-muted hover:text-dex-text transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <TokenIcon token={pair.token0} size={36} className="ring-2 ring-white" />
            <TokenIcon token={pair.token1} size={36} className="ring-2 ring-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-dex-text">
              {pair.token0.symbol} / {pair.token1.symbol}
            </h2>
            <p className="text-xs text-dex-muted font-mono">{shortenAddress(pair.address, 8)}</p>
          </div>
          <span className="rounded-full bg-dex-pink-light px-2.5 py-1 text-xs font-semibold text-dex-pink">0.30%</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Link
            href={`/swap?tokenIn=${pair.token0.address}&tokenOut=${pair.token1.address}`}
            className="rounded-xl bg-dex-pink px-4 py-2 text-sm font-semibold text-white hover:bg-dex-purple transition-colors shadow-card"
          >
            Swap
          </Link>
          <Link
            href={`/liquidity/add?tokenA=${pair.token0.address}&tokenB=${pair.token1.address}`}
            className="flex items-center gap-1.5 rounded-xl border border-dex-border px-4 py-2 text-sm font-medium text-dex-text hover:bg-dex-surface-2 transition-colors"
          >
            <Plus size={14} /> Add Liquidity
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Value Locked', value: pair.tvlUSD ? formatCompact(pair.tvlUSD) : '—' },
          { label: 'Volume 24h',          value: pair.volume24hUSD ? formatCompact(pair.volume24hUSD) : '—' },
          { label: 'Fees 24h',            value: pair.volume24hUSD ? formatCompact(pair.volume24hUSD * 0.003) : '—' },
          { label: 'APR',                 value: pair.apr ? `${pair.apr.toFixed(2)}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-dex-border bg-dex-surface p-4 shadow-card">
            <p className="text-xs text-dex-muted">{label}</p>
            <p className="mt-1 text-xl font-bold text-dex-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-dex-border bg-dex-surface p-5 shadow-card">
          <p className="text-sm font-semibold text-dex-text mb-4">TVL</p>
          <PriceChart data={tvlChartData} height={180} color="#7C3AED" />
        </div>
        <div className="rounded-2xl border border-dex-border bg-dex-surface p-5 shadow-card">
          <p className="text-sm font-semibold text-dex-text mb-4">Volume</p>
          <PriceChart data={volumeChartData} height={180} color="#059669" />
        </div>
      </div>

      {/* Pool tokens detail */}
      <div className="grid md:grid-cols-2 gap-5">
        {[
          { token: pair.token0, reserve: pair.reserve0 },
          { token: pair.token1, reserve: pair.reserve1 },
        ].map(({ token, reserve }) => (
          <div key={token.address} className="rounded-xl border border-dex-border bg-dex-surface p-4 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <TokenIcon token={token} size={28} />
              <p className="font-semibold text-dex-text">{token.symbol}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dex-muted">Reserve</span>
                <span className="font-medium text-dex-text">{Number(reserve).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dex-muted">Address</span>
                <span className="font-mono text-xs text-dex-muted">{shortenAddress(token.address)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
