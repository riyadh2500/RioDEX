'use client'

import { useReadContracts } from 'wagmi'
import { DEX_PAIR_ABI } from '@/lib/abis'
import { LiquidityPosition, Pair } from '@/types/pair'
import { formatTokenAmount } from '@/config/tokens'

/**
 * For each pair, reads the user's LP balance and derives their
 * share of pool reserves.
 */
export function useLiquidityPositions(
  pairs: Pair[],
  userAddress: `0x${string}` | undefined,
) {
  const contracts = pairs.flatMap((pair) => [
    {
      address:      pair.address as `0x${string}`,
      abi:          DEX_PAIR_ABI,
      functionName: 'balanceOf' as const,
      args:         userAddress ? [userAddress] : undefined,
    },
    {
      address:      pair.address as `0x${string}`,
      abi:          DEX_PAIR_ABI,
      functionName: 'totalSupply' as const,
    },
  ])

  const { data, isLoading } = useReadContracts({
    contracts: contracts as any,
    query:     { enabled: !!userAddress && pairs.length > 0 },
  })

  if (!data || !userAddress) return { positions: [], isLoading }

  const positions: LiquidityPosition[] = []

  pairs.forEach((pair, i) => {
    const lpBalance   = (data[i * 2]?.result     as bigint) ?? BigInt(0)
    const totalSupply = (data[i * 2 + 1]?.result as bigint) ?? BigInt(0)

    if (lpBalance === BigInt(0) || totalSupply === BigInt(0)) return

    const share        = Number(lpBalance) / Number(totalSupply)
    const token0Amount = (BigInt(pair.reserve0Raw) * lpBalance) / totalSupply
    const token1Amount = (BigInt(pair.reserve1Raw) * lpBalance) / totalSupply

    positions.push({
      pair,
      lpBalance:    formatTokenAmount(lpBalance, 18),
      lpBalanceRaw: lpBalance,
      share,
      token0Amount: formatTokenAmount(token0Amount, pair.token0.decimals),
      token1Amount: formatTokenAmount(token1Amount, pair.token1.decimals),
      valueUSD:     pair.tvlUSD ? pair.tvlUSD * share : undefined,
    })
  })

  return { positions, isLoading }
}
