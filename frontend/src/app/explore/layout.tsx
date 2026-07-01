'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Coins, Droplets, ArrowLeftRight } from 'lucide-react'

const TABS = [
  { href: '/explore/tokens',       label: 'Tokens',       icon: Coins },
  { href: '/explore/pools',        label: 'Pools',        icon: Droplets },
  { href: '/explore/transactions', label: 'Transactions', icon: ArrowLeftRight },
]

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-dex-text">Explore</h1>
        <p className="text-sm text-dex-muted mt-1">Live on-chain data for tokens, pools, and swaps.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-dex-border bg-dex-surface-2 p-1 w-fit">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-dex-surface shadow-card text-dex-pink'
                  : 'text-dex-muted hover:text-dex-text',
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          )
        })}
      </div>

      {children}
    </div>
  )
}
