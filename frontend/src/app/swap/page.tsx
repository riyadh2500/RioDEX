'use client'

import React, { useEffect, useMemo } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { toast } from 'sonner'
import { ArrowUpDown, Info, Loader2, AlertTriangle, Droplets } from 'lucide-react'
import Link from 'next/link'

import { useSwapStore }                          from '@/stores/useSwapStore'
import { useSettingsStore, getDeadlineTimestamp } from '@/stores/useSettingsStore'
import { useSwapQuote }                          from '@/hooks/useSwapQuote'
import { useTokenBalance }                       from '@/hooks/useTokenBalance'
import { useApproval }                           from '@/hooks/useApproval'
import { useContractAddresses }                  from '@/hooks/useContractAddresses'
import { useMarketPrices }                       from '@/hooks/useMarketPrice'
import { useTokenListStore }                     from '@/stores/useTokenListStore'

import TokenSelector       from '@/components/TokenSelector'
import SettingsModal       from '@/components/SettingsModal'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import PriceChart, { generateMockPriceData } from '@/components/PriceChart'

import { DEX_ROUTER_ABI } from '@/lib/abis'
import { cn, formatCompact, formatUSD } from '@/lib/utils'
import { isNativeToken, getWETHToken, parseTokenAmount } from '@/config/tokens'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { Token } from '@/types/token'

function resolveAddr(token: Token, chainId: number): `0x${string}` | null {
  if (isNativeToken(token.address)) {
    const weth = getWETHToken(chainId).address
    return weth.length >= 10 ? (weth as `0x${string}`) : null
  }
  return token.address.length >= 10 ? (token.address as `0x${string}`) : null
}

