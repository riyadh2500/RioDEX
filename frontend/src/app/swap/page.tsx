'use client'

import React, { useEffect, useMemo } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { toast } from 'sonner'
import { ArrowUpDown, Info, Loader2, AlertTriangle, Droplets, TrendingUp, TrendingDown } from 'lucide-react'
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
import { cn, formatUSD } from '@/lib/utils'
import { isNativeToken, getWETHToken, parseTokenAmount } from '@/config/tokens'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { Token } from '@/types/token'

const STABLECOIN_SYMBOLS = new Set(['USDC', 'USDT', 'EURC', 'DAI', 'BUSD', 'USDC.E'])

function getTokenUSDPrice(symbol: string, prices: Record<string, { usd: number; change24h: number }>): number {
  const upper = symbol.toUpperCase()
  if (STABLECOIN_SYMBOLS.has(upper)) return 1
  return prices[upper]?.usd ?? 0
}

/** Resolve display token → on-chain EVM address (native ETH → WETH) */
function resolveAddr(token: Token, chainId: number): `0x${string}` | null {
  if (isNativeToken(token.address)) {
    const weth = getWETHToken(chainId).address
    return weth && weth.length >= 10 ? (weth as `0x${string}`) : null
  }
  return token.address && token.address.length >= 10 ? (token.address as `0x${string}`) : null
}

// ─── Token amount input ───────────────────────────────────────────────────────
function TokenAmountInput({
  label, token, onTokenChange, amount, onAmountChange,
  readOnly, isLoading, userAddress, usdValue,
}: {
  label: string
  token: Token | null
  onTokenChange: (t: Token) => void
  amount: string
  onAmountChange?: (v: string) => void
  readOnly?: boolean
  isLoading?: boolean
  userAddress?: `0x${string}`
  usdValue?: number
}) {
  const { balance } = useTokenBalance(token, userAddress)
  return (
    <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-dex-muted">{label}</span>
        {userAddress && token && (
          <button
            onClick={() => onAmountChange?.(balance)}
            className="text-xs text-dex-pink hover:underline"
          >
            Balance: {balance}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {isLoading ? (
            <div className="flex h-10 items-center gap-2 text-dex-muted">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-lg">Calculating…</span>
            </div>
          ) : (
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => onAmountChange?.(e.target.value)}
              readOnly={readOnly}
              placeholder="0.0"
              className={cn(
                'w-full bg-transparent text-2xl font-semibold text-dex-text placeholder:text-dex-muted outline-none',
                readOnly && 'cursor-default',
              )}
            />
          )}
          {amount && parseFloat(amount) > 0 && usdValue !== undefined && usdValue > 0 && (
            <p className="text-xs text-dex-muted mt-0.5">≈ {formatUSD(usdValue)}</p>
          )}
        </div>
        <TokenSelector selected={token} onChange={onTokenChange} />
      </div>
    </div>
  )
}

// ─── Live price ticker ────────────────────────────────────────────────────────
function LivePriceTicker({ symbol, price, change24h, isLoading }: {
  symbol: string; price: number; change24h: number; isLoading: boolean
}) {
  const isUp = change24h >= 0
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-dex-text">
            {isLoading
              ? <span className="animate-pulse text-dex-muted">Loading…</span>
              : price > 0 ? formatUSD(price) : 'N/A'}
          </span>
          {!isLoading && price > 0 && (
            <span className={cn('flex items-center gap-1 text-sm font-semibold', isUp ? 'text-dex-green' : 'text-dex-red')}>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isUp ? '+' : ''}{change24h.toFixed(2)}%
            </span>
          )}
        </div>
        <p className="text-xs text-dex-muted mt-0.5">
          ETH / USD · Live from CoinGecko
          {!isLoading && <span className="ml-1 text-dex-green">●</span>}
        </p>
      </div>
    </div>
  )
}

