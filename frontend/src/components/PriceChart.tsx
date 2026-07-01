'use client'

import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn, formatCompact } from '@/lib/utils'

interface DataPoint {
  time:  string
  price: number
}

interface PriceChartProps {
  data:      DataPoint[]
  className?: string
  color?:    string
  height?:   number
  label?:    string
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-dex-border bg-dex-surface px-3 py-2 shadow-card-md text-sm">
      <p className="text-dex-muted text-xs">{label}</p>
      <p className="font-semibold text-dex-text">{formatCompact(payload[0].value)}</p>
    </div>
  )
}

export default function PriceChart({
  data,
  className,
  color   = '#7C3AED',
  height  = 200,
  label,
}: PriceChartProps) {
  const minVal = useMemo(() => Math.min(...data.map((d) => d.price)) * 0.995, [data])
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.price)) * 1.005, [data])

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className={cn('flex items-center justify-center rounded-xl bg-dex-surface-2 text-dex-muted text-sm', className)}
      >
        No chart data
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {label && <p className="mb-2 text-xs font-medium text-dex-muted">{label}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatCompact(v).replace('$', '')}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill="url(#colorGrad)"
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Utility: generate mock price history for dev / empty states ────────────────
export function generateMockPriceData(
  basePrice: number,
  points = 30,
  volatility = 0.02,
): DataPoint[] {
  const now    = Date.now()
  const step   = (24 * 60 * 60 * 1000) / points
  let price    = basePrice

  return Array.from({ length: points }, (_, i) => {
    price = price * (1 + (Math.random() - 0.5) * 2 * volatility)
    const d = new Date(now - (points - i) * step)
    return {
      time:  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Math.max(price, 0.000001),
    }
  })
}
