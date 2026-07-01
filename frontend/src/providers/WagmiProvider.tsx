'use client'

import React from 'react'
import { WagmiProvider as WagmiRoot, createConfig, http } from 'wagmi'
import { sepolia, baseSepolia } from 'wagmi/chains'
import { defineChain } from 'viem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

// ─── ARC Testnet — Chain ID 5042002, native gas = USDC ───────────────────────
// https://docs.arc.network/arc/references/connect-to-arc
const arcTestnet = defineChain({
  id:   5042002,
  name: 'ARC Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_ARC_TESTNET ?? 'https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
})

// ─── Wagmi config — 3 networks: Sepolia, Base Sepolia, ARC ───────────────────
const config = createConfig({
  chains: [sepolia, baseSepolia, arcTestnet],
  transports: {
    [sepolia.id]:     http(process.env.NEXT_PUBLIC_RPC_SEPOLIA      ?? 'https://rpc.sepolia.org'),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? 'https://sepolia.base.org'),
    [arcTestnet.id]:  http(process.env.NEXT_PUBLIC_RPC_ARC_TESTNET  ?? 'https://rpc.testnet.arc.network'),
  },
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  ssr: true,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, refetchInterval: 15_000, retry: 1 },
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
