'use client'

import React from 'react'
import { WagmiProvider as WagmiRoot, createConfig, http } from 'wagmi'
import { sepolia, baseSepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

// ─── Wagmi config — 2 networks: Ethereum Sepolia + Base Sepolia ───────────────
const config = createConfig({
  chains: [sepolia, baseSepolia],
  transports: {
    [sepolia.id]:     http(process.env.NEXT_PUBLIC_RPC_SEPOLIA      ?? 'https://rpc.sepolia.org'),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? 'https://sepolia.base.org'),
  },
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  ssr: true,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:       20_000,   // 20s — don't refetch too aggressively
      gcTime:          5 * 60_000, // 5min cache
      retry:           1,
      refetchOnWindowFocus: true,
      // No global refetchInterval — let each query control its own
    },
  },
})

export default function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiRoot config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiRoot>
  )
}
