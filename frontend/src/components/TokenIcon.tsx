'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Token } from '@/types/token'

interface TokenIconProps {
  token: Token | null | undefined
  size?: number
  className?: string
}

/** Renders a token's logo or a coloured letter-avatar fallback */
export default function TokenIcon({ token, size = 32, className }: TokenIconProps) {
  const [imgError, setImgError] = useState(false)

  if (!token) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn('rounded-full bg-dex-surface-2 border border-dex-border flex items-center justify-center', className)}
      />
    )
  }

  const letter = token.symbol?.[0]?.toUpperCase() ?? '?'

  // Colour based on symbol hash for visual variety
  const colours = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-sky-100 text-sky-700',
  ]
  const colour = colours[(token.symbol?.charCodeAt(0) ?? 0) % colours.length]

  if (token.logoURI && !imgError) {
    return (
      <Image
        src={token.logoURI}
        alt={token.symbol}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        onError={() => setImgError(true)}
        unoptimized
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        'rounded-full flex items-center justify-center font-bold border border-white/50',
        colour,
        className,
      )}
    >
      {letter}
    </div>
  )
}
