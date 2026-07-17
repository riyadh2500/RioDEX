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
import { useMarketPrices } from '@/hooks/useMarketPrice'

import TokenSelector from '@/components/TokenSelector'
import SettingsModal from '@/components/SettingsModal'
import ConnectWalletButton from '@/components/ConnectWalletButton'

import { DEX_ROUTER_ABI } from '@/lib/abis'
import { cn } from '@/lib/utils'
import {
  isNativeToken,
  parseTokenAmount,
  formatTokenAmount,
} from '@/config/tokens'
import { DEFAULT_CHAIN_ID, getNetwork } from '@/config/networks'

const STABLECOINS = new Set(['USDC', 'USDT', 'EURC', 'DAI'])

function AmountInput({
  label, token, onTokenChange, amount, onAmountChange, userAddress, readOnly,
}: {
  label: string
  token: Token | null
  onTokenChange: (t: Token) => void
  amount: string
  onAmountChange: (v: string) => void
  userAddress: `0x${string}` | undefined
  readOnly?: boolean
}) {
  const { balance, isLoading: balLoading } = useTokenBalance(token, userAddress)
  return (
    <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-4 space-y-2">
      <div className="flex justify-between">
        <span className="text-xs font-medium text-dex-muted">{label}</span>
        {userAddress && token && (
          <button
            onClick={() => onAmountChange(balance === '…' ? '' : balance)}
            className="text-xs text-dex-pink hover:underline"
          >
            Balance: {balance}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {readOnly ? (
          <div className="flex-1 flex items-center h-10">
            {amount ? (
              <span className="text-2xl font-semibold text-dex-text">{amount}</span>
            ) : (
              <Loader2 size={18} className="animate-spin text-dex-muted" />
            )}
          </div>
        ) : (
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-2xl font-semibold text-dex-text placeholder:text-dex-muted outline-none"
          />
        )}
        <TokenSelector selected={token} onChange={onTokenChange} />
      </div>
    </div>
  )
}

export default function AddLiquidityPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-dex-pink border-t-transparent" />
      </div>
    }>
      <AddLiquidityInner />
    </Suspense>
  )
}

