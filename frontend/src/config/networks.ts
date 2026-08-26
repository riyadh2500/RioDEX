import { NetworkConfig } from '@/types/chain'

// Contract addresses are hardcoded — do NOT use process.env here.

// ─── Localhost / Hardhat (chainId 31337) ──────────────────────────────────────
const localhost: NetworkConfig = {
  chainId:     31337,
  name:        'Localhost',
  shortName:   'LOCAL',
  rpcUrl:      'http://127.0.0.1:8545',
  explorerUrl: 'http://localhost:8545',
  logoUrl:     '/tokens/eth.svg',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  contracts: {
    factory:      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    router:       '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    tokenFactory: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    weth:         '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
  nativeUSDPrice:    1,
  testnet:           true,
  nativeCoinGeckoId: 'ethereum',
}

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
    factory:      '0xbB1fFC22407c5E6e94fc3e121bD98b77aD74c35F',
    router:       '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    tokenFactory: '0x460b3D869f07ca9cA761ee731b582A1E637b8c26',
    weth:         '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
  },
  nativeUSDPrice:    0,
  testnet:           true,
  nativeCoinGeckoId: 'ethereum',
}

// ─── Base Sepolia ─────────────────────────────────────────────────────────────
const baseSepolia: NetworkConfig = {
  chainId:     84532,
  name:        'Base Sepolia',
  shortName:   'BASE',
  rpcUrl:      process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  logoUrl:     '/tokens/base.svg',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  contracts: {
    factory:      '0xdbe19C3FE350fB7Da84200D5866E9A61D7946674',
    router:       '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    tokenFactory: '0xc9f766e052C8F7aa54F611bA71A199d46C50e798',
    weth:         '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
  },
  nativeUSDPrice:    0,
  testnet:           true,
  nativeCoinGeckoId: 'ethereum',
}

// ─── Registry ─────────────────────────────────────────────────────────────────
export const NETWORKS: Record<number, NetworkConfig> = {
  31337:    localhost,
  11155111: ethereumSepolia,
  84532:    baseSepolia,
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
  return [NETWORKS[11155111], NETWORKS[84532]]
}

export default NETWORKS
