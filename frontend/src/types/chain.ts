export interface NetworkConfig {
  chainId:     number
  name:        string
  shortName:   string
  rpcUrl:      string
  explorerUrl: string
  logoUrl:     string
  nativeCurrency: {
    name:     string
    symbol:   string
    decimals: number
  }
  contracts: {
    factory:      string
    router:       string
    tokenFactory: string
    weth:         string
  }
  nativeUSDPrice:    number
  testnet:           boolean
  nativeCoinGeckoId?: string
}

// Supported chain IDs: Sepolia, Base Sepolia, ARC Testnet
export type SupportedChainId =
  | 11155111  // Ethereum Sepolia
  | 84532     // Base Sepolia
  | 5042002   // ARC Testnet — native gas is USDC
