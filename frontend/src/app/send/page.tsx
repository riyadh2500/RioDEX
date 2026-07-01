'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useMemo } from 'react'
import {
  useAccount, useChainId, useWriteContract,
  useWaitForTransactionReceipt, useSendTransaction,
} from 'wagmi'
import { isAddress } from 'viem'
import { toast } from 'sonner'
import { Send, Loader2, AlertTriangle, CheckCircle2, ExternalLink, ArrowRight } from 'lucide-react'

import { useTokenListStore }  from '@/stores/useTokenListStore'
import { useAllTokens }       from '@/hooks/useAllTokens'
import { useTokenBalance }    from '@/hooks/useTokenBalance'
import { useMarketPrices }    from '@/hooks/useMarketPrice'

import TokenSelector       from '@/components/TokenSelector'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import TokenIcon           from '@/components/TokenIcon'
import PriceChart, { generateMockPriceData } from '@/components/PriceChart'

import { ERC20_ABI } from '@/lib/abis'
import { cn, formatUSD, shortenAddress } from '@/lib/utils'
import { isNativeToken, parseTokenAmount, formatTokenAmount } from '@/config/tokens'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { Token } from '@/types/token'

interface RecentTx {
  hash: string; to: string; token: Token; amount: string; timestamp: number
}

