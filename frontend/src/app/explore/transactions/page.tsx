'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import TokenIcon from '@/components/TokenIcon'
import { formatUSD, formatCompact, timeAgo, shortenAddress, cn } from '@/lib/utils'
import { Search, Loader2, ArrowRight, ExternalLink } from 'lucide-react'
import { SwapEvent } from '@/types/pair'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'

const network = getNetwork(DEFAULT_CHAIN_ID)

type TxType = 'all' | 'swap' | 'add' | 'remove'

// Mock data generator — replace with a real Supabase query in production
function generateMockTxs(count = 30): SwapEvent[] {
  const tokens = [
    { address: 'native', symbol: 'ETH',  name: 'Ether',     decimals: 18, chainId: DEFAULT_CHAIN_ID, logoURI: '/tokens/eth.svg' },
    { address: '0xusdc', symbol: 'USDC', name: 'USD Coin',   decimals: 6,  chainId: DEFAULT_CHAIN_ID, logoURI: '/tokens/usdc.svg' },
    { address: '0xusdt', symbol: 'USDT', name: 'Tether USD', decimals: 6,  chainId: DEFAULT_CHAIN_ID, logoURI: '/tokens/usdt.svg' },
  ]
  return Array.from({ length: count }, (_, i) => {
    const tIn  = tokens[Math.floor(Math.random() * tokens.length)]
    const tOut = tokens.filter((t) => t.address !== tIn.address)[Math.floor(Math.random() * 2)]
    const amtIn  = (Math.random() * 10).toFixed(4)
    const amtOut = (parseFloat(amtIn) * (0.95 + Math.random() * 0.1)).toFixed(4)
    const ts = new Date(Date.now() - i * 1000 * 60 * Math.floor(Math.random() * 30)).toISOString()
    return {
      id:          `tx-${i}`,
      txHash:      `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      pairAddress: `0xpair${i}`,
      sender:      `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      tokenIn:     tIn,
      tokenOut:    tOut,
      amountIn:    amtIn,
      amountOut:   amtOut,
      valueUSD:    parseFloat(amtIn) * network.nativeUSDPrice,
      timestamp:   ts,
    }
  })
}

export default function ExploreTransactionsPage() {
  const [query, setQuery]   = useState('')
  const [filter, setFilter] = useState<TxType>('all')

  const { data: txs = [], isLoading } = useQuery<SwapEvent[]>({
    queryKey: ['transactions'],
    queryFn:  async () => {
      // Production: fetch from Supabase swap_events table
      // await fetch('/api/transactions')
      return generateMockTxs(40)
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  })

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return txs.filter((tx) => {
      if (q && !tx.txHash.toLowerCase().includes(q) && !tx.sender.toLowerCase().includes(q)) return false
      return true
    })
  }, [txs, query])

  const totalVol = txs.reduce((s, t) => s + (t.valueUSD ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Transactions',  value: String(txs.length) },
          { label: 'Total Volume',  value: formatCompact(totalVol) },
          { label: 'Avg Tx Value',  value: txs.length ? formatUSD(totalVol / txs.length) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-dex-border bg-dex-surface p-4 shadow-card">
            <p className="text-xs text-dex-muted">{label}</p>
            <p className="mt-1 text-xl font-bold text-dex-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-dex-border bg-dex-surface px-3 py-2 shadow-card w-full max-w-sm">
          <Search size={15} className="shrink-0 text-dex-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by tx hash or address…"
            className="flex-1 bg-transparent text-sm text-dex-text placeholder:text-dex-muted outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-dex-border bg-dex-surface-2 p-1">
          {(['all', 'swap', 'add', 'remove'] as TxType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                'rounded px-3 py-1 text-xs font-medium capitalize transition-colors',
                filter === t
                  ? 'bg-dex-surface shadow-card text-dex-pink'
                  : 'text-dex-muted hover:text-dex-text',
              )}
            >
              {t}
            </button>
          ))}
        </div>
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
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Swap</th>
                  <th className="px-5 py-3 text-right font-medium hidden md:table-cell">Value</th>
                  <th className="px-5 py-3 text-right font-medium hidden md:table-cell">Account</th>
                  <th className="px-5 py-3 text-right font-medium">Time</th>
                  <th className="px-5 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-dex-muted text-sm">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx, idx) => (
                    <tr
                      key={tx.id}
                      className={cn(
                        'transition-colors hover:bg-dex-surface-2',
                        idx !== filtered.length - 1 && 'border-b border-dex-border',
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-dex-pink-light px-2 py-0.5 text-xs font-semibold text-dex-pink">
                          Swap
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <TokenIcon token={tx.tokenIn} size={18} />
                            <span className="font-medium text-dex-text">
                              {Number(tx.amountIn).toFixed(4)} {tx.tokenIn.symbol}
                            </span>
                          </div>
                          <ArrowRight size={12} className="text-dex-muted" />
                          <div className="flex items-center gap-1.5">
                            <TokenIcon token={tx.tokenOut} size={18} />
                            <span className="font-medium text-dex-text">
                              {Number(tx.amountOut).toFixed(4)} {tx.tokenOut.symbol}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-dex-text hidden md:table-cell">
                        {tx.valueUSD ? formatUSD(tx.valueUSD) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right hidden md:table-cell">
                        <span className="font-mono text-xs text-dex-muted">
                          {shortenAddress(tx.sender)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-dex-muted">
                        {timeAgo(tx.timestamp)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <a
                          href={`${network.explorerUrl}/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-dex-muted hover:text-dex-pink transition-colors"
                          aria-label="View on explorer"
                        >
                          <ExternalLink size={13} />
                        </a>
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
