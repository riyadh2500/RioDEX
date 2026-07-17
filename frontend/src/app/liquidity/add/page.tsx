'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { toast } from 'sonner'
import { Plus, Info, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { Token } from '@/types/token'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useApproval } from '@/hooks/useApproval'
import { usePairReserves } from '@/hooks/usePairReserves'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { useSettingsStore, getDeadlineTimestamp } from '@/stores/useSettingsStore'
import { useTokenListStore } from '@/stores/useTokenListStore'

import TokenSelector from '@/components/TokenSelector'
import SettingsModal from '@/components/SettingsModal'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import TokenIcon from '@/components/TokenIcon'

import { DEX_ROUTER_ABI } from '@/lib/abis'
import { cn } from '@/lib/utils'
import {
  isNativeToken,
  parseTokenAmount,
  formatTokenAmount,
} from '@/config/tokens'
import { DEFAULT_CHAIN_ID, getNetwork } from '@/config/networks'

function AmountInput({
  label, token, onTokenChange, amount, onAmountChange, userAddress,
}: {
  label: string
  token: Token | null
  onTokenChange: (t: Token) => void
  amount: string
  onAmountChange: (v: string) => void
  userAddress: `0x${string}` | undefined
}) {
  const { balance } = useTokenBalance(token, userAddress)
  return (
    <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-4 space-y-2">
      <div className="flex justify-between">
        <span className="text-xs font-medium text-dex-muted">{label}</span>
        {userAddress && token && (
          <button onClick={() => onAmountChange(balance)} className="text-xs text-dex-pink hover:underline">
            Balance: {balance}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.0"
          className="flex-1 bg-transparent text-2xl font-semibold text-dex-text placeholder:text-dex-muted outline-none"
        />
        <TokenSelector selected={token} onChange={onTokenChange} />
      </div>
    </div>
  )
}

export default function AddLiquidityPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-dex-pink border-t-transparent" /></div>}>
      <AddLiquidityInner />
    </Suspense>
  )
}

