'use client'

import React from 'react'
import { Wallet, Droplets, ArrowLeftRight, TrendingUp } from 'lucide-react'
import { formatUSD, formatCompact, formatPct, cn } from '@/lib/utils'

interface Stat {
  label:    string
  value:    string
  sub?:     string
  change?:  number
  icon:     React.ReactNode
  color:    string
}

interface StatsCardsProps {
  portfolioUSD:   number
  totalLiqUSD:    number
  totalSwaps:     number
  feesEarned:     number
  portfolioChange: number
}

export default function StatsCards({
  portfolioUSD,
  totalLiqUSD,
  totalSwaps,
  feesEarned,
  portfolioChange,
}: StatsCardsProps) {
  const stats: Stat[] = [
    {
      label:  'Portfolio Value',
      value:  formatUSD(portfolioUSD),
      sub:    '24h change',
      change: portfolioChange,
      icon:   <Wallet size={18} />,
      color:  'text-dex-pink bg-dex-pink-light',
    },
    {
      label: 'Total Liquidity',
      value: formatCompact(totalLiqUSD),
      sub:   'across all pools',
      icon:  <Droplets size={18} />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Swaps',
      value: String(totalSwaps),
      sub:   'all time',
      icon:  <ArrowLeftRight size={18} />,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Fees Earned',
      value: formatUSD(feesEarned),
      sub:   'from liquidity',
      icon:  <TrendingUp size={18} />,
      color: 'text-amber-600 bg-amber-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, change, icon, color }) => (
        <div
          key={label}
          className="rounded-2xl border border-dex-border bg-dex-surface p-5 shadow-card hover:shadow-card-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-dex-muted">{label}</p>
            <div className={cn('rounded-lg p-2', color)}>{icon}</div>
          </div>
          <p className="text-2xl font-bold text-dex-text">{value}</p>
          {sub && (
            <p className="mt-1 text-xs text-dex-muted">
              {change !== undefined ? (
                <span className={cn('font-medium', change >= 0 ? 'text-dex-green' : 'text-dex-red')}>
                  {formatPct(change)}{' '}
                </span>
              ) : null}
              {sub}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
