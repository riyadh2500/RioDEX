'use client'

import React from 'react'
import Link from 'next/link'
import { LiquidityPosition } from '@/types/pair'
import TokenIcon from '@/components/TokenIcon'
import { formatUSD, cn } from '@/lib/utils'
import { Droplets, Plus } from 'lucide-react'

interface Props {
  positions: LiquidityPosition[]
  isLoading?: boolean
}

export default function LiquidityPositionsTable({ positions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-dex-surface-2 animate-pulse" />
        ))}
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-8 text-center space-y-3">
        <Droplets size={28} className="mx-auto text-dex-muted" />
        <p className="text-sm text-dex-muted">No liquidity positions</p>
        <Link
          href="/liquidity/add"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-dex-pink hover:underline"
        >
          <Plus size={12} /> Add Liquidity
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {positions.map((pos) => (
        <div
          key={pos.pair.address}
          className="flex items-center justify-between rounded-xl border border-dex-border bg-dex-surface px-4 py-3 hover:bg-dex-surface-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              <TokenIcon token={pos.pair.token0} size={24} className="ring-2 ring-white" />
              <TokenIcon token={pos.pair.token1} size={24} className="ring-2 ring-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dex-text">
                {pos.pair.token0.symbol} / {pos.pair.token1.symbol}
              </p>
              <p className="text-xs text-dex-muted">{(pos.share * 100).toFixed(4)}% of pool</p>
            </div>
          </div>

          <div className="hidden sm:flex gap-5 text-xs">
            <div className="text-right">
              <p className="text-dex-muted">{pos.pair.token0.symbol}</p>
              <p className="font-medium text-dex-text">{pos.token0Amount}</p>
            </div>
            <div className="text-right">
              <p className="text-dex-muted">{pos.pair.token1.symbol}</p>
              <p className="font-medium text-dex-text">{pos.token1Amount}</p>
            </div>
            {pos.valueUSD !== undefined && (
              <div className="text-right">
                <p className="text-dex-muted">Value</p>
                <p className="font-medium text-dex-text">{formatUSD(pos.valueUSD)}</p>
              </div>
            )}
          </div>

          <div className="flex gap-1.5">
            <Link
              href={`/liquidity/add?tokenA=${pos.pair.token0.address}&tokenB=${pos.pair.token1.address}`}
              className="rounded-lg border border-dex-border px-2.5 py-1 text-xs font-medium text-dex-text hover:bg-dex-surface-2"
            >
              +
            </Link>
            <Link
              href={`/liquidity/remove?pair=${pos.pair.address}`}
              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-dex-red hover:bg-red-50"
            >
              −
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
