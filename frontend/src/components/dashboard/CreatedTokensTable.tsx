'use client'

import React from 'react'
import Link from 'next/link'
import { Token } from '@/types/token'
import TokenIcon from '@/components/TokenIcon'
import { shortenAddress, timeAgo, cn } from '@/lib/utils'
import { Rocket, ExternalLink } from 'lucide-react'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'

interface Props {
  tokens:     Token[]
  isLoading?: boolean
}

const network = getNetwork(DEFAULT_CHAIN_ID)

export default function CreatedTokensTable({ tokens, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-dex-surface-2 animate-pulse" />
        ))}
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-8 text-center space-y-3">
        <Rocket size={28} className="mx-auto text-dex-muted" />
        <p className="text-sm text-dex-muted">No tokens launched yet</p>
        <Link href="/launch" className="inline-flex items-center gap-1.5 text-xs font-semibold text-dex-pink hover:underline">
          <Rocket size={12} /> Launch a Token
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-dex-border bg-dex-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dex-border bg-dex-surface-2 text-xs text-dex-muted">
            <th className="px-4 py-3 text-left font-medium">Token</th>
            <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Address</th>
            <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Launched</th>
            <th className="px-4 py-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, idx) => (
            <tr
              key={token.address}
              className={cn('hover:bg-dex-surface-2 transition-colors', idx !== tokens.length - 1 && 'border-b border-dex-border')}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <TokenIcon token={token} size={26} />
                  <div>
                    <p className="font-semibold text-dex-text">{token.symbol}</p>
                    <p className="text-xs text-dex-muted">{token.name}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right hidden sm:table-cell">
                <span className="font-mono text-xs text-dex-muted">{shortenAddress(token.address)}</span>
              </td>
              <td className="px-4 py-3 text-right text-xs text-dex-muted hidden md:table-cell">
                {token.createdAt ? timeAgo(token.createdAt) : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/liquidity/add?tokenA=${token.address}`}
                    className="rounded-lg bg-dex-pink-light px-2.5 py-1 text-xs font-semibold text-dex-pink hover:bg-dex-pink hover:text-white transition-colors"
                  >
                    Add Liquidity
                  </Link>
                  <a
                    href={`${network.explorerUrl}/address/${token.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-dex-border px-2 py-1 text-xs text-dex-muted hover:bg-dex-surface-2"
                    aria-label="View on explorer"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
