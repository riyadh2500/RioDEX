'use client'

import { useReadContracts, useChainId } from 'wagmi'
import { DEX_FACTORY_ABI, DEX_PAIR_ABI } from '@/lib/abis'
import { useContractAddresses } from './useContractAddresses'
import { isNativeToken, getWETHToken, formatTokenAmount } from '@/config/tokens'
import { Token } from '@/types/token'
import { DEFAULT_CHAIN_ID } from '@/config/networks'

function resolveAddr(token: Token, chainId: number): `0x${string}` | null {
  if (isNativeToken(token.address)) {
    const weth = getWETHToken(chainId).address
    return weth ? (weth as `0x${string}`) : null
  }
  return token.address.length >= 10 ? (token.address as `0x${string}`) : null
}

/** Read pair address + reserves for two tokens */
export function usePairReserves(tokenA: Token | null, tokenB: Token | null) {
  const chainId              = useChainId() ?? DEFAULT_CHAIN_ID
  const { factory, isDeployed } = useContractAddresses()

  const ZERO = BigInt(0)

  const addrA = tokenA ? resolveAddr(tokenA, chainId) : null
  const addrB = tokenB ? resolveAddr(tokenB, chainId) : null
  const enabled = isDeployed && !!addrA && !!addrB

  const { data, isLoading } = useReadContracts({
    contracts: enabled ? [
      {
        address:      factory as `0x${string}`,
        abi:          DEX_FACTORY_ABI,
        functionName: 'getPair',
        args:         [addrA!, addrB!],
      },
    ] : [],
    query: { enabled },
  })

  const pairAddress = data?.[0]?.result as `0x${string}` | undefined
  const pairExists  =
    !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000'

  const { data: pairData, isLoading: pairLoading } = useReadContracts({
    contracts: pairExists ? [
      { address: pairAddress!, abi: DEX_PAIR_ABI, functionName: 'getReserves'  },
      { address: pairAddress!, abi: DEX_PAIR_ABI, functionName: 'token0'       },
      { address: pairAddress!, abi: DEX_PAIR_ABI, functionName: 'totalSupply'  },
    ] : [],
    query: { enabled: pairExists },
  })

  if (!pairExists || !pairData) {
    return {
      pairAddress:       null,
      reserve0:          ZERO,
      reserve1:          ZERO,
      reserve0Formatted: '0',
      reserve1Formatted: '0',
      totalSupply:       ZERO,
      isLoading:         isLoading || pairLoading,
      pairExists:        false,
    }
  }

  const [reserve0Raw, reserve1Raw] =
    (pairData[0]?.result as [bigint, bigint, number]) ?? [ZERO, ZERO, 0]
  const token0Addr  = pairData[1]?.result as `0x${string}`
  const totalSupply = (pairData[2]?.result as bigint) ?? ZERO

  const [reserveA, reserveB] =
    addrA!.toLowerCase() === token0Addr?.toLowerCase()
      ? [reserve0Raw, reserve1Raw]
      : [reserve1Raw, reserve0Raw]

  return {
    pairAddress,
    reserve0:          reserveA,
    reserve1:          reserveB,
    reserve0Formatted: tokenA ? formatTokenAmount(reserveA, tokenA.decimals) : '0',
    reserve1Formatted: tokenB ? formatTokenAmount(reserveB, tokenB.decimals) : '0',
    totalSupply,
    isLoading:         isLoading || pairLoading,
    pairExists:        true,
  }
}
