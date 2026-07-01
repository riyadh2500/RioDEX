/**
 * Direct deployment to ARC Testnet bypassing hardhat-deploy's stuck-tx check.
 * Uses nonce=557 (next after the phantom pending) and sends straight to chain.
 * 
 * Run: node scripts/deployARC.cjs
 */
const { ethers } = require('ethers')
const fs   = require('fs')
const path = require('path')

const RPC = 'https://rpc.testnet.arc.network'
const KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

async function deploy(provider, wallet, name, bytecode, ...constructorArgs) {
  const factory   = new ethers.ContractFactory([], bytecode, wallet)
  const gasPrice  = BigInt('250000000000') // 250 gwei

  const confirmed = await provider.getTransactionCount(wallet.address, 'latest')
  console.log(`\nDeploying ${name} at nonce=${confirmed} gasPrice=${gasPrice}...`)

  const contract = await factory.deploy({ gasPrice, gasLimit: 5000000n })
  console.log(`  tx: ${contract.deploymentTransaction()?.hash}`)
  const receipt  = await contract.deploymentTransaction()?.wait(1)
  if (!receipt) throw new Error(`No receipt for ${name}`)
  const addr     = await contract.getAddress()
  console.log(`  ✓ ${name} deployed at ${addr}`)
  return addr
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet   = new ethers.Wallet(KEY, provider)

  console.log('Deployer:', wallet.address)

  const confirmed = await provider.getTransactionCount(wallet.address, 'latest')
  const pending   = await provider.getTransactionCount(wallet.address, 'pending')
  const bal       = await provider.getBalance(wallet.address)
  const block     = await provider.getBlockNumber()

  console.log(`Block: ${block} | confirmed: ${confirmed} | pending: ${pending}`)
  console.log(`Balance: ${ethers.formatUnits(bal, 18)} USDC`)

  if (confirmed < 1) {
    console.log('No prior txs — clean state, deploying normally...')
  }

  // Load compiled artifacts
  const artifactsBase = path.join(__dirname, '..', 'artifacts', 'contracts')

  function getBytecode(contractPath) {
    const full = path.join(artifactsBase, contractPath)
    const art  = JSON.parse(fs.readFileSync(full, 'utf-8'))
    return art.bytecode
  }

  const gasPrice = BigInt('250000000000')

  // ── 1. Deploy MockWETH ─────────────────────────────────────────────────────
  const wethArt = JSON.parse(fs.readFileSync(
    path.join(artifactsBase, 'mocks', 'MockWETH.sol', 'MockWETH.json'), 'utf-8'))
  const wethFactory = new ethers.ContractFactory(wethArt.abi, wethArt.bytecode, wallet)
  console.log('\n[1/4] Deploying MockWETH...')
  const wethTx = await wethFactory.deploy({ gasPrice, gasLimit: 3000000n })
  console.log('  tx:', wethTx.deploymentTransaction()?.hash)
  await wethTx.deploymentTransaction()?.wait(1)
  const wethAddr = await wethTx.getAddress()
  console.log('  ✓ MockWETH:', wethAddr)

  // ── 2. Deploy DEXFactory ──────────────────────────────────────────────────
  const factArt = JSON.parse(fs.readFileSync(
    path.join(artifactsBase, 'core', 'DEXFactory.sol', 'DEXFactory.json'), 'utf-8'))
  const factFactory = new ethers.ContractFactory(factArt.abi, factArt.bytecode, wallet)
  console.log('\n[2/4] Deploying DEXFactory...')
  const factTx = await factFactory.deploy(wallet.address, { gasPrice, gasLimit: 3000000n })
  console.log('  tx:', factTx.deploymentTransaction()?.hash)
  await factTx.deploymentTransaction()?.wait(1)
  const factAddr = await factTx.getAddress()
  console.log('  ✓ DEXFactory:', factAddr)

  // ── 3. Deploy DEXRouter ───────────────────────────────────────────────────
  const routArt = JSON.parse(fs.readFileSync(
    path.join(artifactsBase, 'periphery', 'DEXRouter.sol', 'DEXRouter.json'), 'utf-8'))
  const routFactory = new ethers.ContractFactory(routArt.abi, routArt.bytecode, wallet)
  console.log('\n[3/4] Deploying DEXRouter...')
  const routTx = await routFactory.deploy(factAddr, wethAddr, { gasPrice, gasLimit: 3000000n })
  console.log('  tx:', routTx.deploymentTransaction()?.hash)
  await routTx.deploymentTransaction()?.wait(1)
  const routAddr = await routTx.getAddress()
  console.log('  ✓ DEXRouter:', routAddr)

  // ── 4. Deploy TokenFactory ────────────────────────────────────────────────
  const tokArt = JSON.parse(fs.readFileSync(
    path.join(artifactsBase, 'token', 'TokenFactory.sol', 'TokenFactory.json'), 'utf-8'))
  const tokFactory = new ethers.ContractFactory(tokArt.abi, tokArt.bytecode, wallet)
  const creationFee = ethers.parseUnits('0.5', 18) // 0.5 USDC
  console.log('\n[4/4] Deploying TokenFactory...')
  const tokTx = await tokFactory.deploy(creationFee, wallet.address, { gasPrice, gasLimit: 3000000n })
  console.log('  tx:', tokTx.deploymentTransaction()?.hash)
  await tokTx.deploymentTransaction()?.wait(1)
  const tokAddr = await tokTx.getAddress()
  console.log('  ✓ TokenFactory:', tokAddr)

  // ── Write addresses to frontend/.env.local ────────────────────────────────
  const envPath = path.join(__dirname, '..', '..', 'frontend', '.env.local')
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

  const updates = {
    NEXT_PUBLIC_FACTORY_ARC_TESTNET:      factAddr,
    NEXT_PUBLIC_ROUTER_ARC_TESTNET:       routAddr,
    NEXT_PUBLIC_TOKEN_FACTORY_ARC_TESTNET: tokAddr,
    NEXT_PUBLIC_WETH_ARC_TESTNET:         wethAddr,
  }

  for (const [k, v] of Object.entries(updates)) {
    const rx = new RegExp(`^(${k}=).*$`, 'm')
    env = rx.test(env) ? env.replace(rx, `$1${v}`) : env + `\n${k}=${v}`
    console.log(`  ${k} = ${v}`)
  }

  fs.writeFileSync(envPath, env)
  console.log('\n✓ frontend/.env.local updated')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════')
  console.log('ARC Testnet deployment complete!')
  console.log('  WETH        :', wethAddr)
  console.log('  Factory     :', factAddr)
  console.log('  Router      :', routAddr)
  console.log('  TokenFactory:', tokAddr)
  console.log('════════════════════════════════════════')
}

main().catch(e => { console.error('\nDEPLOY ERROR:', e.message); process.exit(1) })
