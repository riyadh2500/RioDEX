import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SlippagePreset = '0.1' | '0.5' | '1.0' | 'custom'

interface SettingsState {
  // Slippage tolerance (percentage string, e.g. "0.5")
  slippage: string
  slippagePreset: SlippagePreset
  // Transaction deadline in minutes
  deadline: number
  // Display preferences
  expertMode: boolean
  // Actions
  setSlippage: (value: string, preset?: SlippagePreset) => void
  setDeadline: (minutes: number) => void
  setExpertMode: (enabled: boolean) => void
  resetSettings: () => void
}

const DEFAULTS = {
  slippage: '5.0',
  slippagePreset: '1.0' as SlippagePreset,
  deadline: 20,
  expertMode: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setSlippage: (value, preset = 'custom') =>
        set({ slippage: value, slippagePreset: preset }),

      setDeadline: (minutes) =>
        set({ deadline: Math.max(1, Math.min(minutes, 4320)) }), // 1 min – 3 days

      setExpertMode: (enabled) => set({ expertMode: enabled }),

      resetSettings: () => set({ ...DEFAULTS }),
    }),
    { name: 'dex-settings' }
  )
)

// Convenience: get deadline as a Unix timestamp from now
export function getDeadlineTimestamp(deadlineMinutes: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60)
}
