'use client'

import { useBalance, useReadContract } from 'wagmi'
import { ERC20_ABI } from '@/lib/abis'
import { isNativeToken, formatTokenAmount } from '@/config/tokens'
import { Token } from '@/types/token'

export function useTokenBalance(
  token:   Token | null,
  address: `0x${string}` | undefined,
) {
  const isNative = !!token && isNativeToken(token.address)
  const isERC20  = !!token && !isNative && !!token.address &&
                   token.address.length >= 10 && token.address !== 'native'

  const { data: ethData } = useBalance({
    address,
    query: {
      enabled:              !!address && isNative,
      staleTime:            30_000,
      refetchOnWindowFocus: true,
      refetchOnMount:       true,
      retry:                3,
    },
  })

  const { data: erc20Data } = useReadContract({
    address:      token?.address as `0x${string}`,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query: {
      enabled:              !!address && isERC20,
      staleTime:            30_000,
      refetchOnWindowFocus: true,
      refetchOnMount:       true,
      retry:                3,
    },
  })

  const ZERO = BigInt(0)

  if (!token || !address) {
    return { balance: '0', balanceRaw: ZERO, isLoading: false }
  }

  if (isNative) {
    const raw = ethData?.value ?? ZERO
    return {
      balance:    formatTokenAmount(raw, token.decimals),
      balanceRaw: raw,
      isLoading:  false,
    }
  }

  if (isERC20) {
    const raw = (erc20Data as bigint | undefined) ?? ZERO
    return {
      balance:    formatTokenAmount(raw, token.decimals),
      balanceRaw: raw,
      isLoading:  false,
    }
  }

  return { balance: '0', balanceRaw: ZERO, isLoading: false }
}
