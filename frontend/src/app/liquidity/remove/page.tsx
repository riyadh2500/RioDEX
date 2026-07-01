'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Minus } from 'lucide-react'
import Link from 'next/link'

import { useApproval } from '@/hooks/useApproval'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useSettingsStore, getDeadlineTimestamp } from '@/stores/useSettingsStore'

import TokenIcon from '@/components/TokenIcon'
import SettingsModal from '@/components/SettingsModal'
import ConnectWalletButton from '@/components/ConnectWalletButton'

import { DEX_PAIR_ABI, DEX_ROUTER_ABI, ERC20_ABI } from '@/lib/abis'
import { cn } from '@/lib/utils'
import { formatTokenAmount } from '@/config/tokens'
import { DEFAULT_CHAIN_ID } from '@/config/networks'
import { Token } from '@/types/token'

const PERCENTAGES = [25, 50, 75, 100]

export default function RemoveLiquidityPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-dex-pink border-t-transparent" /></div>}>
      <RemoveLiquidityInner />
    </Suspense>
  )
}

function RemoveLiquidityInner() {
  const { address, isConnected } = useAccount()
  const chainId  = useChainId() ?? DEFAULT_CHAIN_ID
  const params   = useSearchParams()
  const { router } = useContractAddresses()
  const { slippage, deadline } = useSettingsStore()

  const pairAddress = (params.get('pair') ?? '') as `0x${string}`
  const [percentage, setPercentage] = useState(50)

  // Read pair data
  const { data: token0Addr } = useReadContract({ address: pairAddress || undefined, abi: DEX_PAIR_ABI, functionName: 'token0', query: { enabled: !!pairAddress } })
  const { data: token1Addr } = useReadContract({ address: pairAddress || undefined, abi: DEX_PAIR_ABI, functionName: 'token1', query: { enabled: !!pairAddress } })
  const { data: reserves }   = useReadContract({ address: pairAddress || undefined, abi: DEX_PAIR_ABI, functionName: 'getReserves', query: { enabled: !!pairAddress } })
  const { data: totalSupply }= useReadContract({ address: pairAddress || undefined, abi: DEX_PAIR_ABI, functionName: 'totalSupply', query: { enabled: !!pairAddress } })
  const { data: lpBalance }  = useReadContract({ address: pairAddress || undefined, abi: DEX_PAIR_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!pairAddress && !!address } })

  // Token metadata
  const { data: t0Name }    = useReadContract({ address: token0Addr as `0x${string}` | undefined, abi: ERC20_ABI, functionName: 'name',    query: { enabled: !!token0Addr } })
  const { data: t0Symbol }  = useReadContract({ address: token0Addr as `0x${string}` | undefined, abi: ERC20_ABI, functionName: 'symbol',  query: { enabled: !!token0Addr } })
  const { data: t0Dec }     = useReadContract({ address: token0Addr as `0x${string}` | undefined, abi: ERC20_ABI, functionName: 'decimals',query: { enabled: !!token0Addr } })
  const { data: t1Name }    = useReadContract({ address: token1Addr as `0x${string}` | undefined, abi: ERC20_ABI, functionName: 'name',    query: { enabled: !!token1Addr } })
  const { data: t1Symbol }  = useReadContract({ address: token1Addr as `0x${string}` | undefined, abi: ERC20_ABI, functionName: 'symbol',  query: { enabled: !!token1Addr } })
  const { data: t1Dec }     = useReadContract({ address: token1Addr as `0x${string}` | undefined, abi: ERC20_ABI, functionName: 'decimals',query: { enabled: !!token1Addr } })

  const token0: Token | null = token0Addr ? {
    address: token0Addr as string,
    name:    (t0Name as string) ?? '',
    symbol:  (t0Symbol as string) ?? '?',
    decimals:(t0Dec as number) ?? 18,
    chainId,
  } : null

  const token1: Token | null = token1Addr ? {
    address: token1Addr as string,
    name:    (t1Name as string) ?? '',
    symbol:  (t1Symbol as string) ?? '?',
    decimals:(t1Dec as number) ?? 18,
    chainId,
  } : null

  const lpBalanceRaw   = (lpBalance as bigint)   ?? BigInt(0)
  const totalSupplyRaw = (totalSupply as bigint)  ?? BigInt(0)
  const [reserve0, reserve1] = (reserves as [bigint, bigint, number]) ?? [BigInt(0), BigInt(0), 0]

  const liquidityToRemove = (lpBalanceRaw * BigInt(percentage)) / BigInt(100)

  const expectedToken0 = totalSupplyRaw > BigInt(0)
    ? (liquidityToRemove * reserve0) / totalSupplyRaw
    : BigInt(0)
  const expectedToken1 = totalSupplyRaw > BigInt(0)
    ? (liquidityToRemove * reserve1) / totalSupplyRaw
    : BigInt(0)

  const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100))
  const minAmount0  = expectedToken0 * (BigInt(10000) - slippageBps) / BigInt(10000)
  const minAmount1  = expectedToken1 * (BigInt(10000) - slippageBps) / BigInt(10000)

  // Approval for LP token
  const approval = useApproval(
    pairAddress || undefined,
    address,
    router as `0x${string}`,
    liquidityToRemove,
  )

  // Write
  const { writeContract, data: txHash, isPending: txPending } = useWriteContract()
  const { isLoading: txWaiting, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (txSuccess) {
      toast.success('Liquidity removed!', {
        description: `Received ${formatTokenAmount(expectedToken0, token0?.decimals ?? 18)} ${token0?.symbol} + ${formatTokenAmount(expectedToken1, token1?.decimals ?? 18)} ${token1?.symbol}`,
      })
    }
  }, [txSuccess])

  function handleRemove() {
    if (!token0Addr || !token1Addr || !address || !router) return
    const deadlineTs = getDeadlineTimestamp(deadline)
    writeContract({
      address:      router as `0x${string}`,
      abi:          DEX_ROUTER_ABI,
      functionName: 'removeLiquidity',
      args: [
        token0Addr as `0x${string}`,
        token1Addr as `0x${string}`,
        liquidityToRemove,
        minAmount0,
        minAmount1,
        address,
        deadlineTs,
      ],
    })
  }

  const isSubmitting = txPending || txWaiting

  if (!pairAddress) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-dex-muted">
        <p>No pair specified. <Link href="/liquidity" className="text-dex-pink hover:underline">Go back</Link></p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dex-border px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/liquidity" className="text-dex-muted hover:text-dex-text transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-semibold text-dex-text">Remove Liquidity</h1>
          </div>
          <SettingsModal />
        </div>

        <div className="p-5 space-y-5">
          {/* Pair display */}
          <div className="flex items-center gap-3 rounded-xl border border-dex-border bg-dex-surface-2 px-4 py-3">
            <div className="flex -space-x-2">
              <TokenIcon token={token0} size={28} className="ring-2 ring-white" />
              <TokenIcon token={token1} size={28} className="ring-2 ring-white" />
            </div>
            <div>
              <p className="font-semibold text-dex-text text-sm">
                {token0?.symbol ?? '…'} / {token1?.symbol ?? '…'}
              </p>
              <p className="text-xs text-dex-muted">
                LP balance: {formatTokenAmount(lpBalanceRaw, 18, 8)}
              </p>
            </div>
          </div>

          {/* Percentage slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-dex-text">Amount to remove</p>
              <p className="text-2xl font-bold text-dex-pink">{percentage}%</p>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="w-full accent-dex-pink"
            />
            <div className="flex gap-2">
              {PERCENTAGES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPercentage(p)}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
                    percentage === p
                      ? 'bg-dex-pink text-white'
                      : 'bg-dex-surface-2 text-dex-muted hover:text-dex-text border border-dex-border',
                  )}
                >
                  {p === 100 ? 'Max' : `${p}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Expected output */}
          <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-4 space-y-3">
            <p className="text-xs font-medium text-dex-muted">You will receive (estimated)</p>
            <div className="space-y-2">
              {[
                { token: token0, amount: expectedToken0 },
                { token: token1, amount: expectedToken1 },
              ].map(({ token, amount }) => token && (
                <div key={token.address} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TokenIcon token={token} size={20} />
                    <span className="text-sm font-medium text-dex-text">{token.symbol}</span>
                  </div>
                  <span className="text-sm font-semibold text-dex-text tabular-nums">
                    {formatTokenAmount(amount, token.decimals)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-dex-border pt-2 flex justify-between text-xs text-dex-muted">
              <span>LP to burn</span>
              <span>{formatTokenAmount(liquidityToRemove, 18, 8)}</span>
            </div>
          </div>

          {/* CTA */}
          {!isConnected ? (
            <ConnectWalletButton fullWidth />
          ) : approval.needsApproval ? (
            <button
              onClick={approval.approve}
              disabled={approval.approveLoading}
              className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              {approval.approveLoading && <Loader2 size={14} className="inline mr-2 animate-spin" />}
              Approve LP Token
            </button>
          ) : (
            <button
              onClick={handleRemove}
              disabled={isSubmitting || lpBalanceRaw === BigInt(0)}
              className={cn(
                'w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
                isSubmitting || lpBalanceRaw === BigInt(0)
                  ? 'bg-dex-surface-2 text-dex-muted border border-dex-border cursor-not-allowed'
                  : 'bg-dex-red text-white hover:bg-red-700 shadow-card',
              )}
            >
              {isSubmitting && <Loader2 size={14} className="inline mr-2 animate-spin" />}
              {isSubmitting ? 'Removing…' : 'Remove Liquidity'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
