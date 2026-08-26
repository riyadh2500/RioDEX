'use client'

import React from 'react'
import { WagmiProvider as WagmiRoot, createConfig, http } from 'wagmi'
import { sepolia, baseSepolia, hardhat } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

// ─── Wagmi config — 3 networks: Localhost, Ethereum Sepolia, Base Sepolia ─────
const config = createConfig({
  chains: [hardhat, sepolia, baseSepolia],
  transports: {
    [hardhat.id]:     http('http://127.0.0.1:8545'),
    [sepolia.id]:     http(process.env.NEXT_PUBLIC_RPC_SEPOLIA      ?? 'https://rpc.sepolia.org'),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? 'https://sepolia.base.org'),
  },
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  ssr: false,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            20_000,
      gcTime:               5 * 60_000,
      retry:                1,
      refetchOnWindowFocus: true,
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
