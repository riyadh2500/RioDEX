'use client'

import { useReadContract, useChainId } from 'wagmi'
import { DEX_FACTORY_ABI, DEX_PAIR_ABI } from '@/lib/abis'
import { useContractAddresses } from './useContractAddresses'
import { isNativeToken, getWETHToken, formatTokenAmount } from '@/config/tokens'
import { Token } from '@/types/token'
import { DEFAULT_CHAIN_ID } from '@/config/networks'
import { useState, useEffect } from 'react'

function resolveAddr(token: Token, chainId: number): `0x${string}` | null {
  if (isNativeToken(token.address)) {
    const weth = getWETHToken(chainId).address
    if (!weth || weth.length < 10) return null
    return weth as `0x${string}`
  }
  if (!token.address || token.address.length < 10) return null
  return token.address as `0x${string}`
}

export function usePairReserves(tokenA: Token | null, tokenB: Token | null) {
  const chainId                 = useChainId() ?? DEFAULT_CHAIN_ID
  const { factory, isDeployed } = useContractAddresses()

  const ZERO = BigInt(0)

  const addrA   = tokenA ? resolveAddr(tokenA, chainId) : null
  const addrB   = tokenB ? resolveAddr(tokenB, chainId) : null
  const enabled = isDeployed && !!factory && !!addrA && !!addrB

  // ── Timeout guard — never block UI more than 5 seconds ───────────────────
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (!enabled) { setTimedOut(false); return }
    setTimedOut(false)
    const t = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(t)
  }, [enabled, addrA, addrB])

  // Step 1 — pair address
  const { data: pairAddrData, isLoading: pairAddrLoading } = useReadContract({
    address:      factory as `0x${string}`,
    abi:          DEX_FACTORY_ABI,
    functionName: 'getPair',
    args:         enabled ? [addrA!, addrB!] : undefined,
    query:        { enabled, staleTime: 10_000, retry: 2 },
  })

  const pairAddress = pairAddrData as `0x${string}` | undefined
  const pairExists  = !!pairAddress &&
    pairAddress !== '0x0000000000000000000000000000000000000000'

  // Step 2 — reserves
  const { data: reservesData, isLoading: reservesLoading } = useReadContract({
    address:      pairAddress,
    abi:          DEX_PAIR_ABI,
    functionName: 'getReserves',
    query:        { enabled: pairExists, staleTime: 10_000, retry: 2 },
  })

  // Step 3 — token0
  const { data: token0Data } = useReadContract({
    address:      pairAddress,
    abi:          DEX_PAIR_ABI,
    functionName: 'token0',
    query:        { enabled: pairExists, staleTime: 60_000, retry: 2 },
  })

  // Step 4 — totalSupply
  const { data: totalSupplyData } = useReadContract({
    address:      pairAddress,
    abi:          DEX_PAIR_ABI,
    functionName: 'totalSupply',
    query:        { enabled: pairExists, staleTime: 10_000, retry: 2 },
  })

  // If timed out or not loading, treat as done
  const isLoading = !timedOut && (pairAddrLoading || (pairExists && reservesLoading))

  if (!pairExists || !reservesData) {
    return {
      pairAddress:       null as `0x${string}` | null,
      reserve0:          ZERO,
      reserve1:          ZERO,
      reserve0Formatted: '0',
      reserve1Formatted: '0',
      totalSupply:       ZERO,
      isLoading,
      pairExists:        false,
    }
  }

  const [reserve0Raw, reserve1Raw] =
    (reservesData as [bigint, bigint, number]) ?? [ZERO, ZERO, 0]
  const token0Addr  = token0Data as `0x${string}` | undefined
  const totalSupply = (totalSupplyData as bigint | undefined) ?? ZERO

  const [reserveA, reserveB] =
    token0Addr && addrA && addrA.toLowerCase() === token0Addr.toLowerCase()
      ? [reserve0Raw, reserve1Raw]
      : [reserve1Raw, reserve0Raw]

  return {
    pairAddress:       pairAddress as `0x${string}`,
    reserve0:          reserveA,
    reserve1:          reserveB,
    reserve0Formatted: tokenA ? formatTokenAmount(reserveA, tokenA.decimals) : '0',
    reserve1Formatted: tokenB ? formatTokenAmount(reserveB, tokenB.decimals) : '0',
    totalSupply,
    isLoading,
    pairExists:        true,
  }
}
