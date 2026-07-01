import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'
import { DEX_FACTORY_ABI, DEX_PAIR_ABI, ERC20_ABI } from '@/lib/abis'
import { getContracts, getNetwork } from '@/config/networks'
import { DEFAULT_CHAIN_ID } from '@/config/networks'
import { Pair } from '@/types/pair'
import { Token } from '@/types/token'

// Lazy client — never instantiated at module load so the build succeeds
// without real env vars.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

const network   = getNetwork(DEFAULT_CHAIN_ID)
const contracts = getContracts(DEFAULT_CHAIN_ID)

const publicClient = createPublicClient({
  chain:     hardhat,
  transport: http(network.rpcUrl),
})

async function fetchTokenMeta(address: `0x${string}`): Promise<Token> {
  const [name, symbol, decimals] = await Promise.all([
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'name' }),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
    publicClient.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
  ])
  return { address, name: name as string, symbol: symbol as string, decimals: decimals as number, chainId: DEFAULT_CHAIN_ID }
}

export async function GET() {
  try {
    if (!contracts.factory) {
      return NextResponse.json([], { status: 200 })
    }

    // Count pairs from factory
    const pairCount = await publicClient.readContract({
      address:      contracts.factory as `0x${string}`,
      abi:          DEX_FACTORY_ABI,
      functionName: 'allPairsLength',
    }) as bigint

    const pairs: Pair[] = []

    for (let i = 0; i < Number(pairCount); i++) {
      const pairAddress = await publicClient.readContract({
        address:      contracts.factory as `0x${string}`,
        abi:          DEX_FACTORY_ABI,
        functionName: 'allPairs',
        args:         [BigInt(i)],
      }) as `0x${string}`

      const [token0Addr, token1Addr, reserves, totalSupply] = await Promise.all([
        publicClient.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'token0' }),
        publicClient.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'token1' }),
        publicClient.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'getReserves' }),
        publicClient.readContract({ address: pairAddress, abi: DEX_PAIR_ABI, functionName: 'totalSupply' }),
      ])

      const [token0, token1] = await Promise.all([
        fetchTokenMeta(token0Addr as `0x${string}`),
        fetchTokenMeta(token1Addr as `0x${string}`),
      ])

      const [reserve0, reserve1] = reserves as [bigint, bigint, number]

      const usdPrice = network.nativeUSDPrice
      const reserve0Float = Number(reserve0) / 10 ** token0.decimals
      const reserve1Float = Number(reserve1) / 10 ** token1.decimals
      const tvlUSD = (reserve0Float + reserve1Float) * usdPrice

      pairs.push({
        address:      pairAddress,
        token0,
        token1,
        reserve0:     reserve0Float.toString(),
        reserve1:     reserve1Float.toString(),
        reserve0Raw:  reserve0,
        reserve1Raw:  reserve1,
        totalSupply:  ((totalSupply as bigint) / BigInt(1e18)).toString(),
        tvlUSD,
        volume24hUSD: 0,
        apr:          0,
        fee:          0.003,
      })
    }

    return NextResponse.json(pairs)
  } catch (err) {
    console.error('[GET /api/pairs]', err)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { pair_address, token0_address, token1_address } = body

    if (!pair_address || !token0_address || !token1_address) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data, error } = await getSupabase()
      .from('pairs')
      .upsert({ pair_address, token0_address, token1_address })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/pairs]', err)
    return NextResponse.json({ error: 'Failed to save pair' }, { status: 500 })
  }
}
