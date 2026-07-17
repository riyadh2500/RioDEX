'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useEffect } from 'react'
import { ERC20_ABI } from '@/lib/abis'

/**
 * Checks allowance and exposes an approve() function.
 * Skips everything when tokenAddress is undefined (native token or not needed).
 */
export function useApproval(
  tokenAddress: `0x${string}` | undefined,
  owner:        `0x${string}` | undefined,
  spender:      `0x${string}` | undefined,
  requiredAmount: bigint,
) {
  const ZERO = BigInt(0)

  const { data: allowance, refetch } = useReadContract({
    address:      tokenAddress,
    abi:          ERC20_ABI,
    functionName: 'allowance',
    args:         owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!tokenAddress && !!owner && !!spender && tokenAddress.length > 5,
    },
  })

  const { writeContract, data: approveTxHash, isPending: approveWriting } =
    useWriteContract({
      mutation: {
        onError: (err: any) => {
          // bubble the error up — callers can't easily subscribe, so we rethrow
          // so toast in the swap page onError fires. Callers may also add their own.
          console.error('[useApproval] approve failed:', err?.shortMessage ?? err?.message)
        },
      },
    })

  const { isLoading: waitingConfirm, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTxHash })

  // Once the approval tx confirms, refetch allowance so needsApproval clears immediately
  useEffect(() => {
    if (approveSuccess) refetch()
  }, [approveSuccess])

  const currentAllowance = (allowance as bigint | undefined) ?? ZERO

  const needsApproval =
    !!tokenAddress &&
    tokenAddress.length > 5 &&
    !!owner &&
    !!spender &&
    requiredAmount > ZERO &&
    currentAllowance < requiredAmount

  function approve() {
    if (!tokenAddress || !spender) return
    if (requiredAmount === ZERO) return  // don't approve for 0
    writeContract({
      address:      tokenAddress,
      abi:          ERC20_ABI,
      functionName: 'approve',
      args:         [spender, requiredAmount],
    })
  }

  return {
    allowance:        currentAllowance,
    needsApproval,
    approve,
    approveLoading:   approveWriting || waitingConfirm,
    approveSuccess,
    refetchAllowance: refetch,
  }
}
