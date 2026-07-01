'use client'

import { useBalance, useReadContract } from 'wagmi'
import { ERC20_ABI } from '@/lib/abis'
import { isNativeToken, formatTokenAmount } from '@/config/tokens'
import { Token } from '@/types/token'

/**
 * Returns the formatted balance of `token` for `address`.
 * Handles both native ETH and ERC-20 tokens.
 */
export function useTokenBalance(token: Token | null, address: `0x${string}` | undefined) {
  const isNative = token ? isNativeToken(token.address) : false

  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address,
    query: { enabled: !!address && isNative },
  })

  const { data: erc20Balance, isLoading: erc20Loading } = useReadContract({
    address:      token?.address as `0x${string}`,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query:        { enabled: !!address && !!token && !isNative },
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
      isLoading:  ethLoading,
    }
  }

  const raw = (erc20Balance as bigint | undefined) ?? ZERO
  return {
    balance:    formatTokenAmount(raw, token.decimals),
    balanceRaw: raw,
    isLoading:  erc20Loading,
  }
}
