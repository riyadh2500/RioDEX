'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeftRight, Clock, Bell, Send, GlassWater } from 'lucide-react'

export default function SwapPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center space-y-8">

        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-dex-pink-light">
              <ArrowLeftRight size={40} className="text-dex-pink" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 shadow-card">
              <Clock size={14} className="text-white" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-dex-text tracking-tight">
            Swap — Coming Soon
          </h1>
          <p className="text-dex-muted text-lg max-w-sm mx-auto leading-relaxed">
            Token swapping is being deployed to all RioDex networks.
            It will be live very shortly.
          </p>
        </div>

        {/* Progress steps */}
        <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card p-6 text-left space-y-4">
          <p className="text-xs font-semibold text-dex-muted uppercase tracking-wide">Deployment status</p>
          {[
            { label: 'Smart contracts compiled',          done: true  },
            { label: 'Deploying to Ethereum Sepolia',     done: false },
            { label: 'Deploying to Base Sepolia',         done: false },
            { label: 'Deploying to ARC Testnet',          done: false },
            { label: 'Swap interface goes live',          done: false },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done ? 'bg-dex-green text-white' : 'border-2 border-dex-border bg-dex-surface-2'
              }`}>
                {done ? '✓' : ''}
              </div>
              <span className={`text-sm ${done ? 'text-dex-text font-medium' : 'text-dex-muted'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* What you can do now */}
        <div className="rounded-2xl border border-dex-border bg-dex-surface shadow-card p-5 text-left space-y-3">
          <p className="text-xs font-semibold text-dex-muted uppercase tracking-wide">Available now</p>
          <div className="space-y-2">
            {[
              { icon: Send,        label: 'Send tokens',          href: '/send',   desc: 'Transfer any token to any address' },
              { icon: GlassWater,  label: 'Get testnet tokens',   href: '/faucet', desc: 'Fund your wallet from official faucets' },
            ].map(({ icon: Icon, label, href, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-dex-border px-4 py-3 hover:bg-dex-surface-2 hover:border-dex-pink transition-colors group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dex-pink-light text-dex-pink">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dex-text group-hover:text-dex-pink transition-colors">{label}</p>
                  <p className="text-xs text-dex-muted">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-xs text-dex-muted">
          Deploy the DEX contracts to activate swapping.{' '}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-dex-pink hover:underline"
          >
            View deployment guide →
          </a>
        </p>
      </div>
    </div>
  )
}
