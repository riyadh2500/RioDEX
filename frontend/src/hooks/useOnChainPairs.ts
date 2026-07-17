'use client'

import { useChainId } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http } from 'viem'
import { sepolia, baseSepolia } from 'viem/chains'

import { DEX_FACTORY_ABI, DEX_PAIR_ABI, ERC20_ABI } from '@/lib/abis'
import { useContractAddresses } from './useContractAddresses'
import { getTestnetTokens } from '@/config/testnetTokens'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { Pair } from '@/types/pair'
import { Token } from '@/types/token'

function getViemChain(chainId: number) {
  if (chainId === 84532) return baseSepolia
  return sepolia
}

function getRPC(chainId: number): string {
  if (chainId === 84532) return process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? 'https://sepolia.base.org'
  return process.env.NEXT_PUBLIC_RPC_SEPOLIA ?? 'https://rpc.sepolia.org'
}

function getTokenLogoURI(address: string, chainId: number): string | undefined {
  return getTestnetTokens(chainId).find(
    (t) => t.address !== 'native' && t.address.toLowerCase() === address.toLowerCase(),
  )?.logoURI
}

/**
 * If the on-chain address matches the WETH contract for this chain,
 * return a native ETH token so everything displays as "ETH" not "WETH".
 */
function resolveToken(address: string, name: string, symbol: string, decimals: number, chainId: number): Token {
  try {
    const weth = getNetwork(chainId).contracts.weth
    if (weth && weth.toLowerCase() === address.toLowerCase()) {
      const nc = getNetwork(chainId).nativeCurrency
      return {
        address:  'native',
        symbol:   nc.symbol,
        name:     nc.name,
        decimals: nc.decimals,
        logoURI:  '/tokens/eth.svg',
        chainId,
      }
    }
  } catch {}
  return {
    address,
    name,
    symbol,
    decimals,
    logoURI: getTokenLogoURI(address, chainId),
    chainId,
  }
}

const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'USDC.E'])

export function useOnChainPairs() {
  const chainId = useChainId() ?? DEFAULT_CHAIN_ID
  const { factory, isDeployed } = useContractAddresses()

  let network
  try { network = getNetwork(chainId) } catch { network = getNetwork(DEFAULT_CHAIN_ID) }

  return useQuery<Pair[]>({
    queryKey:        ['onchain-pairs', chainId, factory],
    staleTime:       30_000,
    refetchInterval: 30_000,
    enabled:         isDeployed && !!factory,

    queryFn: async (): Promise<Pair[]> => {
      if (!factory || !isDeployed) return []

      const client = createPublicClient({
        chain:     getViemChain(chainId),
        transport: http(getRPC(chainId)),
      })

      const pairCount = await client.readContract({
        address:      factory as `0x${string}`,
        abi:          DEX_FACTORY_ABI,
        functionName: 'allPairsLength',
      }) as bigint

      if (pairCount === BigInt(0)) return []

      const pairs: Pair[] = []

      for (let i = 0; i < Number(pairCount); i++) {
        try {
          const pairAddress = await client.readContract({
            address:      factory as `0x${string}`,
            abi:          DEX_FACTORY_ABI,
            functionName: 'allPairs',
            args:         [BigInt(i)],
          }) as `0x${string}`

          const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
            client.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'token0' }),
            client.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'token1' }),
            client.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'getReserves' }),
            client.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'totalSupply' }),
          ])

          const [name0, sym0, dec0, name1, sym1, dec1] = await Promise.all([
            client.readContract({ address: token0Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'name'     }).catch(() => 'Unknown'),
            client.readContract({ address: token0Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol'   }).catch(() => '???'),
            client.readContract({ address: token0Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18),
            client.readContract({ address: token1Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'name'     }).catch(() => 'Unknown'),
            client.readContract({ address: token1Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol'   }).catch(() => '???'),
            client.readContract({ address: token1Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18),
          ])

          // Map WETH contract address → native ETH for display
          const token0 = resolveToken(token0Addr as string, name0 as string, sym0 as string, dec0 as number, chainId)
          const token1 = resolveToken(token1Addr as string, name1 as string, sym1 as string, dec1 as number, chainId)

          const [reserve0, reserve1] = reserves as [bigint, bigint, number]
          const r0Float = Number(reserve0) / 10 ** token0.decimals
          const r1Float = Number(reserve1) / 10 ** token1.decimals
          const sym0Str = token0.symbol.toUpperCase()
          const sym1Str = token1.symbol.toUpperCase()

          const nativePrice = network.nativeUSDPrice > 0 ? network.nativeUSDPrice : 1800
          let tvlUSD = 0
          if (STABLECOINS.has(sym0Str) && STABLECOINS.has(sym1Str)) {
            tvlUSD = r0Float + r1Float
          } else if (STABLECOINS.has(sym1Str)) {
            tvlUSD = r1Float * 2
          } else if (STABLECOINS.has(sym0Str)) {
            tvlUSD = r0Float * 2
          } else {
            tvlUSD = (r0Float + r1Float) * nativePrice
          }

          pairs.push({
            address:      pairAddress,
            token0,
            token1,
            reserve0:     r0Float.toString(),
            reserve1:     r1Float.toString(),
            reserve0Raw:  reserve0,
            reserve1Raw:  reserve1,
            totalSupply:  (totalSupply as bigint).toString(),
            tvlUSD,
            volume24hUSD: 0,
            apr:          0,
            fee:          0.003,
          })
        } catch (e) {
          console.error(`[useOnChainPairs] pair ${i} error:`, e)
        }
      }

      return pairs
    },
  })
}
