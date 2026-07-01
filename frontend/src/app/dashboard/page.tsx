'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useAccount, useChainId } from 'wagmi'
import { useQuery } from '@tanstack/react-query'

import { useAllPairs } from '@/hooks/useAllPairs'
import { useLiquidityPositions } from '@/hooks/useLiquidityPositions'
import { useAllTokens } from '@/hooks/useAllTokens'
import { useTokenListStore } from '@/stores/useTokenListStore'
import { useTokenBalance } from '@/hooks/useTokenBalance'

import StatsCards from '@/components/dashboard/StatsCards'
import LiquidityPositionsTable from '@/components/dashboard/LiquidityPositionsTable'
import CreatedTokensTable from '@/components/dashboard/CreatedTokensTable'
import SwapHistoryTable from '@/components/dashboard/SwapHistoryTable'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import PriceChart, { generateMockPriceData } from '@/components/PriceChart'

import { SwapEvent } from '@/types/pair'
import { formatUSD, formatCompact } from '@/lib/utils'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { getNativeToken } from '@/config/tokens'
import { ArrowLeftRight, Plus, Rocket } from 'lucide-react'

const network = getNetwork(DEFAULT_CHAIN_ID)

// Generate mock swap history for the connected wallet
function generateMockSwapHistory(address: string, count = 10): SwapEvent[] {
  const tokens = [
    { address: 'native', symbol: 'ETH',  name: 'Ether',     decimals: 18, chainId: DEFAULT_CHAIN_ID, logoURI: '/tokens/eth.svg' },
    { address: '0xusdc', symbol: 'USDC', name: 'USD Coin',   decimals: 6,  chainId: DEFAULT_CHAIN_ID, logoURI: '/tokens/usdc.svg' },
    { address: '0xusdt', symbol: 'USDT', name: 'Tether USD', decimals: 6,  chainId: DEFAULT_CHAIN_ID, logoURI: '/tokens/usdt.svg' },
  ]
  return Array.from({ length: count }, (_, i) => {
    const tIn  = tokens[i % tokens.length]
    const tOut = tokens[(i + 1) % tokens.length]
    const amtIn  = (Math.random() * 5 + 0.1).toFixed(4)
    const amtOut = (parseFloat(amtIn) * (0.97 + Math.random() * 0.06)).toFixed(4)
    return {
      id:          `${address.slice(0, 8)}-${i}`,
      txHash:      `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      pairAddress: `0xpair${i}`,
      sender:      address,
      tokenIn:     tIn,
      tokenOut:    tOut,
      amountIn:    amtIn,
      amountOut:   amtOut,
      valueUSD:    parseFloat(amtIn) * network.nativeUSDPrice,
      timestamp:   new Date(Date.now() - i * 1000 * 60 * 45).toISOString(),
    }
  })
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID

  const { data: pairs = [], isLoading: pairsLoading } = useAllPairs()
  const { positions, isLoading: posLoading } = useLiquidityPositions(pairs, address)

  // All tokens — seed store
  useAllTokens()
  const getAllTokens = useTokenListStore((s) => s.getAllTokens)
  const allTokens   = useMemo(() => getAllTokens(), [getAllTokens])

  // Tokens launched by this wallet
  const createdTokens = useMemo(
    () => allTokens.filter((t) => t.createdBy?.toLowerCase() === address?.toLowerCase()),
    [allTokens, address],
  )

  // Swap history (mock; replace with Supabase query in prod)
  const { data: swapHistory = [], isLoading: swapsLoading } = useQuery<SwapEvent[]>({
    queryKey: ['swapHistory', address],
    queryFn:  () => (address ? generateMockSwapHistory(address) : []),
    enabled:  !!address,
  })

  // Native balance
  const nativeToken = getNativeToken(chainId)
  const { balance: nativeBalance, balanceRaw } = useTokenBalance(nativeToken, address)

  // Derived stats
  const portfolioUSD = useMemo(() => {
    const ethValue  = parseFloat(nativeBalance || '0') * network.nativeUSDPrice
    const liqValue  = positions.reduce((s, p) => s + (p.valueUSD ?? 0), 0)
    return ethValue + liqValue
  }, [nativeBalance, positions])

  const totalLiqUSD   = positions.reduce((s, p) => s + (p.valueUSD ?? 0), 0)
  const feesEarned    = totalLiqUSD * 0.003 // rough estimate
  const portfolioChange = 2.41 // mock

  const chartData = useMemo(
    () => generateMockPriceData(Math.max(portfolioUSD, 1), 30, 0.02),
    [portfolioUSD],
  )

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-6">
        <div className="text-5xl">📊</div>
        <h1 className="text-2xl font-bold text-dex-text">Your Dashboard</h1>
        <p className="text-dex-muted text-sm">
          Connect your wallet to view your portfolio, liquidity positions, swap history, and tokens you've launched.
        </p>
        <ConnectWalletButton fullWidth label="Connect Wallet" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dex-text">Dashboard</h1>
          <p className="text-sm text-dex-muted mt-1 font-mono">
            {address?.slice(0, 10)}…{address?.slice(-8)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/swap"
            className="flex items-center gap-1.5 rounded-xl border border-dex-border px-3 py-2 text-sm font-medium text-dex-text hover:bg-dex-surface-2 transition-colors"
          >
            <ArrowLeftRight size={14} /> Swap
          </Link>
          <Link
            href="/liquidity/add"
            className="flex items-center gap-1.5 rounded-xl border border-dex-border px-3 py-2 text-sm font-medium text-dex-text hover:bg-dex-surface-2 transition-colors"
          >
            <Plus size={14} /> Add Liquidity
          </Link>
          <Link
            href="/launch"
            className="flex items-center gap-1.5 rounded-xl bg-dex-pink px-3 py-2 text-sm font-semibold text-white hover:bg-dex-purple transition-colors"
          >
            <Rocket size={14} /> Launch Token
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatsCards
        portfolioUSD={portfolioUSD}
        totalLiqUSD={totalLiqUSD}
        totalSwaps={swapHistory.length}
        feesEarned={feesEarned}
        portfolioChange={portfolioChange}
      />

      {/* Portfolio chart + activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Portfolio value chart */}
        <div className="lg:col-span-2 rounded-2xl border border-dex-border bg-dex-surface shadow-card p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-dex-muted">Portfolio Value</p>
              <p className="text-2xl font-bold text-dex-text mt-0.5">{formatUSD(portfolioUSD)}</p>
              <p className="text-sm text-dex-green font-medium">+{portfolioChange}% (30d)</p>
            </div>
            <div className="text-right text-xs text-dex-muted space-y-1">
              <p>ETH: <span className="text-dex-text font-medium">{nativeBalance} ETH</span></p>
              <p>Liquidity: <span className="text-dex-text font-medium">{formatCompact(totalLiqUSD)}</span></p>
            </div>
          </div>
          <PriceChart data={chartData} height={180} />
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card p-5">
          <h2 className="text-sm font-semibold text-dex-text mb-4">Recent Activity</h2>
          <ActivityFeed swaps={swapHistory.slice(0, 8)} isLoading={swapsLoading} />
        </div>
      </div>

      {/* Liquidity positions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-dex-text">Liquidity Positions</h2>
          <Link href="/liquidity" className="text-xs text-dex-pink hover:underline">View all →</Link>
        </div>
        <LiquidityPositionsTable positions={positions} isLoading={posLoading} />
      </section>

      {/* Swap history */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-dex-text">Swap History</h2>
          <Link href="/explore/transactions" className="text-xs text-dex-pink hover:underline">View all →</Link>
        </div>
        <SwapHistoryTable swaps={swapHistory} isLoading={swapsLoading} />
      </section>

      {/* Tokens launched */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-dex-text">Tokens Launched</h2>
          <Link href="/launch" className="text-xs text-dex-pink hover:underline">Launch token →</Link>
        </div>
        <CreatedTokensTable tokens={createdTokens} />
      </section>
    </div>
  )
}