function TokenAmountInput({ label, token, onTokenChange, amount, onAmountChange, readOnly, isLoading, userAddress, usdValue }: {
  label: string; token: Token | null; onTokenChange: (t: Token) => void
  amount: string; onAmountChange?: (v: string) => void
  readOnly?: boolean; isLoading?: boolean; userAddress?: `0x${string}`; usdValue?: number
}) {
  const { balance } = useTokenBalance(token, userAddress)
  return (
    <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-dex-muted">{label}</span>
        {userAddress && token && (
          <button onClick={() => onAmountChange?.(balance)} className="text-xs text-dex-pink hover:underline">
            Balance: {balance}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {isLoading ? (
            <div className="flex h-10 items-center gap-2 text-dex-muted">
              <Loader2 size={16} className="animate-spin" /><span className="text-lg">…</span>
            </div>
          ) : (
            <input type="number" min="0" value={amount} onChange={(e) => onAmountChange?.(e.target.value)}
              readOnly={readOnly} placeholder="0.0"
              className={cn('w-full bg-transparent text-2xl font-semibold text-dex-text placeholder:text-dex-muted outline-none', readOnly && 'cursor-default')} />
          )}
          {usdValue !== undefined && usdValue > 0 && <p className="text-xs text-dex-muted">{formatUSD(usdValue)}</p>}
        </div>
        <TokenSelector selected={token} onChange={onTokenChange} />
      </div>
    </div>
  )
}

export default function SwapPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID
  const network = useMemo(() => { try { return getNetwork(chainId) } catch { return getNetwork(DEFAULT_CHAIN_ID) } }, [chainId])
  const { router, isDeployed, networkName } = useContractAddresses()

  const { tokenIn, tokenOut, amountIn, amountOut, independentField,
    setTokenIn, setTokenOut, setAmountIn, setAmountOut, switchTokens, resetForChain } = useSwapStore()
  const { slippage, deadline } = useSettingsStore()

  const getAllTokens  = useTokenListStore((s) => s.getAllTokens)
  const storeChainId = useTokenListStore((s) => s.chainId)
  useEffect(() => {
    const list   = getAllTokens()
    const native = list.find((t) => t.address === 'native') ?? list[0] ?? null
    resetForChain(native)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeChainId])

  const inSym  = tokenIn?.symbol  ?? 'ETH'
  const outSym = tokenOut?.symbol ?? 'ETH'
  const { prices, isLoading: priceLoading } = useMarketPrices([inSym, outSym, network.nativeCurrency.symbol])
  const nativeSym   = network.nativeCurrency.symbol
  const nativeUSD   = prices[nativeSym.toUpperCase()]?.usd ?? network.nativeUSDPrice
  const nativeChg   = prices[nativeSym.toUpperCase()]?.change24h ?? 0
  const inUSDPrice  = prices[inSym.toUpperCase()]?.usd  ?? nativeUSD
  const outUSDPrice = prices[outSym.toUpperCase()]?.usd ?? nativeUSD

  const { amountOut: quotedOut, amountOutRaw, isLoading: quoteLoading, notDeployed, noLiquidity, error: quoteError } =
    useSwapQuote(tokenIn, tokenOut, independentField === 'input' ? amountIn : '')

  useEffect(() => {
    if (independentField === 'input') setAmountOut(quotedOut ?? '')
  }, [quotedOut, independentField, setAmountOut])

  const amountInRaw        = tokenIn ? parseTokenAmount(amountIn || '0', tokenIn.decimals) : BigInt(0)
  const needsErc20Approval = !!(tokenIn && !isNativeToken(tokenIn.address) && isDeployed && tokenIn.address.length >= 10)
  const { needsApproval, approve, approveLoading } = useApproval(
    needsErc20Approval ? (tokenIn!.address as `0x${string}`) : undefined,
    address, router as `0x${string}`, amountInRaw,
  )

  const { writeContract, data: swapTxHash, isPending: swapPending } = useWriteContract()
  const { isLoading: swapWaiting, isSuccess: swapSuccess } = useWaitForTransactionReceipt({ hash: swapTxHash })

  useEffect(() => {
    if (swapSuccess) {
      toast.success('Swap confirmed!', { description: `${amountIn} ${tokenIn?.symbol} → ${amountOut} ${tokenOut?.symbol}` })
      setAmountIn(''); setAmountOut('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapSuccess])

  function executeSwap() {
    if (!tokenIn || !tokenOut || !address || !router) return
    const inAddr  = resolveAddr(tokenIn,  chainId)
    const outAddr = resolveAddr(tokenOut, chainId)
    if (!inAddr || !outAddr) { toast.error('WETH not configured for this network'); return }
    const path        = [inAddr, outAddr] as [`0x${string}`, `0x${string}`]
    const dl          = getDeadlineTimestamp(deadline)
    const slipBps     = BigInt(Math.floor(parseFloat(slippage) * 100))
    const minOut      = amountOutRaw * (BigInt(10000) - slipBps) / BigInt(10000)
    try {
      if (isNativeToken(tokenIn.address)) {
        writeContract({ address: router as `0x${string}`, abi: DEX_ROUTER_ABI, functionName: 'swapExactETHForTokens', args: [minOut, path, address, dl], value: amountInRaw })
      } else if (isNativeToken(tokenOut.address)) {
        writeContract({ address: router as `0x${string}`, abi: DEX_ROUTER_ABI, functionName: 'swapExactTokensForETH', args: [amountInRaw, minOut, path, address, dl] })
      } else {
        writeContract({ address: router as `0x${string}`, abi: DEX_ROUTER_ABI, functionName: 'swapExactTokensForTokens', args: [amountInRaw, minOut, path, address, dl] })
      }
    } catch (err: any) {
      toast.error('Swap failed', { description: err?.shortMessage ?? err?.message })
    }
  }

  const inUSD      = tokenIn  && amountIn  ? parseFloat(amountIn)  * inUSDPrice  : undefined
  const outUSD     = tokenOut && amountOut ? parseFloat(amountOut) * outUSDPrice : undefined
  const priceRatio = amountIn && amountOut && parseFloat(amountIn) > 0
    ? (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6) : null
  const chartData  = useMemo(() => generateMockPriceData(nativeUSD > 0 ? nativeUSD : 1, 30), [nativeUSD])
  const isSwapping = swapPending || swapWaiting

  function getButtonLabel() {
    if (!isConnected)          return 'Connect Wallet'
    if (!tokenIn || !tokenOut) return 'Select tokens'
    if (!amountIn)             return 'Enter an amount'
    if (!isDeployed)           return `Not deployed on ${networkName}`
    if (quoteLoading)          return 'Getting quote…'
    if (noLiquidity)           return 'No liquidity — add it first'
    if (quoteError)            return 'Quote unavailable'
    if (needsApproval)         return approveLoading ? 'Approving…' : `Approve ${tokenIn.symbol}`
    if (isSwapping)            return 'Swapping…'
    return 'Swap'
  }

  function handleClick() {
    if (!isConnected || !isDeployed || noLiquidity || !!quoteError) return
    if (needsApproval) { approve(); return }
    executeSwap()
  }

  const disabled = !isConnected || !tokenIn || !tokenOut || !amountIn
    || !isDeployed || noLiquidity || !!quoteError
    || quoteLoading || approveLoading || isSwapping

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

        {/* Swap card */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md overflow-hidden">
            <div className="flex items-center justify-between border-b border-dex-border px-5 py-4">
              <h1 className="font-semibold text-dex-text">Swap</h1>
              <SettingsModal />
            </div>

            <div className="p-4 space-y-2">
              {isConnected && !isDeployed && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <div className="text-xs text-amber-700 space-y-1">
                    <p className="font-semibold">DEX not deployed on {networkName}</p>
                    <p>Switch to Base Sepolia or ARC Testnet to use swaps. Sepolia coming soon.</p>
                  </div>
                </div>
              )}

              <TokenAmountInput label="You pay" token={tokenIn} onTokenChange={setTokenIn}
                amount={amountIn} onAmountChange={setAmountIn} userAddress={address} usdValue={inUSD} />

              <div className="flex justify-center py-0.5 relative z-10">
                <button onClick={switchTokens} aria-label="Switch tokens"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-dex-surface bg-dex-surface-2 text-dex-muted hover:bg-dex-pink-light hover:text-dex-pink transition-all shadow-card">
                  <ArrowUpDown size={16} />
                </button>
              </div>

              <TokenAmountInput label="You receive" token={tokenOut} onTokenChange={setTokenOut}
                amount={amountOut} onAmountChange={setAmountOut} readOnly
                isLoading={quoteLoading && independentField === 'input'}
                userAddress={address} usdValue={outUSD} />

              {noLiquidity && tokenIn && tokenOut && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3">
                  <Droplets size={15} className="shrink-0 mt-0.5 text-blue-600" />
                  <p className="text-xs text-blue-700">
                    No pool for <strong>{tokenIn.symbol} / {tokenOut.symbol}</strong> yet.{' '}
                    <Link href="/liquidity/add" className="underline font-medium">Add liquidity →</Link>
                  </p>
                </div>
              )}

              {priceRatio && tokenIn && tokenOut && !noLiquidity && isDeployed && (
                <div className="rounded-xl bg-dex-surface-2 border border-dex-border px-4 py-3 space-y-1.5 text-xs text-dex-muted">
                  <div className="flex justify-between">
                    <span>Rate</span>
                    <span className="text-dex-text font-medium">1 {tokenIn.symbol} = {priceRatio} {tokenOut.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">Slippage <Info size={11} /></span>
                    <span className={cn('font-medium', parseFloat(slippage) > 1 ? 'text-amber-500' : 'text-dex-text')}>{slippage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fee (0.3%)</span>
                    <span className="text-dex-text font-medium">{(parseFloat(amountIn) * 0.003).toFixed(6)} {tokenIn.symbol}</span>
                  </div>
                </div>
              )}

              <div className="pt-1">
                {!isConnected ? <ConnectWalletButton fullWidth /> : (
                  <button onClick={handleClick} disabled={disabled}
                    className={cn('w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
                      disabled ? 'bg-dex-surface-2 text-dex-muted cursor-not-allowed border border-dex-border'
                      : needsApproval ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-dex-pink text-white hover:bg-dex-purple shadow-card')}>
                    {isSwapping && <Loader2 size={14} className="inline mr-2 animate-spin" />}
                    {getButtonLabel()}
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-dex-muted">
            Slippage {slippage}% · Deadline {deadline} min ·{' '}
            <Link href="/faucet" className="text-dex-pink hover:underline">Get tokens</Link>
          </p>
        </div>

        {/* Chart panel */}
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-dex-muted mb-1">{inSym} / USD</p>
                <p className="text-2xl font-bold text-dex-text">
                  {priceLoading ? '…' : nativeUSD > 0 ? formatUSD(nativeUSD) : 'N/A'}
                </p>
                {nativeChg !== 0 && (
                  <p className="text-sm font-medium" style={{ color: nativeChg >= 0 ? '#059669' : '#DC2626' }}>
                    {nativeChg >= 0 ? '+' : ''}{nativeChg.toFixed(2)}%{' '}
                    <span className="text-dex-muted font-normal">24h</span>
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-dex-muted space-y-1">
                <p>Network: <span className="text-dex-text font-medium">{network.shortName}</span></p>
                <p>Chain: <span className="text-dex-text font-medium">{chainId}</span></p>
                <p>Gas: <span className="text-dex-text font-medium">{nativeSym}</span></p>
              </div>
            </div>
            <PriceChart data={chartData} height={220} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              { label: 'Total Liquidity', value: formatCompact(4_800_000) },
              { label: '7d Volume',       value: formatCompact(8_200_000) },
              { label: 'Total Pairs',     value: '12' },
              { label: 'Swap Fee',        value: '0.30%' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-dex-border bg-dex-surface p-4 shadow-card">
                <p className="text-xs text-dex-muted">{label}</p>
                <p className="mt-1 text-lg font-bold text-dex-text">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
