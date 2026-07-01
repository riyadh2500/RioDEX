import { Token } from './token'

export interface Pair {
  address: string          // DEXPair contract address
  token0: Token
  token1: Token
  reserve0: string         // human-readable
  reserve1: string
  reserve0Raw: bigint
  reserve1Raw: bigint
  totalSupply: string      // LP token total supply (human-readable)
  // Derived metrics
  tvlUSD?: number
  volume24hUSD?: number
  apr?: number             // annualised fee APR %
  fee: number              // e.g. 0.003 (0.3 %)
}

export interface LiquidityPosition {
  pair: Pair
  lpBalance: string        // user's LP token balance (human-readable)
  lpBalanceRaw: bigint
  share: number            // 0–1 fraction of total supply
  token0Amount: string     // user's share of token0
  token1Amount: string
  valueUSD?: number
}

// Returned by the /api/pairs endpoint
export interface PairApiRow {
  id: string
  pair_address: string
  token0_address: string
  token1_address: string
  reserve0: string
  reserve1: string
  total_supply: string
  tvl_usd: number | null
  volume_24h_usd: number | null
  created_at: string
}

export interface SwapEvent {
  id: string
  txHash: string
  pairAddress: string
  sender: string
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  amountOut: string
  valueUSD?: number
  timestamp: string
}
