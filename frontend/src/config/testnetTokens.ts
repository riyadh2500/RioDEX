import { Token } from '@/types/token'

// ── Ethereum Sepolia (chainId 11155111) ───────────────────────────────────────
const SEPOLIA_TOKENS: Token[] = [
  { address: 'native',
    symbol: 'ETH',  name: 'Ether',      decimals: 18, logoURI: '/tokens/eth.svg',  chainId: 11155111 },
  // USDC — Circle official Sepolia: https://developers.circle.com
  { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol: 'USDC', name: 'USD Coin',   decimals: 6,  logoURI: '/tokens/usdc.svg', chainId: 11155111 },
  // USDT — Sepolia testnet USDT
  { address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    symbol: 'USDT', name: 'Tether USD', decimals: 6,  logoURI: '/tokens/usdt.svg', chainId: 11155111 },
]

// ── Base Sepolia (chainId 84532) ──────────────────────────────────────────────
const BASE_SEPOLIA_TOKENS: Token[] = [
  { address: 'native',
    symbol: 'ETH',  name: 'Ether',      decimals: 18, logoURI: '/tokens/eth.svg',  chainId: 84532 },
  // USDC — Circle official Base Sepolia
  { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol: 'USDC', name: 'USD Coin',   decimals: 6,  logoURI: '/tokens/usdc.svg', chainId: 84532 },
  // USDT — Base Sepolia testnet USDT
  { address: '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673',
    symbol: 'USDT', name: 'Tether USD', decimals: 6,  logoURI: '/tokens/usdt.svg', chainId: 84532 },
]

// ── ARC Testnet (chainId 5042002) ─────────────────────────────────────────────
// USDC is the native gas token on ARC. EURC official address provided by user.
const ARC_TESTNET_TOKENS: Token[] = [
  // USDC native ERC-20 alias — official ARC docs
  { address: '0x3600000000000000000000000000000000000000',
    symbol: 'USDC',   name: 'USD Coin',               decimals: 6, logoURI: '/tokens/usdc.svg',  chainId: 5042002 },
  // EURC — confirmed address provided by user
  { address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    symbol: 'EURC',   name: 'Euro Coin',               decimals: 6, logoURI: '/tokens/eurc.svg',  chainId: 5042002 },
  // cirBTC — Circle Wrapped Bitcoin on ARC
  { address: '0x3200000000000000000000000000000000000000',
    symbol: 'cirBTC', name: 'Circle Wrapped Bitcoin',  decimals: 8, logoURI: '/tokens/cirbtc.svg',chainId: 5042002 },
]

// ─── Master registry ──────────────────────────────────────────────────────────
export const TESTNET_TOKENS: Record<number, Token[]> = {
  11155111: SEPOLIA_TOKENS,
  84532:    BASE_SEPOLIA_TOKENS,
  5042002:  ARC_TESTNET_TOKENS,
}

export function getTestnetTokens(chainId: number): Token[] {
  return TESTNET_TOKENS[chainId] ?? []
}

export const TESTNET_SYMBOL_TO_COINGECKO: Record<string, string> = {
  ETH:    'ethereum',
  USDC:   'usd-coin',
  USDT:   'tether',
  EURC:   'euro-coin',
  CIRBTC: 'bitcoin',
}
