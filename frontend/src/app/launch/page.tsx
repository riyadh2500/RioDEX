'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi'
import { toast } from 'sonner'
import { Rocket, Upload, X, Info, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { TOKEN_FACTORY_ABI } from '@/lib/abis'
import { useContractAddresses } from '@/hooks/useContractAddresses'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { formatTokenAmount, parseTokenAmount } from '@/config/tokens'
import ConnectWalletButton from '@/components/ConnectWalletButton'
import { cn } from '@/lib/utils'

const network = getNetwork(DEFAULT_CHAIN_ID)
const FEE_ETH = process.env.NEXT_PUBLIC_TOKEN_CREATION_FEE_ETH ?? '0.5'

type Step = 'form' | 'uploading' | 'deploying' | 'done'

interface FormState {
  name:          string
  symbol:        string
  decimals:      string
  initialSupply: string
  logoFile:      File | null
  logoPreview:   string | null
}

function InputField({
  label, name, value, onChange, placeholder, type = 'text', hint, required,
}: {
  label: string; name: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; hint?: string; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="flex items-center gap-1 text-sm font-medium text-dex-text">
        {label}
        {required && <span className="text-dex-red">*</span>}
        {hint && (
          <div className="group relative ml-1">
            <Info size={12} className="text-dex-muted cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg bg-dex-text px-3 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {hint}
            </div>
          </div>
        )}
      </label>
      <input
        id={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-dex-border bg-dex-surface-2 px-4 py-2.5 text-sm text-dex-text placeholder:text-dex-muted outline-none focus:border-dex-pink focus:ring-2 focus:ring-dex-pink/20 transition-all"
      />
    </div>
  )
}

export default function LaunchPage() {
  const { address, isConnected } = useAccount()
  const chainId  = useChainId() ?? DEFAULT_CHAIN_ID
  const { tokenFactory } = useContractAddresses()

  const [step, setStep] = useState<Step>('form')
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>({
    name:          '',
    symbol:        '',
    decimals:      '18',
    initialSupply: '1000000',
    logoFile:      null,
    logoPreview:   null,
  })

  function setField(key: keyof FormState, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Read creation fee from contract
  const { data: creationFeeRaw } = useReadContract({
    address:      tokenFactory as `0x${string}`,
    abi:          TOKEN_FACTORY_ABI,
    functionName: 'creationFee',
    query:        { enabled: !!tokenFactory },
  })
  const creationFee = creationFeeRaw
    ? parseTokenAmount(FEE_ETH, 18)
    : parseTokenAmount(FEE_ETH, 18)

  // Write contract
  const { writeContract, data: txHash, isPending: txPending, error: writeError } = useWriteContract()
  const { isLoading: txWaiting, isSuccess: txSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (txSuccess) {
      // Extract deployed token address from TokenCreated event (first topic + data)
      const tokenCreatedLog = receipt?.logs?.[0]
      if (tokenCreatedLog) {
        const addr = `0x${tokenCreatedLog.topics?.[1]?.slice(26)}`
        setDeployedAddress(addr)
      }
      setStep('done')
      // Save to Supabase via API
      if (deployedAddress) {
        fetch('/api/tokens', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address:    deployedAddress,
            name:       form.name,
            symbol:     form.symbol,
            decimals:   Number(form.decimals),
            created_by: address,
          }),
        }).catch(console.error)
      }
    }
  }, [txSuccess, receipt])

  useEffect(() => {
    if (writeError) {
      toast.error('Transaction failed', { description: (writeError as any)?.shortMessage ?? writeError.message })
      setStep('form')
    }
  }, [writeError])

  async function handleLogo(file: File) {
    setField('logoFile', file)
    const reader = new FileReader()
    reader.onload = (e) => setField('logoPreview', e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tokenFactory || !address) return

    const { name, symbol, decimals, initialSupply, logoFile } = form
    if (!name || !symbol || !decimals || !initialSupply) {
      toast.error('Please fill in all required fields')
      return
    }

    let logoUrl: string | undefined
    if (logoFile) {
      setStep('uploading')
      try {
        const fd = new FormData()
        fd.append('file', logoFile)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (json.url) logoUrl = json.url
      } catch {
        toast.error('Logo upload failed — continuing without logo')
      }
    }

    setStep('deploying')
    writeContract({
      address:      tokenFactory as `0x${string}`,
      abi:          TOKEN_FACTORY_ABI,
      functionName: 'createToken',
      args:         [name, symbol, Number(decimals), BigInt(initialSupply)],
      value:        creationFee,
    })
  }

  // ── Done state ──────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-dex-green/10 text-dex-green">
            <CheckCircle2 size={40} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-dex-text">Token Launched!</h1>
        <p className="text-dex-muted text-sm">
          <strong>{form.name} ({form.symbol})</strong> is now live on-chain.
        </p>
        {deployedAddress && (
          <div className="rounded-xl border border-dex-border bg-dex-surface-2 px-4 py-3 text-sm font-mono text-dex-muted break-all">
            {deployedAddress}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <Link
            href={`/liquidity/add?tokenA=${deployedAddress}`}
            className="w-full rounded-xl bg-dex-pink py-3 text-sm font-semibold text-white hover:bg-dex-purple transition-colors shadow-card text-center"
          >
            Add Liquidity to Your Token
          </Link>
          {deployedAddress && (
            <a
              href={`${network.explorerUrl}/address/${deployedAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-dex-border py-3 text-sm font-medium text-dex-text hover:bg-dex-surface-2 transition-colors"
            >
              View on Explorer <ExternalLink size={13} />
            </a>
          )}
          <button
            onClick={() => { setStep('form'); setDeployedAddress(null); setForm({ name: '', symbol: '', decimals: '18', initialSupply: '1000000', logoFile: null, logoPreview: null }) }}
            className="text-sm text-dex-muted hover:text-dex-text transition-colors"
          >
            Launch another token
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      {/* Page header */}
      <div className="mb-8 text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-dex-pink-light text-dex-pink">
            <Rocket size={28} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-dex-text">Launch Your Token</h1>
        <p className="text-dex-muted text-sm max-w-sm mx-auto">
          Deploy a new ERC-20 token in seconds. A creation fee of{' '}
          <strong>{FEE_ETH} ETH</strong> is required.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {(['form', 'uploading', 'deploying'] as Step[]).map((s, idx) => (
          <React.Fragment key={s}>
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              step === s ? 'bg-dex-pink text-white' :
              ['uploading', 'deploying', 'done'].indexOf(step) > ['form', 'uploading', 'deploying'].indexOf(s)
                ? 'bg-dex-green text-white' : 'bg-dex-surface-2 text-dex-muted border border-dex-border',
            )}>
              {idx + 1}
            </div>
            {idx < 2 && <div className="h-px w-10 bg-dex-border" />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-dex-border bg-dex-surface shadow-card-md p-6 space-y-5">

        {/* Logo upload */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-dex-text">Token Logo</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors',
              form.logoPreview ? 'border-dex-pink bg-dex-pink-light/30' : 'border-dex-border hover:border-dex-pink hover:bg-dex-surface-2',
            )}
          >
            {form.logoPreview ? (
              <div className="relative">
                <img src={form.logoPreview} alt="Logo preview" className="h-16 w-16 rounded-full object-cover ring-2 ring-dex-pink" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setField('logoFile', null); setField('logoPreview', null) }}
                  className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-dex-red shadow-card"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={20} className="text-dex-muted" />
                <p className="text-xs text-dex-muted">Click to upload logo <span className="text-dex-muted">(PNG, JPG, SVG · max 2MB)</span></p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])}
          />
        </div>

        {/* Name + Symbol */}
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Token Name" name="name"
            value={form.name} onChange={(v) => setField('name', v)}
            placeholder="My Awesome Token" required
            hint="The full name of your token"
          />
          <InputField
            label="Symbol" name="symbol"
            value={form.symbol} onChange={(v) => setField('symbol', v.toUpperCase().slice(0, 8))}
            placeholder="MAT" required
            hint="Ticker symbol (max 8 characters)"
          />
        </div>

        {/* Decimals + Supply */}
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Decimals" name="decimals" type="number"
            value={form.decimals} onChange={(v) => setField('decimals', v)}
            placeholder="18" required
            hint="Standard ERC-20 uses 18 decimals"
          />
          <InputField
            label="Initial Supply" name="supply" type="number"
            value={form.initialSupply} onChange={(v) => setField('initialSupply', v)}
            placeholder="1000000" required
            hint="Number of whole tokens to mint to your wallet"
          />
        </div>

        {/* Fee notice */}
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>
            A creation fee of <strong>{FEE_ETH} ETH</strong> is charged. The entire initial supply will
            be minted to your wallet. You can add liquidity to your token immediately after launch.
          </p>
        </div>

        {/* Submit */}
        {!isConnected ? (
          <ConnectWalletButton fullWidth label="Connect Wallet to Launch" />
        ) : (
          <button
            type="submit"
            disabled={step !== 'form'}
            className={cn(
              'w-full rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2',
              step !== 'form'
                ? 'bg-dex-surface-2 text-dex-muted border border-dex-border cursor-not-allowed'
                : 'bg-dex-pink text-white hover:bg-dex-purple shadow-card',
            )}
          >
            {step === 'uploading' && <><Loader2 size={15} className="animate-spin" /> Uploading logo…</>}
            {step === 'deploying' && <><Loader2 size={15} className="animate-spin" /> Deploying contract…</>}
            {step === 'form'      && <><Rocket size={15} /> Launch Token ({FEE_ETH} ETH)</>}
          </button>
        )}
      </form>

      {/* Explainer */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        {[
          { icon: '⚡', title: 'Instant Deploy',  desc: 'Token goes live in one transaction' },
          { icon: '🔒', title: 'You Own It',      desc: 'Full ownership and mint rights' },
          { icon: '💧', title: 'Add Liquidity',   desc: 'Start trading immediately' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-dex-border bg-dex-surface p-4 shadow-card">
            <p className="text-2xl mb-2">{icon}</p>
            <p className="text-xs font-semibold text-dex-text">{title}</p>
            <p className="text-xs text-dex-muted mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
