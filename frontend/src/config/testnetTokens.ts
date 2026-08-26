import { Token } from '@/types/token'

// ── Localhost / Hardhat (chainId 31337) ───────────────────────────────────────
const LOCALHOST_TOKENS: Token[] = [
  {
    address:  'native',
    symbol:   'ETH',
    name:     'Ether',
    decimals: 18,
    logoURI:  '/tokens/eth.svg',
    chainId:  31337,
  },
  {
    address:  '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',  // MockUSDC
    symbol:   'USDC',
    name:     'USD Coin',
    decimals: 6,
    logoURI:  '/tokens/usdc.svg',
    chainId:  31337,
  },
  {
    address:  '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',  // MockUSDT
    symbol:   'USDT',
    name:     'Tether USD',
    decimals: 6,
    logoURI:  '/tokens/usdt.svg',
    chainId:  31337,
  },
]

// ── Ethereum Sepolia (chainId 11155111) ───────────────────────────────────────
// Addresses are hardcoded — do NOT use process.env here.
// process.env is evaluated at build time for NEXT_PUBLIC_ vars, but if the
// build runs before env vars are set in Vercel, the fallback is used instead.
// Hardcoding ensures the correct address is always used regardless of env state.
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
    address:  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',  // Circle USDC on Sepolia
    symbol:   'USDC',
    name:     'USD Coin',
    decimals: 6,
    logoURI:  '/tokens/usdc.svg',
    chainId:  11155111,
  },
  {
    address:  '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',  // USDT on Sepolia
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
    address:  '0x036CbD53842c5426634e7929541eC2318f3dCF7e',  // Circle USDC on Base Sepolia
    symbol:   'USDC',
    name:     'USD Coin',
    decimals: 6,
    logoURI:  '/tokens/usdc.svg',
    chainId:  84532,
  },
  {
    address:  '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673',  // USDT on Base Sepolia
    symbol:   'USDT',
    name:     'Tether USD',
    decimals: 6,
    logoURI:  '/tokens/usdt.svg',
    chainId:  84532,
  },
]

// ─── Master registry ──────────────────────────────────────────────────────────
export const TESTNET_TOKENS: Record<number, Token[]> = {
  31337:    LOCALHOST_TOKENS,
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