function AddLiquidityInner() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID
  const params  = useSearchParams()
  const { router } = useContractAddresses()
  const { slippage, deadline } = useSettingsStore()

  const getAllTokens = useTokenListStore((s) => s.getAllTokens)
  const allTokens   = useMemo(() => getAllTokens(chainId), [getAllTokens, chainId])

  const [tokenA, setTokenA] = useState<Token | null>(null)
  const [tokenB, setTokenB] = useState<Token | null>(null)
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')

  // Pre-fill tokens from URL params
  useEffect(() => {
    const tA = params.get('tokenA')
    const tB = params.get('tokenB')
    if (tA) {
      const found = allTokens.find((t) => t.address.toLowerCase() === tA.toLowerCase())
      if (found) setTokenA(found)
      else if (tA === 'native') setTokenA(allTokens.find((t) => t.address === 'native') ?? null)
    }
    if (tB) {
      const found = allTokens.find((t) => t.address.toLowerCase() === tB.toLowerCase())
      if (found) setTokenB(found)
      else if (tB === 'native') setTokenB(allTokens.find((t) => t.address === 'native') ?? null)
    }
  }, [params, allTokens])

  // Clear amounts when tokens change
  useEffect(() => { setAmountA(''); setAmountB('') }, [tokenA?.address, tokenB?.address])

  // Reserves from on-chain
  const { reserve0, reserve1, pairExists, totalSupply, isLoading: reservesLoading } =
    usePairReserves(tokenA, tokenB)

  // Live market prices for fallback on new pools
  const symA = tokenA?.symbol ?? ''
  const symB = tokenB?.symbol ?? ''
  const { prices } = useMarketPrices([symA, symB])

  // ── Auto-fill Token B when A is typed ────────────────────────────────────────
  useEffect(() => {
    const ZERO = BigInt(0)
    if (!amountA || parseFloat(amountA) <= 0 || !tokenA || !tokenB) {
      setAmountB('')
      return
    }

    if (pairExists && reserve0 > ZERO && reserve1 > ZERO) {
      // Pool exists — use on-chain ratio
      const rawA = parseTokenAmount(amountA, tokenA.decimals)
      if (rawA === ZERO) return
      const rawB = (rawA * reserve1) / reserve0
      setAmountB(formatTokenAmount(rawB, tokenB.decimals))
    } else if (!reservesLoading) {
      // New pool — use live market price to suggest a starting ratio
      const priceA = STABLECOINS.has(symA.toUpperCase()) ? 1 : (prices[symA.toUpperCase()]?.usd ?? 0)
      const priceB = STABLECOINS.has(symB.toUpperCase()) ? 1 : (prices[symB.toUpperCase()]?.usd ?? 0)
      if (priceA > 0 && priceB > 0) {
        const suggested = (parseFloat(amountA) * priceA) / priceB
        setAmountB(suggested.toFixed(tokenB.decimals > 6 ? 6 : tokenB.decimals))
      }
    }
  }, [amountA, reserve0, reserve1, pairExists, reservesLoading, tokenA?.address, tokenB?.address, symA, symB, prices])

  const amountARaw  = tokenA ? parseTokenAmount(amountA || '0', tokenA.decimals) : BigInt(0)
  const amountBRaw  = tokenB ? parseTokenAmount(amountB || '0', tokenB.decimals) : BigInt(0)
  const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100))
  const amountAMin  = amountARaw * (BigInt(10000) - slippageBps) / BigInt(10000)
  const amountBMin  = amountBRaw * (BigInt(10000) - slippageBps) / BigInt(10000)

  // Approvals
  const isNativeA = tokenA ? isNativeToken(tokenA.address) : false
  const isNativeB = tokenB ? isNativeToken(tokenB.address) : false

  const approvalA = useApproval(
    !isNativeA && tokenA && amountARaw > BigInt(0) ? (tokenA.address as `0x${string}`) : undefined,
    address, router as `0x${string}`, amountARaw,
  )
  const approvalB = useApproval(
    !isNativeB && tokenB && amountBRaw > BigInt(0) ? (tokenB.address as `0x${string}`) : undefined,
    address, router as `0x${string}`, amountBRaw,
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
      const erc20Token = isNativeA ? tokenB! : tokenA!
      const amtTok     = isNativeA ? amountBRaw : amountARaw
      const amtETH     = isNativeA ? amountARaw : amountBRaw
      const minTok     = isNativeA ? amountBMin : amountAMin
      const minETH     = isNativeA ? amountAMin : amountBMin

      if (erc20Token.address === 'native' || erc20Token.address.length < 10) {
        toast.error('Invalid token address'); return
      }

      writeContract({
        address:      router as `0x${string}`,
        abi:          DEX_ROUTER_ABI,
        functionName: 'addLiquidityETH',
        args:         [erc20Token.address as `0x${string}`, amtTok, minTok, minETH, address, deadlineTs],
        value:        amtETH,
      })
    } else {
      writeContract({
        address:      router as `0x${string}`,
        abi:          DEX_ROUTER_ABI,
        functionName: 'addLiquidity',
        args:         [
          tokenA.address as `0x${string}`, tokenB.address as `0x${string}`,
          amountARaw, amountBRaw, amountAMin, amountBMin, address, deadlineTs,
        ],
      })
    }
  }

  const isSubmitting   = txPending || txWaiting
  const approveLoading = approvalA.approveLoading || approvalB.approveLoading

  function getButtonState(): { label: string; action: () => void; disabled: boolean; variant: 'pink' | 'amber' | 'muted' } {
    if (!isConnected)                       return { label: 'Connect Wallet',      action: () => {}, disabled: true,  variant: 'muted' }
    if (!tokenA || !tokenB)                 return { label: 'Select tokens',       action: () => {}, disabled: true,  variant: 'muted' }
    if (reservesLoading)                    return { label: 'Loading pool…',       action: () => {}, disabled: true,  variant: 'muted' }
    if (!amountA || parseFloat(amountA) <=0) return { label: 'Enter Token A amount',action: () => {}, disabled: true, variant: 'muted' }
    if (!amountB || parseFloat(amountB) <=0) return { label: 'Enter Token B amount',action: () => {}, disabled: true, variant: 'muted' }
    if (approvalA.needsApproval)             return { label: approvalA.approveLoading ? 'Approving…' : `Approve ${tokenA.symbol}`, action: approvalA.approve, disabled: approvalA.approveLoading, variant: 'amber' }
    if (approvalB.needsApproval)             return { label: approvalB.approveLoading ? 'Approving…' : `Approve ${tokenB.symbol}`, action: approvalB.approve, disabled: approvalB.approveLoading, variant: 'amber' }
    if (isSubmitting)                       return { label: 'Adding Liquidity…',   action: () => {}, disabled: true,  variant: 'muted' }
    return { label: 'Add Liquidity', action: handleAdd, disabled: false, variant: 'pink' }
  }

  const btn = getButtonState()

  // Pool share estimate
  const poolSharePct = useMemo(() => {
    if (!amountARaw || !pairExists || totalSupply === BigInt(0)) return null
    const newTotal = totalSupply + amountARaw
    return ((Number(amountARaw) / Number(newTotal)) * 100).toFixed(4)
  }, [amountARaw, totalSupply, pairExists])

  const showNewPoolBanner = !reservesLoading && !pairExists && !!tokenA && !!tokenB

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md overflow-hidden">
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
          {/* New pool notice */}
          {showNewPoolBanner && (
            <div className="flex gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                You are creating a <strong>new pool</strong>. The ratio you provide sets the initial price.
                The suggested amount is based on live market prices.
              </span>
            </div>
          )}

          {/* Loading pool check */}
          {reservesLoading && tokenA && tokenB && (
            <div className="flex gap-2 rounded-xl bg-dex-surface-2 border border-dex-border px-4 py-3 text-xs text-dex-muted items-center">
              <Loader2 size={13} className="animate-spin shrink-0" />
              <span>Checking pool…</span>
            </div>
          )}

          {/* Token A — user types this */}
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

          {/* Token B — auto-filled from pool ratio or market price */}
          <AmountInput
            label="Token B (auto-filled from pool ratio)"
            token={tokenB}
            onTokenChange={setTokenB}
            amount={amountB}
            onAmountChange={setAmountB}
            userAddress={address}
            readOnly={pairExists}
          />

          {/* Pool info */}
          {tokenA && tokenB && amountA && amountB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0 && (
            <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-4 space-y-2">
              <p className="text-xs font-medium text-dex-muted uppercase tracking-wide">Pool info</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-dex-muted">{tokenB.symbol} per {tokenA.symbol}</span>
                  <span className="font-medium text-dex-text">
                    {(parseFloat(amountB) / parseFloat(amountA)).toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dex-muted">{tokenA.symbol} per {tokenB.symbol}</span>
                  <span className="font-medium text-dex-text">
                    {(parseFloat(amountA) / parseFloat(amountB)).toFixed(6)}
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