export default function SendPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID
  const network = useMemo(() => {
    try { return getNetwork(chainId) } catch { return getNetwork(DEFAULT_CHAIN_ID) }
  }, [chainId])

  useAllTokens()
  const getAllTokens  = useTokenListStore((s) => s.getAllTokens)
  const storeChainId = useTokenListStore((s) => s.chainId)
  const tokens       = useMemo(() => getAllTokens(), [getAllTokens, storeChainId])

  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [recipient,     setRecipient]     = useState('')
  const [amount,        setAmount]        = useState('')
  const [recentTxs,     setRecentTxs]     = useState<RecentTx[]>([])

  // Reset on chain change
  useEffect(() => {
    const native = tokens.find((t) => t.address === 'native') ?? tokens[0] ?? null
    setSelectedToken(native)
    setAmount('')
    setRecipient('')
  }, [chainId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Seed on first load
  useEffect(() => {
    if (!selectedToken && tokens.length > 0) {
      setSelectedToken(tokens.find((t) => t.address === 'native') ?? tokens[0])
    }
  }, [tokens]) // eslint-disable-line react-hooks/exhaustive-deps

  const { balance, balanceRaw } = useTokenBalance(selectedToken, address)

  const symKey = selectedToken?.symbol.toUpperCase() ?? ''
  const { prices, isLoading: priceLoading } = useMarketPrices(
    selectedToken ? [selectedToken.symbol] : [],
  )
  const tokenPrice = prices[symKey]?.usd       ?? 0
  const change24h  = prices[symKey]?.change24h ?? 0

  const amountRaw = selectedToken && amount
    ? parseTokenAmount(amount, selectedToken.decimals)
    : BigInt(0)
  const usdValue = amount && tokenPrice > 0 ? parseFloat(amount) * tokenPrice : 0

  // Validation
  const isValidAddress = recipient.length > 0 && isAddress(recipient)
  const isValidAmount  = amount.length > 0 && parseFloat(amount) > 0
    && amountRaw > BigInt(0) && amountRaw <= balanceRaw

  // ERC-20 transfer
  const { writeContract, data: erc20Hash, isPending: erc20Pending } = useWriteContract()
  const { isLoading: erc20Waiting, isSuccess: erc20Success } =
    useWaitForTransactionReceipt({ hash: erc20Hash })

  // Native transfer
  const { sendTransaction, data: nativeHash, isPending: nativePending } = useSendTransaction()
  const { isLoading: nativeWaiting, isSuccess: nativeSuccess } =
    useWaitForTransactionReceipt({ hash: nativeHash })

  const finalHash = erc20Hash ?? nativeHash
  const isSending  = erc20Pending || erc20Waiting || nativePending || nativeWaiting
  const isSuccess  = erc20Success || nativeSuccess

  useEffect(() => {
    if (isSuccess && finalHash && selectedToken) {
      toast.success('Transaction confirmed!', {
        description: `Sent ${amount} ${selectedToken.symbol} to ${shortenAddress(recipient)}`,
      })
      setRecentTxs((p) => [
        { hash: finalHash, to: recipient, token: selectedToken, amount, timestamp: Date.now() },
        ...p.slice(0, 4),
      ])
      setAmount('')
      setRecipient('')
    }
  }, [isSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSend() {
    if (!selectedToken || !isValidAddress || !isValidAmount || !address) return
    const to = recipient as `0x${string}`
    if (isNativeToken(selectedToken.address)) {
      sendTransaction({ to, value: amountRaw })
    } else {
      writeContract({
        address: selectedToken.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to, amountRaw],
      })
    }
  }

  function getLabel() {
    if (!isConnected)           return 'Connect Wallet'
    if (!selectedToken)         return 'Select a token'
    if (!recipient)             return 'Enter recipient address'
    if (!isValidAddress)        return 'Invalid address'
    if (!amount)                return 'Enter an amount'
    if (amountRaw > balanceRaw) return 'Insufficient balance'
    if (isSending)              return 'Sending…'
    return `Send ${selectedToken.symbol}`
  }

  const btnDisabled = !isConnected || !selectedToken || !isValidAddress || !isValidAmount || isSending
  const chartData   = useMemo(
    () => generateMockPriceData(tokenPrice > 0 ? tokenPrice : 1, 30, 0.03),
    [tokenPrice],
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

        {/* ── Send card ── */}
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md overflow-hidden">
            <div className="flex items-center gap-2 border-b border-dex-border px-5 py-4">
              <Send size={18} className="text-dex-pink" />
              <h1 className="font-semibold text-dex-text">Send</h1>
            </div>

            <div className="p-4 space-y-4">
              {/* Token + amount */}
              <div className="rounded-xl border border-dex-border bg-dex-surface-2 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-dex-muted">Token &amp; Amount</span>
                  {isConnected && selectedToken && (
                    <button
                      onClick={() => setAmount(formatTokenAmount(balanceRaw, selectedToken.decimals))}
                      className="text-xs text-dex-pink hover:underline"
                    >
                      Balance: {balance}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min="0" value={amount} placeholder="0.0"
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-semibold text-dex-text placeholder:text-dex-muted outline-none"
                  />
                  <TokenSelector
                    selected={selectedToken}
                    onChange={(t) => { setSelectedToken(t); setAmount('') }}
                  />
                </div>
                {usdValue > 0 && <p className="text-xs text-dex-muted">{formatUSD(usdValue)}</p>}
                {amount && amountRaw > balanceRaw && (
                  <p className="flex items-center gap-1 text-xs text-dex-red">
                    <AlertTriangle size={11} /> Insufficient balance
                  </p>
                )}
              </div>

              {/* Recipient */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-dex-muted">Recipient address</label>
                <div className={cn(
                  'flex items-center gap-2 rounded-xl border bg-dex-surface-2 px-4 py-3 transition-colors',
                  recipient.length > 0
                    ? isValidAddress ? 'border-dex-green ring-1 ring-dex-green/20'
                      : 'border-dex-red ring-1 ring-dex-red/20'
                    : 'border-dex-border focus-within:border-dex-pink focus-within:ring-1 focus-within:ring-dex-pink/20',
                )}>
                  <input
                    type="text" value={recipient} spellCheck={false}
                    onChange={(e) => setRecipient(e.target.value.trim())}
                    placeholder="0x… wallet address"
                    className="flex-1 bg-transparent text-sm font-mono text-dex-text placeholder:text-dex-muted outline-none"
                  />
                  {recipient.length > 0 && (
                    isValidAddress
                      ? <CheckCircle2 size={15} className="shrink-0 text-dex-green" />
                      : <AlertTriangle size={15} className="shrink-0 text-dex-red" />
                  )}
                </div>
                {recipient.length > 0 && !isValidAddress && (
                  <p className="text-xs text-dex-red">Not a valid Ethereum address</p>
                )}
              </div>

              {/* Summary */}
              {isValidAddress && isValidAmount && selectedToken && (
                <div className="rounded-xl bg-dex-surface-2 border border-dex-border px-4 py-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-dex-muted">Sending</span>
                    <span className="font-semibold text-dex-text">{amount} {selectedToken.symbol}</span>
                  </div>
                  {usdValue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-dex-muted">Value</span>
                      <span className="font-medium text-dex-text">{formatUSD(usdValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-dex-muted">To</span>
                    <span className="font-mono text-dex-text">{shortenAddress(recipient, 6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dex-muted">Network</span>
                    <span className="font-medium text-dex-text">{network.name}</span>
                  </div>
                </div>
              )}

              {/* CTA */}
              {!isConnected ? <ConnectWalletButton fullWidth /> : (
                <button
                  onClick={handleSend} disabled={btnDisabled}
                  className={cn(
                    'w-full rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2',
                    btnDisabled
                      ? 'bg-dex-surface-2 text-dex-muted border border-dex-border cursor-not-allowed'
                      : 'bg-dex-pink text-white hover:bg-dex-purple shadow-card',
                  )}
                >
                  {isSending
                    ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
                    : <><Send size={15} /> {getLabel()}</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* Recent txs */}
          {recentTxs.length > 0 && (
            <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card overflow-hidden">
              <p className="border-b border-dex-border px-5 py-3 text-xs font-semibold text-dex-muted uppercase tracking-wide">
                Recent Sends
              </p>
              <div className="divide-y divide-dex-border">
                {recentTxs.map((tx) => (
                  <div key={tx.hash} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <TokenIcon token={tx.token} size={24} />
                      <div>
                        <p className="text-sm font-medium text-dex-text">{tx.amount} {tx.token.symbol}</p>
                        <p className="text-xs text-dex-muted">→ {shortenAddress(tx.to)}</p>
                      </div>
                    </div>
                    <a href={`${network.explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                      className="text-dex-muted hover:text-dex-pink transition-colors" aria-label="Explorer">
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Info panel ── */}
        <div className="w-full max-w-lg space-y-4">
          <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-dex-muted mb-1">{selectedToken?.symbol ?? '—'} / USD</p>
                <p className="text-2xl font-bold text-dex-text">
                  {priceLoading ? '…' : tokenPrice > 0 ? formatUSD(tokenPrice) : 'N/A'}
                </p>
                {tokenPrice > 0 && (
                  <p className="text-sm font-medium" style={{ color: change24h >= 0 ? '#059669' : '#DC2626' }}>
                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%{' '}
                    <span className="text-dex-muted font-normal">24h</span>
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-dex-muted space-y-1">
                <p>Network: <span className="text-dex-text font-medium">{network.shortName}</span></p>
                <p>Chain ID: <span className="text-dex-text font-medium">{chainId}</span></p>
                <p>Gas: <span className="text-dex-text font-medium">{network.nativeCurrency.symbol}</span></p>
              </div>
            </div>
            <PriceChart data={chartData} height={200} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Your Balance',  value: `${balance} ${selectedToken?.symbol ?? ''}` },
              { label: 'USD Value',     value: balanceRaw > BigInt(0) && tokenPrice > 0 ? formatUSD(parseFloat(balance) * tokenPrice) : '—' },
              { label: 'Token',         value: selectedToken?.name ?? '—' },
              { label: 'Address',       value: selectedToken?.address === 'native' ? 'Native' : shortenAddress(selectedToken?.address ?? '', 4) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-dex-border bg-dex-surface p-4 shadow-card">
                <p className="text-xs text-dex-muted">{label}</p>
                <p className="mt-1 text-sm font-bold text-dex-text truncate">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dex-border bg-dex-surface p-4 shadow-card">
            <p className="text-xs font-semibold text-dex-muted uppercase tracking-wide mb-3">Quick Links</p>
            <div className="space-y-2">
              {[
                { label: 'Swap Tokens',     href: '/swap',   desc: 'Trade one token for another' },
                { label: 'Get Test Tokens', href: '/faucet', desc: 'Free testnet tokens from faucets' },
              ].map(({ label, href, desc }) => (
                <a key={href} href={href}
                  className="flex items-center justify-between rounded-xl border border-dex-border px-4 py-2.5 hover:bg-dex-surface-2 hover:border-dex-pink transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-dex-text group-hover:text-dex-pink transition-colors">{label}</p>
                    <p className="text-xs text-dex-muted">{desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-dex-muted group-hover:text-dex-pink transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
