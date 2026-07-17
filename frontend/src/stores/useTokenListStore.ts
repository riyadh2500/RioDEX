import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Token } from '@/types/token'
import { DEFAULT_CHAIN_ID } from '@/config/networks'
import { getTestnetTokens } from '@/config/testnetTokens'

interface TokenListState {
  tokens:       Token[]
  customTokens: Token[]
  searchQuery:  string
  chainId:      number

  setTokens:         (tokens: Token[]) => void
  addCustomToken:    (token: Token)    => void
  removeCustomToken: (address: string) => void
  setSearchQuery:    (query: string)   => void
  setChainId:        (id: number)      => void
  /** Pass liveChainId from wagmi to always get correct tokens */
  getAllTokens: (liveChainId?: number) => Token[]
}

export const useTokenListStore = create<TokenListState>()(
  persist(
    (set, get) => ({
      tokens:       getTestnetTokens(DEFAULT_CHAIN_ID),
      customTokens: [],
      searchQuery:  '',
      chainId:      DEFAULT_CHAIN_ID,

      setTokens: (tokens) => set({ tokens }),

      addCustomToken: (token) => {
        const { customTokens } = get()
        if (!customTokens.find((t) => t.address.toLowerCase() === token.address.toLowerCase())) {
          set({ customTokens: [...customTokens, token] })
        }
      },

      removeCustomToken: (address) =>
        set((state) => ({
          customTokens: state.customTokens.filter(
            (t) => t.address.toLowerCase() !== address.toLowerCase(),
          ),
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setChainId: (id) => set({ chainId: id, tokens: getTestnetTokens(id) }),

      getAllTokens: (liveChainId?: number) => {
        const { customTokens, chainId } = get()
        // Always use liveChainId if provided — avoids stale persisted chainId
        const effectiveChainId = liveChainId ?? chainId
        const fresh            = getTestnetTokens(effectiveChainId)
        const chainCustom      = customTokens.filter((t) => t.chainId === effectiveChainId)
        const map              = new Map<string, Token>()
        for (const t of [...fresh, ...chainCustom]) map.set(t.address.toLowerCase(), t)
        return Array.from(map.values())
      },
    }),
    {
      name: 'dex-token-list-v3',   // bumped to clear old stale chainId
      partialize: (state) => ({
        customTokens: state.customTokens,
        // Do NOT persist chainId — always derive from wagmi on load
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.chainId = DEFAULT_CHAIN_ID
          state.tokens  = getTestnetTokens(DEFAULT_CHAIN_ID)
        }
      },
    },
  ),
)
