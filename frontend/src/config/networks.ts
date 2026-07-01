import { NetworkConfig } from '@/types/chain'

// ─── Ethereum Sepolia ─────────────────────────────────────────────────────────
const ethereumSepolia: NetworkConfig = {
  chainId:     11155111,
  name:        'Ethereum Sepolia',
  shortName:   'ETH',
  rpcUrl:      process.env.NEXT_PUBLIC_RPC_SEPOLIA ?? 'https://rpc.sepolia.org',
  explorerUrl: 'https://sepolia.etherscan.io',
  logoUrl:     '/tokens/eth.svg',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  contracts: {
    factory:      process.env.NEXT_PUBLIC_FACTORY_SEPOLIA       ?? '',
    router:       process.env.NEXT_PUBLIC_ROUTER_SEPOLIA        ?? '',
    tokenFactory: process.env.NEXT_PUBLIC_TOKEN_FACTORY_SEPOLIA ?? '',
    weth:         process.env.NEXT_PUBLIC_WETH_SEPOLIA          ?? '',
  },
  nativeUSDPrice:    0,
  testnet:           true,
  nativeCoinGeckoId: 'ethereum',
}

// ─── Base Sepolia ─────────────────────────────────────────────────────────────
// https://docs.base.org/chain/network-information
const baseSepolia: NetworkConfig = {
  chainId:     84532,
  name:        'Base Sepolia',
  shortName:   'BASE',
  rpcUrl:      process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  logoUrl:     '/tokens/base.svg',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  contracts: {
    factory:      process.env.NEXT_PUBLIC_FACTORY_BASE_SEPOLIA       ?? '',
    router:       process.env.NEXT_PUBLIC_ROUTER_BASE_SEPOLIA        ?? '',
    tokenFactory: process.env.NEXT_PUBLIC_TOKEN_FACTORY_BASE_SEPOLIA ?? '',
    weth:         process.env.NEXT_PUBLIC_WETH_BASE_SEPOLIA          ?? '',
  },
  nativeUSDPrice:    0,
  testnet:           true,
  nativeCoinGeckoId: 'ethereum',
}

// ─── ARC Testnet (Circle) — native gas = USDC ─────────────────────────────────
// https://docs.arc.network/arc/references/connect-to-arc
const arcTestnet: NetworkConfig = {
  chainId:     5042002,
  name:        'ARC Testnet',
  shortName:   'ARC',
  rpcUrl:      process.env.NEXT_PUBLIC_RPC_ARC_TESTNET ?? 'https://rpc.testnet.arc.network',
  explorerUrl: 'https://testnet.arcscan.app',
  logoUrl:     '/tokens/arc.svg',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  contracts: {
    factory:      process.env.NEXT_PUBLIC_FACTORY_ARC_TESTNET       ?? '',
    router:       process.env.NEXT_PUBLIC_ROUTER_ARC_TESTNET        ?? '',
    tokenFactory: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ARC_TESTNET ?? '',
    weth:         process.env.NEXT_PUBLIC_WETH_ARC_TESTNET          ?? '',
  },
  nativeUSDPrice:    1,
  testnet:           true,
  nativeCoinGeckoId: 'usd-coin',
}

// ─── Registry ─────────────────────────────────────────────────────────────────
export const NETWORKS: Record<number, NetworkConfig> = {
  11155111: ethereumSepolia,
  84532:    baseSepolia,
  5042002:  arcTestnet,
}

export const DEFAULT_CHAIN_ID = 11155111

export const SUPPORTED_CHAIN_IDS = Object.keys(NETWORKS).map(Number)

export function getNetwork(chainId: number): NetworkConfig {
  const n = NETWORKS[chainId]
  if (!n) throw new Error(`Unsupported chainId: ${chainId}`)
  return n
}

export function getContracts(chainId: number) {
  return getNetwork(chainId).contracts
}

export function getAllNetworks(): NetworkConfig[] {
  return [NETWORKS[11155111], NETWORKS[84532], NETWORKS[5042002]]
}

export default NETWORKS
