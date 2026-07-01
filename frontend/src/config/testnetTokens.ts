import { Token } from '@/types/token'

// ─────────────────────────────────────────────────────────────────────────────
//  Testnet token registry — exactly 3 tokens per chain as configured.
//  Sources: Circle official docs + ARC contract address scheme.
// ─────────────────────────────────────────────────────────────────────────────

// ── Ethereum Sepolia (chainId 11155111) ────────────────────────────────────────
// Tokens: ETH (native), USDC, USDT
// USDC: Circle official Sepolia — https://developers.circle.com/stablecoins/usdc-contract-addresses
// USDT: Aave Sepolia faucet token — https://staging.aave.com/faucet/
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
    // Circle official USDC on Sepolia
    address:  process.env.NEXT_PUBLIC_USDC_SEPOLIA ?? '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    symbol:   'USDC',
    name:     'USD Coin',
    decimals: 6,
    logoURI:  '/tokens/usdc.svg',
    chainId:  11155111,
  },
  {
    // Aave Sepolia USDT
    address:  process.env.NEXT_PUBLIC_USDT_SEPOLIA ?? '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    symbol:   'USDT',
    name:     'Tether USD',
    decimals: 6,
    logoURI:  '/tokens/usdt.svg',
    chainId:  11155111,
  },
]

// ── Base Sepolia (chainId 84532) ───────────────────────────────────────────────
// Tokens: ETH (native), USDC, USDT
// USDC: Circle official Base Sepolia — 0x036CbD53842c5426634e7929541eC2318f3dCF7e
// USDT: Aave Base Sepolia — https://staging.aave.com/faucet/
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
    // Circle official USDC on Base Sepolia
    address:  process.env.NEXT_PUBLIC_USDC_BASE_SEPOLIA ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol:   'USDC',
    name:     'USD Coin',
    decimals: 6,
    logoURI:  '/tokens/usdc.svg',
    chainId:  84532,
  },
  {
    // Aave Base Sepolia USDT (set env var if using a different address)
    address:  process.env.NEXT_PUBLIC_USDT_BASE_SEPOLIA ?? '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol:   'USDT',
    name:     'Tether USD',
    decimals: 6,
    logoURI:  '/tokens/usdt.svg',
    chainId:  84532,
  },
]

// ── ARC Testnet (chainId 5042002) ──────────────────────────────────────────────
// Tokens: USDC (native gas), EURC, cirBTC
// ARC uses a reserved address scheme — all Circle-issued assets live at 0x3X00…
// Sources: https://docs.arc.network/arc/references/contract-addresses
//   USDC  (native ERC-20 alias): 0x3600000000000000000000000000000000000000
//   EURC                        : 0x3400000000000000000000000000000000000000
//   cirBTC                      : 0x3200000000000000000000000000000000000000
//     (follows same scheme; confirmed on https://developers.circle.com/assets/cirbtc-contract-addresses)
const ARC_TESTNET_TOKENS: Token[] = [
  {
    // USDC is the native gas token on ARC — also accessible as ERC-20
    address:  process.env.NEXT_PUBLIC_USDC_ARC_TESTNET ?? '0x3600000000000000000000000000000000000000',
    symbol:   'USDC',
    name:     'USD Coin',
    decimals: 6,
    logoURI:  '/tokens/usdc.svg',
    chainId:  5042002,
  },
  {
    // EURC — Circle Euro Coin on ARC
    address:  process.env.NEXT_PUBLIC_EURC_ARC_TESTNET ?? '0x3400000000000000000000000000000000000000',
    symbol:   'EURC',
    name:     'Euro Coin',
    decimals: 6,
    logoURI:  '/tokens/eurc.svg',
    chainId:  5042002,
  },
  {
    // cirBTC — Circle Wrapped Bitcoin on ARC (1:1 backed by native BTC)
    address:  process.env.NEXT_PUBLIC_CIRBTC_ARC_TESTNET ?? '0x3200000000000000000000000000000000000000',
    symbol:   'cirBTC',
    name:     'Circle Wrapped Bitcoin',
    decimals: 8,
    logoURI:  '/tokens/cirbtc.svg',
    chainId:  5042002,
  },
]

// ─── Master registry ───────────────────────────────────────────────────────────
export const TESTNET_TOKENS: Record<number, Token[]> = {
  11155111: SEPOLIA_TOKENS,
  84532:    BASE_SEPOLIA_TOKENS,
  5042002:  ARC_TESTNET_TOKENS,
}

/**
 * Returns the token list for a chain.
 * Always returns all configured tokens — no filtering needed since every
 * token above has a real address.
 */
export function getTestnetTokens(chainId: number): Token[] {
  return TESTNET_TOKENS[chainId] ?? []
}

/** CoinGecko ID map for price lookups. */
export const TESTNET_SYMBOL_TO_COINGECKO: Record<string, string> = {
  ETH:    'ethereum',
  USDC:   'usd-coin',
  USDT:   'tether',
  EURC:   'euro-coin',
  CIRBTC: 'bitcoin',
}
