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
 * Only treat Solidity contract reverts as "no liquidity".
 * Network errors, timeouts, RPC failures must NOT be classified as no liquidity.
 */
function isLiquidityError(err: unknown): boolean {
  if (!err) return false
  const name = (err as any)?.name ?? ''
  const msg  = (err as any)?.message ?? ''

  // viem ContractFunctionRevertedError = actual Solidity revert from the contract
  if (name === 'ContractFunctionRevertedError') return true

  // ContractFunctionExecutionError wraps a revert — check the cause
  if (name === 'ContractFunctionExecutionError') {
    const cause = (err as any)?.cause
    if (cause?.name === 'ContractFunctionRevertedError') return true
    // Only treat as liquidity error if message mentions DEX-specific strings
    const causeName = cause?.name ?? ''
    if (causeName === 'ContractFunctionRevertedError') return true
  }

  // Message-based — only match specific DEX revert strings, NOT generic network errors
  const lower = msg.toLowerCase()
  if (lower.includes('insufficient_liquidity'))  return true
  if (lower.includes('pair_not_found'))          return true
  if (lower.includes('invalid_path'))            return true
  if (lower.includes('execution reverted'))      return true

  // Do NOT match 'revert' alone — too broad, catches network/RPC errors
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
    query: { enabled, retry: 2 },
  })

  // Not deployed on this chain at all
  if (!isDeployed) {
    return { amountOut: '', amountOutRaw: ZERO, isLoading: false, notDeployed: true, noLiquidity: false, error: null }
  }

  // Contract revert = no liquidity. Everything else = real error to surface.
  if (error) {
    const noLiq = isLiquidityError(error)
    return {
      amountOut:    '',
      amountOutRaw: ZERO,
      isLoading:    false,
      notDeployed:  false,
      noLiquidity:  noLiq,
      error:        noLiq ? null : error,
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
