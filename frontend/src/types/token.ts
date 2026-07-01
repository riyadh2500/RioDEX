export interface Token {
  address: string       // checksummed ERC-20 address, or "native" for ETH
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  chainId: number
  // Optional on-chain price data
  priceUSD?: number
  priceChange24h?: number
  volume24h?: number
  liquidity?: number
  // Set when the token was launched via TokenFactory
  createdBy?: string
  createdAt?: string    // ISO timestamp
  // IPFS / Pinata metadata
  logoIpfsHash?: string
}

export interface TokenBalance extends Token {
  balance: string       // formatted (human-readable)
  balanceRaw: bigint
  balanceUSD?: number
}

export interface TokenListState {
  tokens: Token[]
  customTokens: Token[]
}

// Returned by the /api/tokens endpoint
export interface TokenApiRow {
  id: string
  address: string
  name: string
  symbol: string
  decimals: number
  logo_url: string | null
  chain_id: number
  created_by: string | null
  created_at: string
  total_supply: string | null
}
