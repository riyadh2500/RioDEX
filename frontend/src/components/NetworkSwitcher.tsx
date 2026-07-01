'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useChainId, useSwitchChain } from 'wagmi'
import { ChevronDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { getAllNetworks, getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { NetworkConfig } from '@/types/chain'
import { cn } from '@/lib/utils'
import { useTokenListStore } from '@/stores/useTokenListStore'
import { getTestnetTokens } from '@/config/testnetTokens'

const NETWORKS = getAllNetworks()

export default function NetworkSwitcher() {
  const chainId              = useChainId() ?? DEFAULT_CHAIN_ID
  const { switchChain, isPending, error } = useSwitchChain()
  const [open, setOpen]      = useState(false)
  const ref                  = useRef<HTMLDivElement>(null)

  const setChainId  = useTokenListStore((s) => s.setChainId)
  const setTokens   = useTokenListStore((s) => s.setTokens)

  // Active network — graceful fallback
  let active: NetworkConfig
  try { active = getNetwork(chainId) }
  catch { active = getNetwork(DEFAULT_CHAIN_ID) }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  function handleSwitch(network: NetworkConfig) {
    setOpen(false)
    if (network.chainId === chainId) return

    // Update token store immediately — MetaMask switch may take a moment
    setChainId(network.chainId)
    setTokens(getTestnetTokens(network.chainId))

    switchChain?.({ chainId: network.chainId as any })
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
          open
            ? 'border-dex-pink bg-dex-pink-light text-dex-pink'
            : 'border-dex-border bg-dex-surface-2 text-dex-muted hover:border-dex-pink hover:text-dex-text',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch network"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin text-dex-pink" />
        ) : (
          <Image
            src={active.logoUrl}
            alt={active.shortName}
            width={14}
            height={14}
            className="rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            unoptimized
          />
        )}
        <span className="hidden sm:inline">{active.shortName}</span>
        <ChevronDown
          size={12}
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-dex-border bg-dex-surface shadow-dropdown animate-slide-down z-[60]"
        >
          {/* Header */}
          <div className="border-b border-dex-border px-4 py-2.5">
            <p className="text-xs font-semibold text-dex-muted uppercase tracking-wide">Select Network</p>
          </div>

          {/* Network list */}
          <div className="py-1.5 px-1.5 space-y-0.5">
            {NETWORKS.map((net) => {
              const isActive  = net.chainId === chainId
              return (
                <button
                  key={net.chainId}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSwitch(net)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-dex-pink-light text-dex-pink'
                      : 'text-dex-text hover:bg-dex-surface-2',
                  )}
                >
                  {/* Chain logo */}
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dex-surface-2 border border-dex-border overflow-hidden">
                    <Image
                      src={net.logoUrl}
                      alt={net.name}
                      width={20}
                      height={20}
                      className="rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      unoptimized
                    />
                  </div>

                  {/* Name + badge */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">{net.name}</p>
                    <p className="text-xs text-dex-muted">{net.nativeCurrency.symbol}</p>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {isActive ? (
                      <CheckCircle2 size={15} className="text-dex-pink" />
                    ) : (
                      <span className="rounded-full bg-dex-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-dex-muted border border-dex-border">
                        {net.testnet ? 'Testnet' : 'Mainnet'}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="border-t border-dex-border mx-3 mb-2 mt-1 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-dex-red">
              <AlertCircle size={13} className="shrink-0" />
              <span className="truncate">{error.message.slice(0, 60)}</span>
            </div>
          )}

          {/* Footer hint */}
          <div className="border-t border-dex-border px-4 py-2.5">
            <p className="text-[11px] text-dex-muted text-center">
              MetaMask will prompt you to switch
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
