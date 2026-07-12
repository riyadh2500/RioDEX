'use client'

import { useReadContracts, useChainId } from 'wagmi'
import { useMemo } from 'react'
import { DEX_FACTORY_ABI, DEX_PAIR_ABI, ERC20_ABI } from '@/lib/abis'
import { useContractAddresses } from './useContractAddresses'
import { getTestnetTokens } from '@/config/testnetTokens'
import { getNetwork, DEFAULT_CHAIN_ID } from '@/config/networks'
import { Pair } from '@/types/pair'
import { Token } from '@/types/token'
import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http } from 'viem'

// viem chain definitions for our 3 supported testnets
import { sepolia, baseSepolia } from 'viem/chains'
import { defineChain } from 'viem'

const arcTestnetChain = defineChain({
  id: 5042002,
  name: 'ARC Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  testnet: true,
})

function getViemChain(chainId: number) {
  if (chainId === 11155111) return sepolia
  if (chainId === 84532)    return baseSepolia
  if (chainId === 5042002)  return arcTestnetChain
  return sepolia
}

function getRPC(chainId: number): string {
  const alchemy = 'BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'
  if (chainId === 11155111) return `https://eth-sepolia.g.alchemy.com/v2/${alchemy}`
  if (chainId === 84532)    return `https://base-sepolia.g.alchemy.com/v2/${alchemy}`
  if (chainId === 5042002)  return 'https://rpc.testnet.arc.network'
  return `https://eth-sepolia.g.alchemy.com/v2/${alchemy}`
}

function getTokenLogoURI(address: string, chainId: number): string | undefined {
  const tokens = getTestnetTokens(chainId)
  const found  = tokens.find(t => t.address.toLowerCase() === address.toLowerCase())
  return found?.logoURI
}

/** Reads all pools directly from the on-chain factory for the connected chain */
export function useOnChainPairs() {
  const chainId              = useChainId() ?? DEFAULT_CHAIN_ID
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

      // Read pair count
      const pairCount = await client.readContract({
        address:      factory as `0x${string}`,
        abi:          DEX_FACTORY_ABI,
        functionName: 'allPairsLength',
      }) as bigint

      if (pairCount === BigInt(0)) return []

      const pairs: Pair[] = []

      for (let i = 0; i < Number(pairCount); i++) {
        try {
          // Get pair address
          const pairAddress = await client.readContract({
            address:      factory as `0x${string}`,
            abi:          DEX_FACTORY_ABI,
            functionName: 'allPairs',
            args:         [BigInt(i)],
          }) as `0x${string}`

          // Read pair data in parallel
          const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
            client.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'token0' }),
            client.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'token1' }),
            client.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'getReserves' }),
            client.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'totalSupply' }),
          ])

          // Read token metadata in parallel
          const [name0, sym0, dec0, name1, sym1, dec1] = await Promise.all([
            client.readContract({ address: token0Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'name' }).catch(() => 'Unknown'),
            client.readContract({ address: token0Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => '???'),
            client.readContract({ address: token0Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18),
            client.readContract({ address: token1Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'name' }).catch(() => 'Unknown'),
            client.readContract({ address: token1Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => '???'),
            client.readContract({ address: token1Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18),
          ])

          const token0: Token = {
            address:  token0Addr as string,
            name:     name0 as string,
            symbol:   sym0 as string,
            decimals: dec0 as number,
            logoURI:  getTokenLogoURI(token0Addr as string, chainId),
            chainId,
          }

          const token1: Token = {
            address:  token1Addr as string,
            name:     name1 as string,
            symbol:   sym1 as string,
            decimals: dec1 as number,
            logoURI:  getTokenLogoURI(token1Addr as string, chainId),
            chainId,
          }

          const [reserve0, reserve1] = reserves as [bigint, bigint, number]

          // Calculate TVL in USD
          const r0Float = Number(reserve0) / 10 ** (dec0 as number)
          const r1Float = Number(reserve1) / 10 ** (dec1 as number)

          // For stablecoin pools: TVL = sum of reserves (both ~$1)
          // For ETH/stable pools: ETH side * ETH price + stable side * 1
          const isStable = (s: string) =>
            ['USDC', 'USDT', 'EURC', 'DAI', 'USDC.E'].includes(s.toUpperCase())
          const nativePrice = network.nativeUSDPrice || 1800

          let tvlUSD = 0
          if (isStable(sym0 as string) && isStable(sym1 as string)) {
            tvlUSD = r0Float + r1Float  // both stablecoins
          } else if (isStable(sym1 as string)) {
            // token0 = ETH/WETH, token1 = stablecoin — use reserve1 * 2
            tvlUSD = r1Float * 2
          } else if (isStable(sym0 as string)) {
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
          console.error(`Error reading pair ${i}:`, e)
        }
      }

      return pairs
    },
  })
}
