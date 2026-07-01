'use client'

import React, { useState } from 'react'
import { Settings, X, Info } from 'lucide-react'
import { useSettingsStore, SlippagePreset } from '@/stores/useSettingsStore'
import { cn } from '@/lib/utils'

const PRESETS: SlippagePreset[] = ['0.1', '0.5', '1.0']

export default function SettingsModal() {
  const [open, setOpen] = useState(false)
  const { slippage, slippagePreset, deadline, expertMode, setSlippage, setDeadline, setExpertMode, resetSettings } =
    useSettingsStore()

  const [customSlippage, setCustomSlippage] = useState(
    slippagePreset === 'custom' ? slippage : '',
  )

  function handlePreset(preset: SlippagePreset) {
    setSlippage(preset, preset)
    setCustomSlippage('')
  }

  function handleCustom(val: string) {
    setCustomSlippage(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0 && num <= 50) setSlippage(val, 'custom')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-dex-muted hover:bg-dex-surface-2 hover:text-dex-text transition-colors"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-dex-border bg-dex-surface shadow-card-lg animate-slide-down">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-dex-border px-5 py-4">
              <h3 className="font-semibold text-dex-text">Transaction Settings</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-dex-muted hover:bg-dex-surface-2 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Slippage */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <p className="text-sm font-medium text-dex-text">Slippage tolerance</p>
                  <div className="group relative">
                    <Info size={13} className="text-dex-muted cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg bg-dex-text px-3 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      The maximum price movement you will accept before the transaction reverts.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePreset(p)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                        slippagePreset === p
                          ? 'bg-dex-pink text-white'
                          : 'bg-dex-surface-2 text-dex-muted hover:text-dex-text',
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0.01"
                      max="50"
                      step="0.1"
                      value={customSlippage}
                      onChange={(e) => handleCustom(e.target.value)}
                      placeholder="Custom"
                      className={cn(
                        'w-full rounded-lg border bg-dex-surface-2 px-3 py-1.5 text-sm text-right outline-none transition-colors pr-6',
                        slippagePreset === 'custom'
                          ? 'border-dex-pink ring-2 ring-dex-pink/20'
                          : 'border-dex-border focus:border-dex-pink focus:ring-2 focus:ring-dex-pink/20',
                      )}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-dex-muted">%</span>
                  </div>
                </div>
                {parseFloat(slippage) > 5 && (
                  <p className="mt-1.5 text-xs text-amber-500">⚠ High slippage — your transaction may be front-run</p>
                )}
              </div>

              {/* Deadline */}
              <div>
                <p className="mb-3 text-sm font-medium text-dex-text">Transaction deadline</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={4320}
                    value={deadline}
                    onChange={(e) => setDeadline(Number(e.target.value))}
                    className="w-24 rounded-lg border border-dex-border bg-dex-surface-2 px-3 py-1.5 text-sm text-dex-text outline-none focus:border-dex-pink focus:ring-2 focus:ring-dex-pink/20 transition-colors"
                  />
                  <span className="text-sm text-dex-muted">minutes</span>
                </div>
              </div>

              {/* Expert mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dex-text">Expert mode</p>
                  <p className="text-xs text-dex-muted">Allows high-slippage trades without confirmation</p>
                </div>
                <button
                  onClick={() => setExpertMode(!expertMode)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    expertMode ? 'bg-dex-pink' : 'bg-dex-border',
                  )}
                  role="switch"
                  aria-checked={expertMode}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      expertMode ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>

              {/* Reset */}
              <button
                onClick={resetSettings}
                className="w-full rounded-lg border border-dex-border py-2 text-sm text-dex-muted hover:border-dex-pink hover:text-dex-pink transition-colors"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
