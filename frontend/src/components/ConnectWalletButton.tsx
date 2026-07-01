'use client'

import React from 'react'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectWalletButtonProps {
  className?: string
  fullWidth?: boolean
  label?: string
}

export default function ConnectWalletButton({
  className,
  fullWidth,
  label = 'Connect Wallet',
}: ConnectWalletButtonProps) {
  const { isConnected } = useAccount()
  const { connect, isPending } = useConnect()

  if (isConnected) return null

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl bg-dex-pink py-3 text-sm font-semibold text-white hover:bg-dex-purple transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
        fullWidth && 'w-full',
        className,
      )}
    >
      <Wallet size={16} />
      {isPending ? 'Connecting…' : label}
    </button>
  )
}
