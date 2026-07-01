'use client'

import { useReadContract, useChainId } from 'wagmi'
import { DEX_ROUTER_ABI } from '@/lib/abis'
import { useContractAddresses } from './useContractAddresses'
import { Token } from '@/types/token'
import { isNativeToken, getWETHToken, parseTokenAmount, formatTokenAmount } from '@/config/tokens'
import { DEFAULT_CHAIN_ID } from '@/config/networks'

/**
 * Resolve a token to its on-chain EVM address.
 * For native tokens, use WETH. If WETH isn't configured, returns null.
 */
function resolveAddress(token: Token, chainId: number): `0x${string}` | null {
  if (isNativeToken(token.address)) {
    const weth = getWETHToken(chainId).address
    if (!weth) return null
    return weth as `0x${string}`
  }
  if (!token.address || token.address.length < 10) return null
  return token.address as `0x${string}`
}

/**
 * Fetches a swap quote from DEXRouter.getAmountsOut.
 *
 * Returns:
 *  - amountOut / amountOutRaw  — quoted output
 *  - noLiquidity               — true when the pair doesn't exist yet
 *  - notDeployed               — true when router isn't deployed on this chain
 */
export function useSwapQuote(
  tokenIn:  Token | null,
  tokenOut: Token | null,
  amountIn: string,
) {
  const chainId              = useChainId() ?? DEFAULT_CHAIN_ID
  const { router, isDeployed } = useContractAddresses()

  const ZERO = BigInt(0)

  // Resolve addresses — null means we can't route (no WETH config or bad address)
  const addrIn  = tokenIn  ? resolveAddress(tokenIn,  chainId) : null
  const addrOut = tokenOut ? resolveAddress(tokenOut, chainId) : null

  const enabled =
    isDeployed &&
    !!tokenIn &&
    !!tokenOut &&
    !!amountIn &&
    Number(amountIn) > 0 &&
    addrIn  !== null &&
    addrOut !== null

  const amountInRaw = enabled
    ? parseTokenAmount(amountIn, tokenIn!.decimals)
    : ZERO

  const { data, isLoading, error } = useReadContract({
    address:      router as `0x${string}`,
    abi:          DEX_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args:         enabled ? [amountInRaw, [addrIn!, addrOut!]] : undefined,
    query: {
      enabled,
      retry: false,  // don't retry on revert (no liquidity) — show error immediately
    },
  })

  if (!isDeployed) {
    return {
      amountOut:    '',
      amountOutRaw: ZERO,
      priceImpact:  0,
      isLoading:    false,
      notDeployed:  true,
      noLiquidity:  false,
      error:        null,
    }
  }

  // Detect "pair doesn't exist" / "insufficient liquidity" revert
  const noLiquidity =
    !!error &&
    (error.message?.includes('INSUFFICIENT_LIQUIDITY') ||
      error.message?.includes('PAIR_NOT_FOUND') ||
      error.message?.includes('execution reverted') ||
      error.message?.includes('revert'))

  if (!data || !tokenOut) {
    return {
      amountOut:    '',
      amountOutRaw: ZERO,
      priceImpact:  0,
      isLoading,
      notDeployed:  false,
      noLiquidity,
      error: noLiquidity ? null : error,
    }
  }

  const amounts   = data as bigint[]
  const amountOut = amounts[amounts.length - 1] ?? ZERO

  return {
    amountOut:    formatTokenAmount(amountOut, tokenOut.decimals),
    amountOutRaw: amountOut,
    priceImpact:  0,
    isLoading,
    notDeployed:  false,
    noLiquidity:  false,
    error:        null,
  }
}
