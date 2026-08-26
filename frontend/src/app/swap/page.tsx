'use client'

import React from 'react'
import { ArrowLeftRight, Clock } from 'lucide-react'
import Link from 'next/link'

export default function SwapPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-dex-pink-light">
            <ArrowLeftRight size={40} className="text-dex-pink" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-dex-border bg-dex-surface-2 px-4 py-1.5">
          <Clock size={14} className="text-dex-muted" />
          <span className="text-xs font-medium text-dex-muted">Coming Soon</span>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-dex-text">Swap</h1>
          <p className="text-dex-muted text-sm leading-relaxed">
            Token swapping is under development and will be available soon.
            In the meantime, you can add liquidity to earn fees.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/liquidity/add"
            className="rounded-xl bg-dex-pink px-6 py-3 text-sm font-semibold text-white hover:bg-dex-purple transition-colors shadow-card"
          >
            Add Liquidity
          </Link>
          <Link
            href="/liquidity"
            className="rounded-xl border border-dex-border bg-dex-surface px-6 py-3 text-sm font-semibold text-dex-text hover:bg-dex-surface-2 transition-colors"
          >
            View Pools
          </Link>
        </div>
      </div>
    </div>
  )
}
