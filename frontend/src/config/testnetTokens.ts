import { Token } from '@/types/token'

// ── Ethereum Sepolia (chainId 11155111) ───────────────────────────────────────
const SEPOLIA_TOKENS: Token[] = [
  {
    address:  'native',
    symbol:   'ETH',
    name:     'Ether',
    decimals: 18,
    logoURI:  '/tokens/eth.svg',
    chainId:  11155111,
  },
  {
    address:  process.env.NEXT_PUBLIC_USDC_SEPOLIA ?? '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol:   'USDC',
    name:     'USD Coin',
    decimals: 6,
    logoURI:  '/tokens/usdc.svg',
    chainId:  11155111,
  },
  {
    address:  process.env.NEXT_PUBLIC_USDT_SEPOLIA ?? '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    symbol:   'USDT',
    name:     'Tether USD',
    decimals: 6,
    logoURI:  '/tokens/usdt.svg',
    chainId:  11155111,
  },
]

// ── Base Sepolia (chainId 84532) ──────────────────────────────────────────────
const BASE_SEPOLIA_TOKENS: Token[] = [
  {
    address:  'native',
    symbol:   'ETH',
    name:     'Ether',
    decimals: 18,
    logoURI:  '/tokens/eth.svg',
    chainId:  84532,
  },
  {
    address:  process.env.NEXT_PUBLIC_USDC_BASE_SEPOLIA ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol:   'USDC',
    name:     'USD Coin',
    decimals: 6,
    logoURI:  '/tokens/usdc.svg',
    chainId:  84532,
  },
  {
    address:  process.env.NEXT_PUBLIC_USDT_BASE_SEPOLIA ?? '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673',
    symbol:   'USDT',
    name:     'Tether USD',
    decimals: 6,
    logoURI:  '/tokens/usdt.svg',
    chainId:  84532,
  },
]

// ─── Master registry ──────────────────────────────────────────────────────────
export const TESTNET_TOKENS: Record<number, Token[]> = {
  11155111: SEPOLIA_TOKENS,
  84532:    BASE_SEPOLIA_TOKENS,
}

export function getTestnetTokens(chainId: number): Token[] {
  return TESTNET_TOKENS[chainId] ?? []
}

export const TESTNET_SYMBOL_TO_COINGECKO: Record<string, string> = {
  ETH:  'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
}
