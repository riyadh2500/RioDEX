'use client'

import { useChainId } from 'wagmi'
import { Pair } from '@/types/pair'
import { useOnChainPairs } from './useOnChainPairs'
import { DEFAULT_CHAIN_ID } from '@/config/networks'

/**
 * Returns all pools for the currently-connected chain.
 * Reads directly from the on-chain factory — no API/Supabase required.
 */
export function useAllPairs() {
  return useOnChainPairs()
}
