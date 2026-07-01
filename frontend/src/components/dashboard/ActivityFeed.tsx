'use client'

import React from 'react'
import { SwapEvent } from '@/types/pair'
import TokenIcon from '@/components/TokenIcon'
import { timeAgo, formatUSD, cn } from '@/lib/utils'
import { ArrowRight, Droplets, Rocket } from 'lucide-react'

type ActivityItem =
  | { type: 'swap';   data: SwapEvent }
  | { type: 'add';    label: string; timestamp: string }
  | { type: 'remove'; label: string; timestamp: string }
  | { type: 'launch'; label: string; timestamp: string }

interface Props {
  swaps:      SwapEvent[]
  isLoading?: boolean
}

export default function ActivityFeed({ swaps, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-dex-surface-2" />
            <div className="flex-1 space-y-1.5 py-1">
              <div className="h-3 rounded bg-dex-surface-2 w-3/4" />
              <div className="h-2 rounded bg-dex-surface-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (swaps.length === 0) {
    return (
      <p className="text-sm text-dex-muted py-4 text-center">No recent activity</p>
    )
  }

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
      {swaps.map((swap) => (
        <div key={swap.id} className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dex-pink-light text-dex-pink">
            <ArrowRight size={14} />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1">
                <TokenIcon token={swap.tokenIn} size={14} />
                <span className="text-xs font-medium text-dex-text">
                  {Number(swap.amountIn).toFixed(4)} {swap.tokenIn.symbol}
                </span>
              </div>
              <ArrowRight size={10} className="text-dex-muted" />
              <div className="flex items-center gap-1">
                <TokenIcon token={swap.tokenOut} size={14} />
                <span className="text-xs font-medium text-dex-text">
                  {Number(swap.amountOut).toFixed(4)} {swap.tokenOut.symbol}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {swap.valueUSD && (
                <span className="text-xs text-dex-muted">{formatUSD(swap.valueUSD)}</span>
              )}
              <span className="text-xs text-dex-muted">·</span>
              <span className="text-xs text-dex-muted">{timeAgo(swap.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
