'use client'

import { useReadContract, useChainId } from 'wagmi'
import { DEX_ROUTER_ABI } from '@/lib/abis'
import { useContractAddresses } from './useContractAddresses'
import { Token } from '@/types/token'
import { isNativeToken, getWETHToken, parseTokenAmount, formatTokenAmount } from '@/config/tokens'
import { DEFAULT_CHAIN_ID } from '@/config/networks'

/**
 * Resolve a token to its on-chain EVM address.
 * Native ETH → WETH address. Returns null if WETH not configured.
 */
function resolveAddress(token: Token, chainId: number): `0x${string}` | null {
  if (isNativeToken(token.address)) {
    const weth = getWETHToken(chainId).address
    if (!weth || weth.length < 10) return null
    return weth as `0x${string}`
  }
  if (!token.address || token.address.length < 10) return null
  return token.address as `0x${string}`
}

/**
 * Any contract revert from getAmountsOut means no usable liquidity:
 * the pair either doesn't exist or has zero reserves.
 */
function isLiquidityError(err: unknown): boolean {
  if (!err) return false
  const name = (err as any)?.name ?? ''
  const msg  = (err as any)?.message ?? ''
  // viem typed errors
  if (name === 'ContractFunctionRevertedError')   return true
  if (name === 'ContractFunctionExecutionError')  return true
  // message-based fallbacks
  const lower = msg.toLowerCase()
  if (lower.includes('revert'))                   return true
  if (lower.includes('insufficient_liquidity'))   return true
  if (lower.includes('pair_not_found'))           return true
  if (lower.includes('invalid_path'))             return true
  return false
}

export function useSwapQuote(
  tokenIn:  Token | null,
  tokenOut: Token | null,
  amountIn: string,
) {
  const chainId              = useChainId() ?? DEFAULT_CHAIN_ID
  const { router, isDeployed } = useContractAddresses()

  const ZERO = BigInt(0)

  const addrIn  = tokenIn  ? resolveAddress(tokenIn,  chainId) : null
  const addrOut = tokenOut ? resolveAddress(tokenOut, chainId) : null

  const sameToken = !!(addrIn && addrOut && addrIn.toLowerCase() === addrOut.toLowerCase())
  const parsedAmt = amountIn ? Number(amountIn) : 0

  const enabled =
    isDeployed       &&
    !sameToken       &&
    !!tokenIn        &&
    !!tokenOut       &&
    parsedAmt > 0    &&
    addrIn  !== null &&
    addrOut !== null

  const amountInRaw = enabled ? parseTokenAmount(amountIn, tokenIn!.decimals) : ZERO

  const { data, isLoading, error } = useReadContract({
    address:      router as `0x${string}`,
    abi:          DEX_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args:         enabled ? [amountInRaw, [addrIn!, addrOut!]] : undefined,
    query: { enabled, retry: false },
  })

  // Not deployed on this chain at all
  if (!isDeployed) {
    return { amountOut: '', amountOutRaw: ZERO, isLoading: false, notDeployed: true, noLiquidity: false, error: null }
  }

  // Any revert from getAmountsOut = no liquidity / no pair
  if (error) {
    const noLiq = isLiquidityError(error)
    return {
      amountOut:    '',
      amountOutRaw: ZERO,
      isLoading:    false,
      notDeployed:  false,
      noLiquidity:  noLiq,
      error:        noLiq ? null : error,   // only surface non-liquidity errors
    }
  }

  if (!data || !tokenOut) {
    return { amountOut: '', amountOutRaw: ZERO, isLoading, notDeployed: false, noLiquidity: false, error: null }
  }

  const amounts   = data as bigint[]
  const amountOut = amounts[amounts.length - 1] ?? ZERO

  if (amountOut === ZERO) {
    return { amountOut: '', amountOutRaw: ZERO, isLoading: false, notDeployed: false, noLiquidity: true, error: null }
  }

  return {
    amountOut:    formatTokenAmount(amountOut, tokenOut.decimals),
    amountOutRaw: amountOut,
    isLoading,
    notDeployed:  false,
    noLiquidity:  false,
    error:        null,
  }
}
