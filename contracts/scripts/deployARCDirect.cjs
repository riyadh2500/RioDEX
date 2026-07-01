/**
 * Deploy DEX contracts to ARC Testnet using the PUBLIC RPC directly.
 * Explicitly sets nonce from the chain's confirmed count (bypasses Alchemy cache).
 */
const { ethers } = require('ethers')
const fs   = require('fs')
const path = require('path')

const RPC     = 'https://rpc.testnet.arc.network'
const KEY     = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const CHAIN   = 5042002
const GAS_PX  = BigInt('25000000000')  // 25 gwei — just above ARC base fee
const GAS_LIM = 4000000n

async function deployContract(wallet, provider, name, artifactPath, constructorArgs = []) {
  const art     = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
  const factory = new ethers.ContractFactory(art.abi, art.bytecode, wallet)

  const nonce   = await provider.getTransactionCount(wallet.address, 'latest')
  console.log(`\n[${name}] nonce=${nonce} gasPrice=${GAS_PX}`)

  const contract = await factory.deploy(...constructorArgs, {
    gasPrice: GAS_PX,
    gasLimit: GAS_LIM,
    nonce,
    chainId: CHAIN,
  })

  const txHash = contract.deploymentTransaction()?.hash
  console.log(`  tx: ${txHash}`)
  console.log('  waiting for confirmation...')

  // Poll manually — don't rely on .wait() which can hang
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const receipt = await provider.getTransactionReceipt(txHash).catch(() => null)
    const c  = await provider.getTransactionCount(wallet.address, 'latest')
    process.stdout.write(`\r  [${i+1}] confirmed_nonce=${c}`)
    if (receipt) {
      console.log(`\n  ✓ ${name} mined block ${receipt.blockNumber}`)
      const deployed = await contract.getAddress()
      console.log(`  ✓ Address: ${deployed}`)
      return deployed
    }
  }
  throw new Error(`${name} deploy timed out after 4 min`)
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet   = new ethers.Wallet(KEY, provider)

  const c   = await provider.getTransactionCount(wallet.address, 'latest')
  const pd  = await provider.getTransactionCount(wallet.address, 'pending')
  const bal = await provider.getBalance(wallet.address)
  const blk = await provider.getBlockNumber()
  const fee = await provider.getFeeData()

  console.log('═══════════════════════════════════════')
  console.log('Deployer  :', wallet.address)
  console.log('Block     :', blk)
  console.log('Balance   :', ethers.formatUnits(bal, 18), 'USDC')
  console.log('Nonce     : confirmed=', c, '| pending=', pd)
  console.log('Base fee  :', fee.gasPrice?.toString())
  console.log('═══════════════════════════════════════')

  const base = path.join(__dirname, '..', 'artifacts', 'contracts')

  // 1. MockWETH
  const wethAddr = await deployContract(wallet, provider, 'MockWETH',
    path.join(base, 'mocks', 'MockWETH.sol', 'MockWETH.json'))

  // 2. DEXFactory
  const factAddr = await deployContract(wallet, provider, 'DEXFactory',
    path.join(base, 'core', 'DEXFactory.sol', 'DEXFactory.json'),
    [wallet.address])

  // 3. DEXRouter
  const routAddr = await deployContract(wallet, provider, 'DEXRouter',
    path.join(base, 'periphery', 'DEXRouter.sol', 'DEXRouter.json'),
    [factAddr, wethAddr])

  // 4. TokenFactory — 0.5 USDC fee (6 decimals on ARC)
  const tokAddr = await deployContract(wallet, provider, 'TokenFactory',
    path.join(base, 'token', 'TokenFactory.sol', 'TokenFactory.json'),
    [ethers.parseUnits('0.5', 6), wallet.address])

  // Write to frontend .env.local
  const envPath = path.join(__dirname, '..', '..', 'frontend', '.env.local')
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

  const keys = {
    NEXT_PUBLIC_FACTORY_ARC_TESTNET:       factAddr,
    NEXT_PUBLIC_ROUTER_ARC_TESTNET:        routAddr,
    NEXT_PUBLIC_TOKEN_FACTORY_ARC_TESTNET: tokAddr,
    NEXT_PUBLIC_WETH_ARC_TESTNET:          wethAddr,
  }

  for (const [k, v] of Object.entries(keys)) {
    const rx = new RegExp(`^(${k}=).*$`, 'm')
    env = rx.test(env) ? env.replace(rx, `$1${v}`) : env + `\n${k}=${v}`
  }
  fs.writeFileSync(envPath, env)

  console.log('\n═══════════════════════════════════════')
  console.log('✓ ARC Testnet deployment COMPLETE!')
  console.log('  WETH        :', wethAddr)
  console.log('  Factory     :', factAddr)
  console.log('  Router      :', routAddr)
  console.log('  TokenFactory:', tokAddr)
  console.log('✓ frontend/.env.local updated')
  console.log('═══════════════════════════════════════')
}

main().catch(e => { console.error('\n✗ DEPLOY FAILED:', e.message); process.exit(1) })
