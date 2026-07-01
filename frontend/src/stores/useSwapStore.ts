import { create } from 'zustand'
import { Token } from '@/types/token'

export type SwapField = 'input' | 'output'

interface SwapState {
  tokenIn:          Token | null
  tokenOut:         Token | null
  amountIn:         string
  amountOut:        string
  independentField: SwapField
  loading:          boolean
  error:            string | null

  setTokenIn:   (token: Token | null) => void
  setTokenOut:  (token: Token | null) => void
  setAmountIn:  (amount: string) => void
  setAmountOut: (amount: string) => void
  setLoading:   (loading: boolean) => void
  setError:     (error: string | null) => void
  switchTokens: () => void
  /** Call this whenever the connected chain changes */
  resetForChain: (nativeToken: Token | null) => void
}

export const useSwapStore = create<SwapState>()((set, get) => ({
  tokenIn:          null,
  tokenOut:         null,
  amountIn:         '',
  amountOut:        '',
  independentField: 'input',
  loading:          false,
  error:            null,

  setTokenIn: (token) => {
    const { tokenOut } = get()
    if (token && tokenOut && token.address.toLowerCase() === tokenOut.address.toLowerCase()) {
      set({ tokenIn: token, tokenOut: get().tokenIn, amountIn: '', amountOut: '' })
    } else {
      set({ tokenIn: token, amountIn: '', amountOut: '' })
    }
  },

  setTokenOut: (token) => {
    const { tokenIn } = get()
    if (token && tokenIn && token.address.toLowerCase() === tokenIn.address.toLowerCase()) {
      set({ tokenOut: token, tokenIn: get().tokenOut, amountIn: '', amountOut: '' })
    } else {
      set({ tokenOut: token, amountOut: '' })
    }
  },

  setAmountIn:  (amount) => set({ amountIn: amount,  independentField: 'input',  error: null }),
  setAmountOut: (amount) => set({ amountOut: amount, independentField: 'output', error: null }),
  setLoading:   (loading) => set({ loading }),
  setError:     (error)   => set({ error }),

  switchTokens: () => {
    const { tokenIn, tokenOut, amountIn, amountOut, independentField } = get()
    set({
      tokenIn:          tokenOut,
      tokenOut:         tokenIn,
      amountIn:         independentField === 'input'  ? amountOut : amountIn,
      amountOut:        independentField === 'output' ? amountIn  : amountOut,
      independentField: independentField === 'input'  ? 'output'  : 'input',
      error: null,
    })
  },

  resetForChain: (nativeToken) =>
    set({
      tokenIn:          nativeToken,
      tokenOut:         null,
      amountIn:         '',
      amountOut:        '',
      independentField: 'input',
      error:            null,
    }),
}))
