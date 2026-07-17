'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { cn, truncate } from '@/lib/utils'
import {
  ArrowLeftRight,
  Send,
  Droplets,
  GlassWater,
  Wallet,
  ChevronDown,
  Copy,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import NetworkSwitcher from './NetworkSwitcher'

const NAV_LINKS = [
  { href: '/swap',          label: 'Swap',          icon: ArrowLeftRight },
  { href: '/send',          label: 'Send',          icon: Send           },
  { href: '/liquidity/add', label: 'Add Liquidity', icon: Droplets       },
  { href: '/faucet',        label: 'Faucet',        icon: GlassWater     },
]

export default function Navbar() {
  const pathname                 = usePathname()
  const { address, isConnected } = useAccount()
  const { connect }              = useConnect()
  const { disconnect }           = useDisconnect()
  const [menuOpen, setMenuOpen]  = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)

  function copyAddress() {
    if (address) navigator.clipboard.writeText(address)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-dex-border bg-dex-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link href="/swap" className="flex items-center gap-2 font-bold text-lg text-dex-text">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-dex-pink text-white text-sm font-black">
            R
          </div>
          <span className="hidden sm:block">RioDex</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-dex-pink-light text-dex-pink'
                    : 'text-dex-muted hover:bg-dex-surface-2 hover:text-dex-text',
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* ── Network Switcher ── */}
          <NetworkSwitcher />

          {/* ── Wallet button ── */}
          {isConnected && address ? (
            <div className="relative">
              <button
                onClick={() => setWalletOpen((p) => !p)}
                className="flex items-center gap-2 rounded-lg border border-dex-border bg-dex-surface px-3 py-2 text-sm font-medium text-dex-text shadow-card hover:bg-dex-surface-2 transition-colors"
              >
                <div className="h-2 w-2 rounded-full bg-dex-green" />
                {truncate(address, 4)}
                <ChevronDown size={14} className="text-dex-muted" />
              </button>

              {walletOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-dex-border bg-dex-surface shadow-dropdown animate-slide-down z-50">
                  <div className="p-3 border-b border-dex-border">
                    <p className="text-xs text-dex-muted">Connected</p>
                    <p className="text-sm font-mono font-medium text-dex-text truncate">{address}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { copyAddress(); setWalletOpen(false) }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-dex-text hover:bg-dex-surface-2 transition-colors"
                    >
                      <Copy size={14} /> Copy Address
                    </button>
                    <button
                      onClick={() => { disconnect(); setWalletOpen(false) }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-dex-red hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} /> Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="flex items-center gap-2 rounded-lg bg-dex-pink px-4 py-2 text-sm font-semibold text-white hover:bg-dex-purple transition-colors shadow-card"
            >
              <Wallet size={15} />
              <span className="hidden sm:block">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden rounded-lg p-2 text-dex-muted hover:bg-dex-surface-2 transition-colors"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-dex-border bg-dex-surface px-4 pb-4 pt-2 animate-slide-down">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-dex-pink-light text-dex-pink'
                    : 'text-dex-muted hover:bg-dex-surface-2 hover:text-dex-text',
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}

          {/* Mobile network switcher */}
          <div className="mt-3 pt-3 border-t border-dex-border">
            <p className="mb-2 text-xs font-medium text-dex-muted px-3">Network</p>
            <NetworkSwitcher />
          </div>
        </div>
      )}
    </header>
  )
}