function AddLiquidityInner() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID
  const network = (() => { try { return getNetwork(chainId) } catch { return getNetwork(DEFAULT_CHAIN_ID) } })()
  const params  = useSearchParams()
  const { router } = useContractAddresses()
  const { slippage, deadline } = useSettingsStore()

  // Pre-fill from URL params
  const getAllTokens = useTokenListStore((s) => s.getAllTokens)
  const allTokens   = useMemo(() => getAllTokens(), [getAllTokens])

  const [tokenA, setTokenA] = useState<Token | null>(null)
  const [tokenB, setTokenB] = useState<Token | null>(null)
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')

  useEffect(() => {
    const tA = params.get('tokenA')
    const tB = params.get('tokenB')
    if (tA) setTokenA(allTokens.find((t) => t.address.toLowerCase() === tA.toLowerCase()) ?? null)
    if (tB) setTokenB(allTokens.find((t) => t.address.toLowerCase() === tB.toLowerCase()) ?? null)
  }, [params, allTokens])

  // Reserves
  const {
    reserve0, reserve1, pairExists, totalSupply, isLoading: reservesLoading,
  } = usePairReserves(tokenA, tokenB)

  // Auto-quote tokenB amount based on tokenA input
  useEffect(() => {
    const ZERO = BigInt(0)
    if (!amountA || !pairExists || reserve0 === ZERO || reserve1 === ZERO || !tokenA || !tokenB) return
    const rawA = parseTokenAmount(amountA, tokenA.decimals)
    const rawB = (rawA * reserve1) / reserve0
    setAmountB(formatTokenAmount(rawB, tokenB.decimals))
  }, [amountA, reserve0, reserve1, pairExists, tokenA, tokenB])

  const amountARaw  = tokenA ? parseTokenAmount(amountA || '0', tokenA.decimals) : BigInt(0)
  const amountBRaw  = tokenB ? parseTokenAmount(amountB || '0', tokenB.decimals) : BigInt(0)

  const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100))
  const amountAMin  = amountARaw * (BigInt(10000) - slippageBps) / BigInt(10000)
  const amountBMin  = amountBRaw * (BigInt(10000) - slippageBps) / BigInt(10000)

  // Approvals
  const isNativeA = tokenA ? isNativeToken(tokenA.address) : false
  const isNativeB = tokenB ? isNativeToken(tokenB.address) : false

  const approvalA = useApproval(
    !isNativeA && tokenA ? (tokenA.address as `0x${string}`) : undefined,
    address,
    router as `0x${string}`,
    amountARaw,
  )
  const approvalB = useApproval(
    !isNativeB && tokenB ? (tokenB.address as `0x${string}`) : undefined,
    address,
    router as `0x${string}`,
    amountBRaw,
  )

  // Write
  const { writeContract, data: txHash, isPending: txPending } = useWriteContract({
    mutation: {
      onError: (err: any) => {
        toast.error('Transaction failed', {
          description: err?.shortMessage ?? err?.message ?? 'Transaction rejected or reverted',
        })
      },
    },
  })
  const { isLoading: txWaiting, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (txSuccess) {
      toast.success('Liquidity added!', {
        description: `Added ${amountA} ${tokenA?.symbol} + ${amountB} ${tokenB?.symbol}`,
      })
      setAmountA('')
      setAmountB('')
    }
  }, [txSuccess])

  function handleAdd() {
    if (!tokenA || !tokenB || !address || !router) return
    const deadlineTs = getDeadlineTimestamp(deadline)

    if (isNativeA || isNativeB) {
      // Identify which token is ERC-20 and which side is native ETH
      const erc20Token = isNativeA ? tokenB! : tokenA!
      const amtTok     = isNativeA ? amountBRaw : amountARaw
      const amtETH     = isNativeA ? amountARaw : amountBRaw
      const minTok     = isNativeA ? amountBMin : amountAMin
      const minETH     = isNativeA ? amountAMin : amountBMin

      // erc20Token.address must be a real ERC-20 address, never 'native'
      if (erc20Token.address === 'native' || erc20Token.address.length < 10) {
        toast.error('Invalid token address')
        return
      }

      writeContract({
        address:      router as `0x${string}`,
        abi:          DEX_ROUTER_ABI,
        functionName: 'addLiquidityETH',
        args:         [
          erc20Token.address as `0x${string}`,
          amtTok,
          minTok,
          minETH,
          address,
          deadlineTs,
        ],
        value: amtETH,
      })
    } else {
      writeContract({
        address:      router as `0x${string}`,
        abi:          DEX_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          tokenA.address as `0x${string}`,
          tokenB.address as `0x${string}`,
          amountARaw,
          amountBRaw,
          amountAMin,
          amountBMin,
          address,
          deadlineTs,
        ],
      })
    }
  }

  const needsApprovalA = approvalA.needsApproval
  const needsApprovalB = approvalB.needsApproval
  const approveLoading = approvalA.approveLoading || approvalB.approveLoading
  const isSubmitting   = txPending || txWaiting

  function getButtonState(): { label: string; action: () => void; disabled: boolean; variant: 'pink' | 'amber' | 'muted' } {
    if (!isConnected)        return { label: 'Connect Wallet', action: () => {}, disabled: true, variant: 'muted' }
    if (!tokenA || !tokenB)  return { label: 'Select tokens', action: () => {}, disabled: true, variant: 'muted' }
    if (!amountA || !amountB) return { label: 'Enter amounts', action: () => {}, disabled: true, variant: 'muted' }
    if (needsApprovalA)       return { label: approvalA.approveLoading ? 'Approving…' : `Approve ${tokenA.symbol}`, action: approvalA.approve, disabled: approvalA.approveLoading, variant: 'amber' }
    if (needsApprovalB)       return { label: approvalB.approveLoading ? 'Approving…' : `Approve ${tokenB.symbol}`, action: approvalB.approve, disabled: approvalB.approveLoading, variant: 'amber' }
    if (isSubmitting)         return { label: 'Adding Liquidity…', action: () => {}, disabled: true, variant: 'muted' }
    return { label: 'Add Liquidity', action: handleAdd, disabled: false, variant: 'pink' }
  }

  const btn = getButtonState()

  // Pool share estimate
  const poolSharePct = useMemo(() => {
    if (!amountARaw || totalSupply === BigInt(0) || !tokenA) return null
    const estimatedLP    = amountARaw
    const newTotalSupply = totalSupply + estimatedLP
    return ((Number(estimatedLP) / Number(newTotalSupply)) * 100).toFixed(4)
  }, [amountARaw, totalSupply, tokenA])

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dex-border px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/liquidity" className="text-dex-muted hover:text-dex-text transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="font-semibold text-dex-text">Add Liquidity</h1>
          </div>
          <SettingsModal />
        </div>

        <div className="p-4 space-y-3">
          {/* First token is new pair notice */}
          {!pairExists && tokenA && tokenB && (
            <div className="flex gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                You are creating a <strong>new pool</strong>. The ratio of tokens you provide sets the initial price.
                Make sure you are comfortable with this before proceeding.
              </span>
            </div>
          )}

          <AmountInput
            label="Token A"
            token={tokenA}
            onTokenChange={setTokenA}
            amount={amountA}
            onAmountChange={setAmountA}
            userAddress={address}
          />

          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dex-border bg-dex-surface text-dex-muted">
              <Plus size={14} />
            </div>
          </div>

          <AmountInput
            label="Token B"
            token={tokenB}
            onTokenChange={setTokenB}
            amount={amountB}
            onAmountChange={setAmountB}
            userAddress={address}
          />

          {/* Pool info */}
          {tokenA && tokenB && amountA && amountB && (
            <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-4 space-y-2 text-sm">
              <p className="text-xs font-medium text-dex-muted uppercase tracking-wide">Pool info</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-dex-muted">{tokenB.symbol} per {tokenA.symbol}</span>
                  <span className="font-medium text-dex-text">
                    {amountB && amountA && parseFloat(amountA) > 0
                      ? (parseFloat(amountB) / parseFloat(amountA)).toFixed(6)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dex-muted">{tokenA.symbol} per {tokenB.symbol}</span>
                  <span className="font-medium text-dex-text">
                    {amountA && amountB && parseFloat(amountB) > 0
                      ? (parseFloat(amountA) / parseFloat(amountB)).toFixed(6)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dex-muted">Share of pool</span>
                  <span className="font-medium text-dex-text">
                    {pairExists ? (poolSharePct ? `~${poolSharePct}%` : '—') : '100%'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dex-muted">Slippage tolerance</span>
                  <span className={cn('font-medium', parseFloat(slippage) > 1 ? 'text-amber-500' : 'text-dex-text')}>
                    {slippage}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          {!isConnected ? (
            <ConnectWalletButton fullWidth />
          ) : (
            <button
              onClick={btn.action}
              disabled={btn.disabled}
              className={cn(
                'w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
                btn.variant === 'pink'  && 'bg-dex-pink text-white hover:bg-dex-purple shadow-card',
                btn.variant === 'amber' && 'bg-amber-500 text-white hover:bg-amber-600',
                btn.variant === 'muted' && 'bg-dex-surface-2 text-dex-muted border border-dex-border cursor-not-allowed',
              )}
            >
              {(isSubmitting || approveLoading) && (
                <Loader2 size={14} className="inline mr-2 animate-spin" />
              )}
              {btn.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
