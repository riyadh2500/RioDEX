'use client'

import React from 'react'
import { SwapEvent } from '@/types/pair'
import TokenIcon from '@/components/TokenIcon'
import { formatUSD, timeAgo, shortenAddress, cn } from '@/lib/utils'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'

interface Props {
  swaps:      SwapEvent[]
  isLoading?: boolean
}

const network = getNetwork(DEFAULT_CHAIN_ID)

export default function SwapHistoryTable({ swaps, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-dex-surface-2 animate-pulse" />
        ))}
      </div>
    )
  }

  if (swaps.length === 0) {
    return (
      <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-8 text-center">
        <p className="text-sm text-dex-muted">No swap history</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-dex-border bg-dex-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dex-border bg-dex-surface-2 text-xs text-dex-muted">
            <th className="px-4 py-3 text-left font-medium">Swap</th>
            <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Value</th>
            <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Tx</th>
            <th className="px-4 py-3 text-right font-medium">Time</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {swaps.map((swap, idx) => (
            <tr
              key={swap.id}
              className={cn('hover:bg-dex-surface-2 transition-colors', idx !== swaps.length - 1 && 'border-b border-dex-border')}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <TokenIcon token={swap.tokenIn} size={18} />
                    <span className="font-medium text-dex-text text-xs">
                      {Number(swap.amountIn).toFixed(4)} {swap.tokenIn.symbol}
                    </span>
                  </div>
                  <ArrowRight size={11} className="text-dex-muted" />
                  <div className="flex items-center gap-1.5">
                    <TokenIcon token={swap.tokenOut} size={18} />
                    <span className="font-medium text-dex-text text-xs">
                      {Number(swap.amountOut).toFixed(4)} {swap.tokenOut.symbol}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-xs text-dex-muted hidden sm:table-cell">
                {swap.valueUSD ? formatUSD(swap.valueUSD) : '—'}
              </td>
              <td className="px-4 py-3 text-right hidden md:table-cell">
                <span className="font-mono text-xs text-dex-muted">{shortenAddress(swap.txHash)}</span>
              </td>
              <td className="px-4 py-3 text-right text-xs text-dex-muted">
                {timeAgo(swap.timestamp)}
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`${network.explorerUrl}/tx/${swap.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-dex-muted hover:text-dex-pink"
                  aria-label="View on explorer"
                >
                  <ExternalLink size={12} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
