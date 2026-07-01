'use client'

import React from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Plus, Droplets, ExternalLink, Loader2, TrendingUp } from 'lucide-react'
import { useAllPairs } from '@/hooks/useAllPairs'
import { useLiquidityPositions } from '@/hooks/useLiquidityPositions'
import TokenIcon from '@/components/TokenIcon'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import { formatUSD, formatCompact } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function LiquidityPage() {
  const { address, isConnected } = useAccount()
  const { data: pairs = [], isLoading: pairsLoading } = useAllPairs()
  const { positions, isLoading: posLoading } = useLiquidityPositions(pairs, address)

  const isLoading = pairsLoading || posLoading

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dex-text">Liquidity</h1>
          <p className="text-sm text-dex-muted mt-1">
            Provide liquidity to earn 0.3% on every swap in that pair.
          </p>
        </div>
        <Link
          href="/liquidity/add"
          className="flex items-center gap-2 rounded-xl bg-dex-pink px-4 py-2.5 text-sm font-semibold text-white hover:bg-dex-purple transition-colors shadow-card"
        >
          <Plus size={16} />
          Add Liquidity
        </Link>
      </div>

      {/* Your positions */}
      <section>
        <h2 className="text-base font-semibold text-dex-text mb-3">Your Positions</h2>
        {!isConnected ? (
          <div className="rounded-2xl border border-dex-border bg-dex-surface p-8 text-center space-y-4">
            <Droplets size={36} className="mx-auto text-dex-muted" />
            <p className="text-dex-muted text-sm">Connect your wallet to see your liquidity positions</p>
            <ConnectWalletButton label="Connect Wallet" />
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-dex-pink" />
          </div>
        ) : positions.length === 0 ? (
          <div className="rounded-2xl border border-dex-border bg-dex-surface p-8 text-center space-y-3">
            <Droplets size={36} className="mx-auto text-dex-muted" />
            <p className="font-medium text-dex-text">No liquidity positions found</p>
            <p className="text-sm text-dex-muted">Add liquidity to a pair to start earning fees.</p>
            <Link
              href="/liquidity/add"
              className="inline-flex items-center gap-2 rounded-xl bg-dex-pink px-4 py-2 text-sm font-semibold text-white hover:bg-dex-purple transition-colors"
            >
              <Plus size={15} /> Add Liquidity
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => (
              <div
                key={pos.pair.address}
                className="rounded-2xl border border-dex-border bg-dex-surface p-5 shadow-card hover:shadow-card-md transition-shadow"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  {/* Pair icons + name */}
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <TokenIcon token={pos.pair.token0} size={32} className="ring-2 ring-white" />
                      <TokenIcon token={pos.pair.token1} size={32} className="ring-2 ring-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-dex-text">
                        {pos.pair.token0.symbol} / {pos.pair.token1.symbol}
                      </p>
                      <p className="text-xs text-dex-muted">
                        {(pos.share * 100).toFixed(4)}% of pool
                      </p>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="flex gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-dex-muted text-xs">{pos.pair.token0.symbol}</p>
                      <p className="font-medium text-dex-text">{pos.token0Amount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-dex-muted text-xs">{pos.pair.token1.symbol}</p>
                      <p className="font-medium text-dex-text">{pos.token1Amount}</p>
                    </div>
                    {pos.valueUSD !== undefined && (
                      <div className="text-right">
                        <p className="text-dex-muted text-xs">Value</p>
                        <p className="font-medium text-dex-text">{formatUSD(pos.valueUSD)}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/liquidity/add?tokenA=${pos.pair.token0.address}&tokenB=${pos.pair.token1.address}`}
                      className="rounded-lg border border-dex-border px-3 py-1.5 text-xs font-medium text-dex-text hover:bg-dex-surface-2 transition-colors"
                    >
                      + Add
                    </Link>
                    <Link
                      href={`/liquidity/remove?pair=${pos.pair.address}`}
                      className="rounded-lg border border-dex-border px-3 py-1.5 text-xs font-medium text-dex-red hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* All pairs table */}
      <section>
        <h2 className="text-base font-semibold text-dex-text mb-3">All Pools</h2>
        {pairsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-dex-pink" />
          </div>
        ) : pairs.length === 0 ? (
          <div className="rounded-2xl border border-dex-border bg-dex-surface p-8 text-center text-sm text-dex-muted">
            No pools yet. Be the first to add liquidity!
          </div>
        ) : (
          <div className="rounded-2xl border border-dex-border bg-dex-surface overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dex-border bg-dex-surface-2 text-xs text-dex-muted">
                    <th className="px-5 py-3 text-left font-medium">Pool</th>
                    <th className="px-5 py-3 text-right font-medium">TVL</th>
                    <th className="px-5 py-3 text-right font-medium">Volume 24h</th>
                    <th className="px-5 py-3 text-right font-medium">APR</th>
                    <th className="px-5 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((pair, idx) => (
                    <tr
                      key={pair.address}
                      className={cn(
                        'transition-colors hover:bg-dex-surface-2',
                        idx !== pairs.length - 1 && 'border-b border-dex-border',
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            <TokenIcon token={pair.token0} size={22} className="ring-1 ring-white" />
                            <TokenIcon token={pair.token1} size={22} className="ring-1 ring-white" />
                          </div>
                          <span className="font-medium text-dex-text">
                            {pair.token0.symbol} / {pair.token1.symbol}
                          </span>
                          <span className="rounded-full bg-dex-pink-light px-2 py-0.5 text-xs font-medium text-dex-pink">
                            0.30%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-dex-text font-medium">
                        {pair.tvlUSD ? formatCompact(pair.tvlUSD) : '—'}
                      </td>
                      <td className="px-5 py-4 text-right text-dex-text">
                        {pair.volume24hUSD ? formatCompact(pair.volume24hUSD) : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-dex-green font-medium">
                          {pair.apr ? `${pair.apr.toFixed(2)}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/liquidity/add?tokenA=${pair.token0.address}&tokenB=${pair.token1.address}`}
                          className="rounded-lg bg-dex-pink-light px-3 py-1.5 text-xs font-semibold text-dex-pink hover:bg-dex-pink hover:text-white transition-colors"
                        >
                          + Add
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
