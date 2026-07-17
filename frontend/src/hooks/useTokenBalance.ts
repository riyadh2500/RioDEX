'use client'

import { useBalance, useReadContract } from 'wagmi'
import { ERC20_ABI } from '@/lib/abis'
import { isNativeToken, formatTokenAmount } from '@/config/tokens'
import { Token } from '@/types/token'

export function useTokenBalance(token: Token | null, address: `0x${string}` | undefined) {
  const isNative = token ? isNativeToken(token.address) : false

  const { data: ethBalance } = useBalance({
    address,
    query: {
      enabled:   !!address && isNative,
      staleTime: 15_000,
      // No refetchInterval — only refetch when window focuses or manually triggered
    },
  })

  const { data: erc20Balance } = useReadContract({
    address:      token?.address as `0x${string}`,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query: {
      enabled:   !!address && !!token && !isNative && !!token.address && token.address.length >= 10,
      staleTime: 15_000,
    },
  })

  const ZERO = BigInt(0)

  if (!token || !address) {
    return { balance: '0', balanceRaw: ZERO, isLoading: false }
  }

  if (isNative) {
    const raw = ethBalance?.value ?? ZERO
    return {
      balance:    formatTokenAmount(raw, token.decimals),
      balanceRaw: raw,
      isLoading:  false,
    }
  }

  const raw = (erc20Balance as bigint | undefined) ?? ZERO
  return {
    balance:    formatTokenAmount(raw, token.decimals),
    balanceRaw: raw,
    isLoading:  false,
  }
}
