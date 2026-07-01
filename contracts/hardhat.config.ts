import { HardhatUserConfig } from 'hardhat/types'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'
import * as dotenv from 'dotenv'

dotenv.config()

// Deployer private key — set DEPLOYER_PRIVATE_KEY in contracts/.env
// Only injected into live networks; localhost uses the built-in Hardhat accounts.
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY

// Helper — only attach accounts when a real key is provided
function accounts() {
  return DEPLOYER_KEY ? [DEPLOYER_KEY] : []
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },

  networks: {
    // ── Local ────────────────────────────────────────────────────────────────
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
    },
    localhost: {
      url:     process.env.RPC_URL ?? 'http://127.0.0.1:8545',
      chainId: 31337,
    },

    // ── Ethereum Sepolia ─────────────────────────────────────────────────────
    sepolia: {
      url:      process.env.RPC_SEPOLIA      ?? 'https://rpc.sepolia.org',
      chainId:  11155111,
      accounts: accounts(),
      gasPrice: 'auto',
    },

    // ── Base Sepolia ──────────────────────────────────────────────────────────
    baseSepolia: {
      url:      process.env.RPC_BASE_SEPOLIA ?? 'https://sepolia.base.org',
      chainId:  84532,
      accounts: accounts(),
      gasPrice: 'auto',
    },

    // ── ARC Testnet ───────────────────────────────────────────────────────────
    // Native gas token is USDC — deployer wallet needs testnet USDC from
    // https://faucet.circle.com before deploying.
    arcTestnet: {
      url:      process.env.RPC_ARC_TESTNET  ?? 'https://rpc.testnet.arc.network',
      chainId:  5042002,
      accounts: accounts(),
      gasPrice: 250000000000,  // 250 gwei — high enough to replace any stuck tx
    },
  },

  namedAccounts: {
    deployer: { default: 0 },
  },

  paths: {
    sources:     './contracts',
    tests:       './test',
    cache:       './cache',
    artifacts:   './artifacts',
    deploy:      './deploy',
    deployments: './deployments',
  },

  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
}

export default config
