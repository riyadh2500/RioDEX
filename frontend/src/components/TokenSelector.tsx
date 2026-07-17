'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useChainId } from 'wagmi'
import { Token } from '@/types/token'
import { useTokenListStore } from '@/stores/useTokenListStore'
import { useAccount } from 'wagmi'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import TokenIcon from './TokenIcon'
import { cn } from '@/lib/utils'
import { Search, X, ChevronDown } from 'lucide-react'
import { DEFAULT_CHAIN_ID } from '@/config/networks'
import { getTestnetTokens } from '@/config/testnetTokens'

interface TokenSelectorProps {
  selected:  Token | null
  onChange:  (token: Token) => void
  disabled?: boolean
  label?:    string
}

function TokenRow({ token, onSelect, address }: {
  token:    Token
  onSelect: (t: Token) => void
  address:  `0x${string}` | undefined
}) {
  const { balance } = useTokenBalance(token, address)
  return (
    <button
      onClick={() => onSelect(token)}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 hover:bg-dex-surface-2 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <TokenIcon token={token} size={36} />
        <div className="text-left">
          <p className="text-sm font-semibold text-dex-text group-hover:text-dex-pink">{token.symbol}</p>
          <p className="text-xs text-dex-muted truncate max-w-[160px]">{token.name}</p>
        </div>
      </div>
      <span className="text-sm font-medium text-dex-text tabular-nums">{balance}</span>
    </button>
  )
}

export default function TokenSelector({ selected, onChange, disabled, label }: TokenSelectorProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const { address }       = useAccount()

  // Use the live wagmi chainId — this is the source of truth
  const liveChainId  = useChainId() ?? DEFAULT_CHAIN_ID
  const setChainId   = useTokenListStore((s) => s.setChainId)
  const customTokens = useTokenListStore((s) => s.customTokens)

  // Sync store chainId with wagmi chainId whenever it changes
  useEffect(() => {
    setChainId(liveChainId)
  }, [liveChainId, setChainId])

  // Always derive tokens from liveChainId — never from persisted store chainId
  const tokens = useMemo(() => {
    const fresh  = getTestnetTokens(liveChainId)
    const custom = customTokens.filter((t) => t.chainId === liveChainId)
    const map    = new Map<string, Token>()
    for (const t of [...fresh, ...custom]) map.set(t.address.toLowerCase(), t)
    return Array.from(map.values())
  }, [liveChainId, customTokens])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return tokens
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q),
    )
  }, [tokens, query])

  function handleSelect(token: Token) {
    onChange(token)
    setOpen(false)
    setQuery('')
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
          selected
            ? 'bg-dex-surface border border-dex-border shadow-card hover:bg-dex-surface-2 text-dex-text'
            : 'bg-dex-pink text-white hover:bg-dex-purple',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {selected ? (
          <>
            <TokenIcon token={selected} size={20} />
            {selected.symbol}
          </>
        ) : (
          <span>{label ?? 'Select token'}</span>
        )}
        <ChevronDown size={14} className={cn(selected ? 'text-dex-muted' : 'text-white/80')} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-dex-border bg-dex-surface shadow-card-lg animate-slide-down">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-dex-border px-5 py-4">
              <h3 className="font-semibold text-dex-text">Select token</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-dex-muted hover:bg-dex-surface-2 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-dex-border">
              <div className="flex items-center gap-2 rounded-xl border border-dex-border bg-dex-surface-2 px-3 py-2 focus-within:border-dex-pink focus-within:ring-2 focus-within:ring-dex-pink/20 transition-all">
                <Search size={16} className="shrink-0 text-dex-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, symbol, or address"
                  className="flex-1 bg-transparent text-sm text-dex-text placeholder:text-dex-muted outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-dex-muted hover:text-dex-text">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Token list */}
            <div className="max-h-72 overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm font-medium text-dex-text">No tokens found</p>
                  <p className="text-xs text-dex-muted">
                    {tokens.length === 0
                      ? 'Connect your wallet to see tokens for this network.'
                      : 'Try a different search term.'}
                  </p>
                </div>
              ) : (
                filtered.map((token) => (
                  <TokenRow
                    key={token.address}
                    token={token}
                    onSelect={handleSelect}
                    address={address}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-dex-border px-4 py-3">
              <p className="text-center text-xs text-dex-muted">
                Don&apos;t see your token?{' '}
                <a href="/launch" className="text-dex-pink hover:underline">Launch one</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
