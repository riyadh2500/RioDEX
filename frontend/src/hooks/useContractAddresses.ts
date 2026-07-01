'use client'

import { useChainId } from 'wagmi'
import { getContracts, getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'

export interface ContractAddresses {
  factory:      string
  router:       string
  tokenFactory: string
  weth:         string
  /** True when the DEX contracts are deployed on the connected chain */
  isDeployed:   boolean
  /** Human-readable name of the active network */
  networkName:  string
}

/**
 * Returns the deployed contract addresses for the currently-connected chain.
 * isDeployed=false when the router address is empty (contracts not yet deployed
 * on that network) — the UI can use this to show a clear "not deployed" state
 * instead of silently failing.
 */
export function useContractAddresses(): ContractAddresses {
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID

  let contracts = { factory: '', router: '', tokenFactory: '', weth: '' }
  let networkName = 'Unknown'

  try {
    contracts   = getContracts(chainId)
    networkName = getNetwork(chainId).name
  } catch {
    try {
      contracts   = getContracts(DEFAULT_CHAIN_ID)
      networkName = getNetwork(DEFAULT_CHAIN_ID).name
    } catch {
      // both failed — return empty
    }
  }

  return {
    ...contracts,
    isDeployed: contracts.router.length > 0,
    networkName,
  }
}
