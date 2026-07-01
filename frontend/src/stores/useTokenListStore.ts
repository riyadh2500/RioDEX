import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Token } from '@/types/token'
import { DEFAULT_CHAIN_ID } from '@/config/networks'
import { getTestnetTokens } from '@/config/testnetTokens'

interface TokenListState {
  /** Built-in tokens for the active chain (always sourced from testnetTokens.ts) */
  tokens:       Token[]
  /** Tokens the user added manually via contract address */
  customTokens: Token[]
  searchQuery:  string
  chainId:      number

  setTokens:         (tokens: Token[]) => void
  addCustomToken:    (token: Token)    => void
  removeCustomToken: (address: string) => void
  setSearchQuery:    (query: string)   => void
  /**
   * Call this whenever the connected chain changes.
   * Immediately swaps the built-in token list for the new chain.
   */
  setChainId:  (id: number) => void
  getAllTokens: () => Token[]
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
        const already = customTokens.find(
          (t) => t.address.toLowerCase() === token.address.toLowerCase(),
        )
        if (!already) set({ customTokens: [...customTokens, token] })
      },

      removeCustomToken: (address) =>
        set((state) => ({
          customTokens: state.customTokens.filter(
            (t) => t.address.toLowerCase() !== address.toLowerCase(),
          ),
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setChainId: (id) => {
        set({ chainId: id, tokens: getTestnetTokens(id) })
      },

      getAllTokens: () => {
        const { tokens, customTokens, chainId } = get()

        // Always re-derive from testnetTokens in case the store is stale
        const fresh      = getTestnetTokens(chainId)
        const baseTokens = fresh.length > 0 ? fresh : tokens

        // Merge custom tokens for this chain
        const chainCustom = customTokens.filter((t) => t.chainId === chainId)

        const map = new Map<string, Token>()
        for (const t of [...baseTokens, ...chainCustom]) {
          map.set(t.address.toLowerCase(), t)
        }
        return Array.from(map.values())
      },
    }),
    {
      name: 'dex-token-list-v2',  // bump version to avoid stale rehydration
      partialize: (state) => ({
        customTokens: state.customTokens,
        chainId:      state.chainId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Always re-seed built-in tokens from code (not from storage)
          state.tokens = getTestnetTokens(state.chainId ?? DEFAULT_CHAIN_ID)
        }
      },
    },
  ),
)
