'use client'

export const dynamic = 'force-dynamic'

import React, { useState } from 'react'
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Droplets, ExternalLink, Copy, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

import { getAllNetworks, getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { getTestnetTokens } from '@/config/testnetTokens'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { ERC20_ABI } from '@/lib/abis'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import TokenIcon from '@/components/TokenIcon'
import { cn } from '@/lib/utils'
import { Token } from '@/types/token'

// ─── Per-chain faucet links ───────────────────────────────────────────────────
const FAUCET_LINKS: Record<number, { label: string; url: string; note: string }[]> = {
  11155111: [
    { label: 'Alchemy Sepolia Faucet', url: 'https://sepoliafaucet.com',           note: 'Free 0.5 ETH/day — requires sign-in' },
    { label: 'Infura Sepolia Faucet',  url: 'https://www.infura.io/faucet/sepolia', note: 'Free 0.5 ETH/day' },
    { label: 'Aave Testnet Tokens',    url: 'https://staging.aave.com/faucet/',     note: 'USDC, USDT, WBTC on Sepolia' },
    { label: 'Circle USDC Faucet',     url: 'https://faucet.circle.com',            note: 'Official Circle testnet USDC' },
  ],
  84532: [
    { label: 'Alchemy Base Sepolia',   url: 'https://www.alchemy.com/faucets/base-sepolia',           note: 'Free 0.1 ETH/day' },
    { label: 'Coinbase Base Faucet',   url: 'https://docs.base.org/docs/tools/network-faucets',        note: 'Official Base faucet list' },
    { label: 'Circle USDC Faucet',     url: 'https://faucet.circle.com',                              note: 'Official Circle USDC on Base Sepolia' },
  ],
  5042002: [
    { label: 'Circle ARC Faucet',      url: 'https://faucet.circle.com',            note: 'Official — testnet USDC & EURC' },
    { label: 'ARC Testnet Faucet',     url: 'https://faucet.arc.network',            note: 'Direct ARC testnet USDC faucet' },
  ],
}

const MOCK_FAUCET_CHAINS = [31337]

// ─── Chain faucet card ────────────────────────────────────────────────────────
function ChainFaucetCard({ chainId, isActive }: { chainId: number; isActive: boolean }) {
  const network = (() => { try { return getNetwork(chainId) } catch { return null } })()
  const tokens  = getTestnetTokens(chainId)
  const links   = FAUCET_LINKS[chainId] ?? []
  if (!network) return null

  return (
    <div className={cn('rounded-2xl border bg-dex-surface shadow-card transition-all',
      isActive ? 'border-dex-pink ring-2 ring-dex-pink/20' : 'border-dex-border')}>
      <div className="flex items-center justify-between border-b border-dex-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 shrink-0">
            <Image src={network.logoUrl} alt={network.name} fill
              className="rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              unoptimized />
          </div>
          <div>
            <p className="font-semibold text-dex-text">{network.name}</p>
            <p className="text-xs text-dex-muted">Chain ID: {network.chainId} · {network.nativeCurrency.symbol}</p>
          </div>
        </div>
        {isActive && (
          <span className="rounded-full bg-dex-green/10 px-2.5 py-1 text-xs font-semibold text-dex-green border border-dex-green/20">
            Connected
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-dex-muted uppercase tracking-wide mb-2">Available Tokens</p>
          <div className="flex flex-wrap gap-2">
            {tokens.map((t) => (
              <div key={t.address} className="flex items-center gap-1.5 rounded-lg border border-dex-border bg-dex-surface-2 px-2.5 py-1.5 text-xs font-medium text-dex-text">
                <TokenIcon token={t} size={14} />
                <span>{t.symbol}</span>
              </div>
            ))}
            {tokens.length === 0 && <p className="text-xs text-dex-muted">No tokens configured yet</p>}
          </div>
        </div>

        {links.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-dex-muted uppercase tracking-wide mb-2">Get Tokens</p>
            <div className="space-y-2">
              {links.map(({ label, url, note }) => (
                <a key={url} href={url} target="_blank" rel="noreferrer"
                  className="flex items-start justify-between gap-3 rounded-xl border border-dex-border bg-dex-surface-2 px-4 py-3 hover:border-dex-pink hover:bg-dex-pink-light/30 transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dex-text group-hover:text-dex-pink transition-colors">{label}</p>
                    <p className="text-xs text-dex-muted mt-0.5">{note}</p>
                  </div>
                  <ExternalLink size={14} className="shrink-0 mt-0.5 text-dex-muted group-hover:text-dex-pink" />
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0" />
            Deploy contracts on this network to enable on-chain token claims.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mock faucet row (localhost only) ────────────────────────────────────────
function MockFaucetRow({ token }: { token: Token }) {
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  const [copied, setCopied] = useState(false)

  function claim() {
    if (token.address === 'native' || token.address.length < 10) return
    writeContract({ address: token.address as `0x${string}`, abi: ERC20_ABI, functionName: 'faucet' as any, args: [] as any })
  }
  function copy() {
    navigator.clipboard.writeText(token.address)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  const loading = isPending || waiting

  return (
    <div className="flex items-center justify-between rounded-xl border border-dex-border bg-dex-surface-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <TokenIcon token={token} size={28} />
        <div>
          <p className="text-sm font-semibold text-dex-text">{token.symbol}</p>
          <p className="text-xs text-dex-muted">{token.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {token.address !== 'native' && (
          <button onClick={copy} title="Copy address"
            className="rounded-lg border border-dex-border p-1.5 text-dex-muted hover:text-dex-text hover:bg-dex-surface transition-colors">
            {copied ? <CheckCircle2 size={13} className="text-dex-green" /> : <Copy size={13} />}
          </button>
        )}
        {token.address !== 'native' ? (
          <button onClick={claim} disabled={loading || isSuccess}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              isSuccess ? 'bg-dex-green/10 text-dex-green border border-dex-green/20 cursor-default'
              : loading ? 'bg-dex-surface-2 text-dex-muted border border-dex-border cursor-not-allowed'
              : 'bg-dex-pink text-white hover:bg-dex-purple')}>
            {loading && <Loader2 size={12} className="inline animate-spin mr-1" />}
            {isSuccess && <CheckCircle2 size={12} className="inline mr-1" />}
            {isSuccess ? 'Claimed!' : loading ? 'Claiming…' : 'Claim 1 000'}
          </button>
        ) : (
          <span className="text-xs text-dex-muted italic">Use faucet link</span>
        )}
      </div>
    </div>
  )
}

// ─── Main faucet page ─────────────────────────────────────────────────────────
export default function FaucetPage() {
  const { address, isConnected } = useAccount()
  const chainId    = useChainId() ?? DEFAULT_CHAIN_ID
  const networks   = getAllNetworks()
  const { isDeployed } = useContractAddresses()
  const mockTokens = getTestnetTokens(chainId).filter((t) => t.address !== 'native' && t.address.length >= 10)
  const isMockChain = MOCK_FAUCET_CHAINS.includes(chainId)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 space-y-8">

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-dex-pink-light text-dex-pink">
            <Droplets size={28} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-dex-text">RioDex Testnet Faucet</h1>
        <p className="text-dex-muted text-sm max-w-lg mx-auto">
          Get testnet tokens for Ethereum Sepolia, Base Sepolia, and ARC Testnet.
          Native tokens and stablecoins are available from the official sources below.
        </p>
      </div>

      {/* Wallet banner */}
      {!isConnected ? (
        <div className="rounded-2xl border border-dex-border bg-dex-surface p-8 text-center space-y-4">
          <p className="text-dex-muted text-sm">Connect your wallet to see your address and claim tokens.</p>
          <ConnectWalletButton label="Connect Wallet" />
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-dex-border bg-dex-surface px-5 py-3 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-dex-green" />
            <p className="text-sm text-dex-muted">Connected:</p>
            <p className="text-sm font-mono font-medium text-dex-text truncate max-w-[240px]">{address}</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(address ?? '')}
            className="rounded-lg border border-dex-border px-3 py-1.5 text-xs text-dex-muted hover:bg-dex-surface-2 transition-colors">
            <Copy size={12} className="inline mr-1" /> Copy
          </button>
        </div>
      )}

      {/* On-chain mock faucet (localhost only) */}
      {isConnected && isMockChain && isDeployed && mockTokens.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-dex-text">Claim Mock Tokens</h2>
            <p className="text-xs text-dex-muted mt-0.5">MockERC20 contracts on localhost. Click Claim to mint 1 000 tokens to your wallet.</p>
          </div>
          <div className="space-y-2">
            {mockTokens.map((t) => <MockFaucetRow key={t.address} token={t} />)}
          </div>
        </section>
      )}

      {/* Per-chain faucet cards */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-dex-text">Faucets by Network</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {networks.map((net) => (
            <ChainFaucetCard key={net.chainId} chainId={net.chainId} isActive={net.chainId === chainId} />
          ))}
        </div>
      </section>

      {/* How-to */}
      <section className="rounded-2xl border border-dex-border bg-dex-surface p-6 space-y-4">
        <h2 className="text-base font-semibold text-dex-text">How to use testnet tokens</h2>
        <ol className="space-y-3 text-sm text-dex-muted list-none">
          {[
            { n: '1', text: 'Connect MetaMask and switch to your chosen testnet using the network selector in the top bar.' },
            { n: '2', text: 'Get the native gas token first (ETH on Sepolia/Base, USDC on ARC) from the faucet links above.' },
            { n: '3', text: 'Get stablecoins (USDC, USDT) from Circle\'s official faucet at faucet.circle.com.' },
            { n: '4', text: 'Use Swap on RioDex to trade tokens, or Send to transfer them to another wallet.' },
          ].map(({ n, text }) => (
            <li key={n} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dex-pink text-white text-xs font-bold mt-0.5">{n}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