// ─── Main swap page ───────────────────────────────────────────────────────────
export default function SwapPage() {
  const { address, isConnected } = useAccount()
  const chainId   = useChainId() ?? DEFAULT_CHAIN_ID
  const network   = useMemo(() => {
    try { return getNetwork(chainId) } catch { return getNetwork(DEFAULT_CHAIN_ID) }
  }, [chainId])

  const { router, isDeployed, networkName } = useContractAddresses()
  const { slippage, deadline }              = useSettingsStore()

  const {
    tokenIn, tokenOut, amountIn, amountOut, independentField,
    setTokenIn, setTokenOut, setAmountIn, setAmountOut, switchTokens, resetForChain,
  } = useSwapStore()

  // Reset tokens when chain changes
  const getAllTokens  = useTokenListStore((s) => s.getAllTokens)
  const storeChainId = useTokenListStore((s) => s.chainId)
  useEffect(() => {
    const list   = getAllTokens()
    const native = list.find((t) => t.address === 'native') ?? list[0] ?? null
    resetForChain(native)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeChainId])

  // ── Prices ─────────────────────────────────────────────────────────────
  const inSym     = tokenIn?.symbol  ?? 'ETH'
  const outSym    = tokenOut?.symbol ?? 'USDC'
  const nativeSym = network.nativeCurrency.symbol

  const { prices, isLoading: priceLoading } = useMarketPrices([inSym, outSym, nativeSym, 'ETH'])
  const nativeUSD   = getTokenUSDPrice(nativeSym, prices) || prices['ETH']?.usd || 0
  const nativeChg   = prices['ETH']?.change24h ?? 0
  const inUSDPrice  = getTokenUSDPrice(inSym,  prices)
  const outUSDPrice = getTokenUSDPrice(outSym, prices)

  // ── Quote ──────────────────────────────────────────────────────────────
  const {
    amountOut: quotedOut, amountOutRaw, isLoading: quoteLoading, noLiquidity, error: quoteError,
  } = useSwapQuote(tokenIn, tokenOut, independentField === 'input' ? amountIn : '')

  useEffect(() => {
    if (independentField === 'input') setAmountOut(quotedOut ?? '')
  }, [quotedOut, independentField, setAmountOut])

  // ── USD values ─────────────────────────────────────────────────────────
  const inUSD  = tokenIn  && parseFloat(amountIn  || '0') > 0 ? parseFloat(amountIn)  * inUSDPrice  : undefined
  const outUSD = tokenOut && parseFloat(amountOut || '0') > 0 ? parseFloat(amountOut) * outUSDPrice : undefined

  const poolRatio   = parseFloat(amountIn || '0') > 0 && parseFloat(amountOut || '0') > 0
    ? parseFloat(amountOut) / parseFloat(amountIn) : null
  const marketRatio = inUSDPrice > 0 && outUSDPrice > 0 ? inUSDPrice / outUSDPrice : null
  const priceImpact = poolRatio && marketRatio
    ? ((marketRatio - poolRatio) / marketRatio) * 100 : null

  // ── Approval ───────────────────────────────────────────────────────────
  // Only check approval when: token is ERC-20, contracts deployed, valid amount
  const amountInRaw = tokenIn ? parseTokenAmount(amountIn || '0', tokenIn.decimals) : BigInt(0)

  const approvalTokenAddr = (
    tokenIn &&
    !isNativeToken(tokenIn.address) &&
    isDeployed &&
    tokenIn.address.length >= 10 &&
    amountInRaw > BigInt(0)
  ) ? tokenIn.address as `0x${string}` : undefined

  const { needsApproval, approve, approveLoading } = useApproval(
    approvalTokenAddr,
    address,
    router as `0x${string}`,
    amountInRaw,
  )

  // ── Swap write ─────────────────────────────────────────────────────────
  const { writeContract, data: swapTxHash, isPending: swapPending } = useWriteContract({
    mutation: {
      onError: (err: any) => {
        toast.error('Swap failed', {
          description: err?.shortMessage ?? err?.message ?? 'Transaction rejected or reverted',
        })
      },
    },
  })
  const { isLoading: swapWaiting, isSuccess: swapSuccess } =
    useWaitForTransactionReceipt({ hash: swapTxHash })

  useEffect(() => {
    if (swapSuccess) {
      toast.success('Swap confirmed!', {
        description: `${amountIn} ${tokenIn?.symbol} → ${parseFloat(amountOut || '0').toFixed(6)} ${tokenOut?.symbol}`,
      })
      setAmountIn('')
      setAmountOut('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapSuccess])

  // ── Execute swap ───────────────────────────────────────────────────────
  function executeSwap() {
    if (!tokenIn || !tokenOut || !address || !router) return
    if (!amountOutRaw || amountOutRaw === BigInt(0)) return

    const inAddr  = resolveAddr(tokenIn,  chainId)
    const outAddr = resolveAddr(tokenOut, chainId)

    if (!inAddr)  { toast.error('Cannot resolve input token address');  return }
    if (!outAddr) { toast.error('Cannot resolve output token address'); return }
    if (inAddr.toLowerCase() === outAddr.toLowerCase()) {
      toast.error('Cannot swap a token for itself'); return
    }

    const path    = [inAddr, outAddr] as [`0x${string}`, `0x${string}`]
    const dl      = getDeadlineTimestamp(deadline)
    const slipBps = BigInt(Math.floor(parseFloat(slippage) * 100))
    const minOut  = amountOutRaw * (BigInt(10000) - slipBps) / BigInt(10000)

    if (isNativeToken(tokenIn.address)) {
      // ETH → Token
      writeContract({
        address: router as `0x${string}`, abi: DEX_ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [minOut, path, address, dl],
        value: amountInRaw,
      })
    } else if (isNativeToken(tokenOut.address)) {
      // Token → ETH
      writeContract({
        address: router as `0x${string}`, abi: DEX_ROUTER_ABI,
        functionName: 'swapExactTokensForETH',
        args: [amountInRaw, minOut, path, address, dl],
      })
    } else {
      // Token → Token
      writeContract({
        address: router as `0x${string}`, abi: DEX_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [amountInRaw, minOut, path, address, dl],
      })
    }
  }

  // ── Button state ───────────────────────────────────────────────────────
  const isSwapping    = swapPending || swapWaiting
  const hasValidQuote = !!amountOutRaw && amountOutRaw > BigInt(0)

  function getButtonLabel(): string {
    if (!isConnected)          return 'Connect Wallet'
    if (!tokenIn || !tokenOut) return 'Select tokens'
    if (!amountIn || parseFloat(amountIn) <= 0) return 'Enter an amount'
    if (!isDeployed)           return `Not deployed on ${networkName}`
    if (quoteLoading)          return 'Getting quote…'
    if (noLiquidity)           return 'No liquidity — add it first'
    if (quoteError)            return 'Quote unavailable'
    if (!hasValidQuote)        return 'No liquidity — add it first'
    if (needsApproval)         return approveLoading ? 'Approving…' : `Approve ${tokenIn.symbol}`
    if (isSwapping)            return 'Swapping…'
    return `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`
  }

  function handleClick() {
    if (!isConnected || !isDeployed) return
    if (noLiquidity || !hasValidQuote || !!quoteError || quoteLoading) return
    if (needsApproval) { approve(); return }
    if (!isSwapping)   executeSwap()
  }

  const disabled =
    !isConnected ||
    !tokenIn || !tokenOut ||
    !amountIn || parseFloat(amountIn) <= 0 ||
    !isDeployed ||
    quoteLoading ||
    !!quoteError ||
    noLiquidity ||
    !hasValidQuote ||
    approveLoading ||
    isSwapping

  const chartData = useMemo(
    () => generateMockPriceData(nativeUSD > 0 ? nativeUSD : 3500, 30),
    [nativeUSD],
  )

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

        {/* ── Swap card ── */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md overflow-hidden">
            <div className="flex items-center justify-between border-b border-dex-border px-5 py-4">
              <h1 className="font-semibold text-dex-text">Swap</h1>
              <SettingsModal />
            </div>

            <div className="p-4 space-y-2">

              {/* Not deployed */}
              {isConnected && !isDeployed && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-xs text-amber-700">
                    Contracts not deployed on <strong>{networkName}</strong>.
                    Switch to Ethereum Sepolia or Base Sepolia.
                  </p>
                </div>
              )}

              {/* You pay */}
              <TokenAmountInput
                label="You pay"
                token={tokenIn}
                onTokenChange={setTokenIn}
                amount={amountIn}
                onAmountChange={setAmountIn}
                userAddress={address}
                usdValue={inUSD}
              />

              {/* Switch */}
              <div className="flex justify-center py-0.5 relative z-10">
                <button
                  onClick={switchTokens}
                  aria-label="Switch tokens"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-dex-surface bg-dex-surface-2 text-dex-muted hover:bg-dex-pink-light hover:text-dex-pink transition-all shadow-card"
                >
                  <ArrowUpDown size={16} />
                </button>
              </div>

              {/* You receive */}
              <TokenAmountInput
                label="You receive (estimated)"
                token={tokenOut}
                onTokenChange={setTokenOut}
                amount={amountOut}
                readOnly
                isLoading={quoteLoading && independentField === 'input'}
                userAddress={address}
                usdValue={outUSD}
              />

              {/* No liquidity banner */}
              {(noLiquidity || (!hasValidQuote && !quoteLoading && !!amountIn && parseFloat(amountIn) > 0 && !!tokenIn && !!tokenOut && isDeployed && !quoteError)) && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3">
                  <Droplets size={15} className="shrink-0 mt-0.5 text-blue-600" />
                  <p className="text-xs text-blue-700">
                    No pool for <strong>{tokenIn?.symbol}/{tokenOut?.symbol}</strong>.{' '}
                    <Link href="/liquidity/add" className="underline font-medium">Add liquidity →</Link>
                  </p>
                </div>
              )}

              {/* Quote error */}
              {quoteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex gap-3">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
                  <p className="text-xs text-red-700">
                    {(quoteError as any)?.shortMessage ?? (quoteError as any)?.message ?? 'RPC error — check your network'}
                  </p>
                </div>
              )}

              {/* Quote details */}
              {hasValidQuote && amountIn && amountOut && tokenIn && tokenOut && !noLiquidity && isDeployed && (
                <div className="rounded-xl bg-dex-surface-2 border border-dex-border px-4 py-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-dex-muted">Rate</span>
                    <span className="text-dex-text font-medium">
                      1 {tokenIn.symbol} = {poolRatio?.toFixed(6)} {tokenOut.symbol}
                    </span>
                  </div>
                  {priceImpact !== null && (
                    <div className="flex justify-between">
                      <span className="text-dex-muted flex items-center gap-1">Price impact <Info size={11} /></span>
                      <span className={cn('font-semibold',
                        priceImpact > 10 ? 'text-dex-red' :
                        priceImpact > 3  ? 'text-amber-500' : 'text-dex-green')}>
                        {priceImpact.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-dex-muted">Min received</span>
                    <span className="text-dex-text font-medium">
                      {(parseFloat(amountOut) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {tokenOut.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dex-muted">Slippage</span>
                    <span className={cn('font-medium', parseFloat(slippage) > 5 ? 'text-amber-500' : 'text-dex-text')}>
                      {slippage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dex-muted">Fee (0.3%)</span>
                    <span className="text-dex-text">
                      {(parseFloat(amountIn) * 0.003).toFixed(6)} {tokenIn.symbol}
                    </span>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="pt-1">
                {!isConnected ? (
                  <ConnectWalletButton fullWidth />
                ) : (
                  <button
                    onClick={handleClick}
                    disabled={disabled}
                    className={cn(
                      'w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
                      disabled
                        ? 'bg-dex-surface-2 text-dex-muted cursor-not-allowed border border-dex-border'
                        : needsApproval
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-dex-pink text-white hover:bg-dex-purple shadow-card',
                    )}
                  >
                    {(isSwapping || approveLoading) && (
                      <Loader2 size={14} className="inline mr-2 animate-spin" />
                    )}
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

        {/* ── Price panel ── */}
        <div className="w-full lg:max-w-lg space-y-4">
          <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md p-5">
            <div className="mb-4">
              <LivePriceTicker
                symbol="ETH"
                price={nativeUSD}
                change24h={nativeChg}
                isLoading={priceLoading}
              />
            </div>
            <PriceChart data={chartData} height={200} color="#7C3AED" />
            {(inUSDPrice > 0 || outUSDPrice > 0) && (
              <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-dex-border">
                {tokenIn && inUSDPrice > 0 && (
                  <div className="rounded-xl bg-dex-surface-2 p-3">
                    <p className="text-xs text-dex-muted">{tokenIn.symbol} price</p>
                    <p className="text-sm font-bold text-dex-text mt-0.5">{formatUSD(inUSDPrice)}</p>
                  </div>
                )}
                {tokenOut && outUSDPrice > 0 && (
                  <div className="rounded-xl bg-dex-surface-2 p-3">
                    <p className="text-xs text-dex-muted">{tokenOut.symbol} price</p>
                    <p className="text-sm font-bold text-dex-text mt-0.5">{formatUSD(outUSDPrice)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'ETH Price',  value: priceLoading ? '…' : nativeUSD > 0 ? formatUSD(nativeUSD) : 'N/A' },
              { label: '24h Change', value: nativeUSD > 0 ? `${nativeChg >= 0 ? '+' : ''}${nativeChg.toFixed(2)}%` : 'N/A',
                color: nativeChg >= 0 ? 'text-dex-green' : 'text-dex-red' },
              { label: 'Network',    value: network.shortName },
              { label: 'Swap Fee',   value: '0.30%' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-dex-border bg-dex-surface p-4 shadow-card">
                <p className="text-xs text-dex-muted">{label}</p>
                <p className={cn('mt-1 text-lg font-bold text-dex-text', color)}>{value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
