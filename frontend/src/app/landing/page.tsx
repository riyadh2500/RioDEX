import React from 'react'
import Link from 'next/link'
import { ArrowRight, Send, Droplets, GlassWater, Shield, Zap, Globe } from 'lucide-react'

const STATS = [
  { label: 'Total Value Locked', value: '$4.8M+' },
  { label: 'Transactions Sent',  value: '48,000+' },
  { label: 'Active Pairs',       value: '120+' },
  { label: 'Networks Supported', value: '4' },
]

const FEATURES = [
  {
    icon:  Send,
    title: 'Send Tokens',
    desc:  'Send any token to any address instantly across all supported networks. No middlemen, no delays.',
    href:  '/send',
    color: 'text-dex-pink bg-dex-pink-light',
  },
  {
    icon:  Droplets,
    title: 'Earn with Liquidity',
    desc:  'Deposit token pairs into pools and earn a share of every swap fee in that pair.',
    href:  '/liquidity',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    icon:  GlassWater,
    title: 'Testnet Faucet',
    desc:  'Get testnet tokens for Sepolia, BNB, Base, and ARC networks — free, no sign-up required.',
    href:  '/faucet',
    color: 'text-emerald-600 bg-emerald-50',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Connect Wallet',   desc: 'Connect MetaMask or any injected wallet in one click.' },
  { step: '02', title: 'Pick a Network',   desc: 'Switch to any of the 4 supported testnets from the network selector.' },
  { step: '03', title: 'Send or Provide',  desc: 'Send tokens to any address, or add liquidity to earn fees.' },
  { step: '04', title: 'Track Everything', desc: 'Monitor your positions and history on the dashboard.' },
]

const TECH = [
  { icon: Shield, title: 'Non-Custodial',  desc: 'Smart contracts hold all funds. You keep your keys.' },
  { icon: Zap,    title: 'Gas Efficient',  desc: 'Optimised contracts with viaIR compilation.' },
  { icon: Globe,  title: 'Multi-Chain',    desc: 'Ethereum Sepolia, BNB, Base, and ARC Testnet supported.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dex-bg">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-dex-border bg-gradient-to-br from-dex-surface via-white to-dex-pink-light/30">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-dex-pink/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-blue-100 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl px-4 py-24 md:px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-dex-pink/30 bg-dex-pink-light px-4 py-1.5 text-sm font-medium text-dex-pink">
            <Zap size={13} /> Multi-Chain · 100% On-Chain
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-dex-text leading-tight tracking-tight">
            The Decentralised<br />
            <span className="text-dex-pink">RioDex Platform</span>
          </h1>

          <p className="text-lg text-dex-muted max-w-xl mx-auto">
            Send tokens, earn liquidity fees, and get testnet funds — all on RioDex without giving up custody of your assets.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/send"
              className="flex items-center gap-2 rounded-xl bg-dex-pink px-7 py-3.5 text-sm font-semibold text-white hover:bg-dex-purple transition-colors shadow-card-md"
            >
              Launch App <ArrowRight size={16} />
            </Link>
            <Link
              href="/liquidity"
              className="flex items-center gap-2 rounded-xl border border-dex-border bg-dex-surface px-7 py-3.5 text-sm font-semibold text-dex-text hover:bg-dex-surface-2 transition-colors shadow-card"
            >
              Add Liquidity
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-dex-border bg-dex-surface">
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map(({ label, value }) => (
              <div key={label}>
                <p className="text-3xl font-black text-dex-text">{value}</p>
                <p className="text-sm text-dex-muted mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-5xl px-4 py-20 md:px-6 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-dex-text">Everything you need to DeFi</h2>
          <p className="text-dex-muted max-w-md mx-auto">
            Three core features — all accessible from a single clean interface.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, href, color }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-2xl border border-dex-border bg-dex-surface p-5 shadow-card hover:shadow-card-md hover:-translate-y-0.5 transition-all space-y-3"
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-dex-text group-hover:text-dex-pink transition-colors">{title}</h3>
              <p className="text-sm text-dex-muted leading-relaxed">{desc}</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-dex-pink">
                Get started <ArrowRight size={12} />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-dex-border bg-dex-surface">
        <div className="mx-auto max-w-5xl px-4 py-20 md:px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-dex-text">How it works</h2>
            <p className="text-dex-muted">Start using the platform in under a minute.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }, idx) => (
              <div key={step} className="relative space-y-3">
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute top-5 left-[calc(50%+20px)] hidden lg:block h-px w-full bg-dex-border" />
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-dex-pink text-white text-sm font-bold">
                  {step}
                </div>
                <h3 className="font-semibold text-dex-text">{title}</h3>
                <p className="text-sm text-dex-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Technology ── */}
      <section className="mx-auto max-w-5xl px-4 py-20 md:px-6 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-dex-text">Built for trust</h2>
          <p className="text-dex-muted max-w-md mx-auto">Transparent, auditable, and non-custodial.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {TECH.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-dex-border bg-dex-surface p-6 shadow-card space-y-3 text-center">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dex-pink-light text-dex-pink">
                  <Icon size={22} />
                </div>
              </div>
              <h3 className="font-semibold text-dex-text">{title}</h3>
              <p className="text-sm text-dex-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-dex-border bg-gradient-to-r from-dex-pink to-dex-purple">
        <div className="mx-auto max-w-3xl px-4 py-20 md:px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
          <p className="text-white/80">Connect your wallet and start using RioDex in seconds.</p>
          <Link
            href="/send"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-dex-pink hover:bg-dex-pink-light transition-colors shadow-card-md"
          >
            Launch App <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-dex-border bg-dex-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-dex-text">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-dex-pink text-white text-xs font-black">R</div>
            RioDex
          </div>
          <div className="flex gap-6 text-sm text-dex-muted">
            {[
              { label: 'Send',       href: '/send'      },
              { label: 'Liquidity',  href: '/liquidity' },
              { label: 'Faucet',     href: '/faucet'    },
              { label: 'Dashboard',  href: '/dashboard' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="hover:text-dex-text transition-colors">{label}</Link>
            ))}
          </div>
          <p className="text-xs text-dex-muted">© 2026 RioDex Protocol. MIT License.</p>
        </div>
      </footer>
    </div>
  )
}
