const { ethers } = require('ethers')
const fs   = require('fs')
const path = require('path')

const RPC   = 'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'
const KEY   = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const CHAIN = 11155111
const BASE  = path.join(__dirname, '..', 'artifacts', 'contracts')

async function deployContract(wallet, provider, name, artifactPath, constructorArgs = []) {
  const art     = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
  const factory = new ethers.ContractFactory(art.abi, art.bytecode, wallet)
  const nonce   = await provider.getTransactionCount(wallet.address, 'latest')
  const feeData = await provider.getFeeData()
  const maxFee  = feeData.maxFeePerGas ?? BigInt('50000000000')
  const prio    = feeData.maxPriorityFeePerGas ?? BigInt('1500000000')

  console.log(`\n[${name}] nonce=${nonce} maxFee=${maxFee}`)

  const contract = await factory.deploy(...constructorArgs, {
    maxFeePerGas:         maxFee * 2n,
    maxPriorityFeePerGas: prio * 2n,
    gasLimit:             4000000n,
    nonce,
    chainId: CHAIN,
  })

  console.log(`  tx: ${contract.deploymentTransaction()?.hash}`)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const receipt = await provider.getTransactionReceipt(contract.deploymentTransaction()?.hash).catch(() => null)
    const c = await provider.getTransactionCount(wallet.address, 'latest')
    process.stdout.write(`\r  [${i+1}] nonce=${c}`)
    if (receipt) {
      const addr = await contract.getAddress()
      console.log(`\n  ✓ ${name}: ${addr}`)
      return addr
    }
  }
  throw new Error(`${name} timed out`)
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet   = new ethers.Wallet(KEY, provider)

  const bal = await provider.getBalance(wallet.address)
  const c   = await provider.getTransactionCount(wallet.address, 'latest')
  const pd  = await provider.getTransactionCount(wallet.address, 'pending')
  console.log('Deployer:', wallet.address)
  console.log('Balance :', ethers.formatEther(bal), 'ETH')
  console.log('Nonce   : confirmed=', c, 'pending=', pd)

  if (bal < ethers.parseEther('0.05')) {
    console.log('\n✗ Insufficient ETH. Get testnet ETH from https://sepoliafaucet.com')
    process.exit(1)
  }

  const wethAddr = await deployContract(wallet, provider, 'MockWETH',
    path.join(BASE, 'mocks', 'MockWETH.sol', 'MockWETH.json'))

  const factAddr = await deployContract(wallet, provider, 'DEXFactory',
    path.join(BASE, 'core', 'DEXFactory.sol', 'DEXFactory.json'),
    [wallet.address])

  const routAddr = await deployContract(wallet, provider, 'DEXRouter',
    path.join(BASE, 'periphery', 'DEXRouter.sol', 'DEXRouter.json'),
    [factAddr, wethAddr])

  const tokAddr = await deployContract(wallet, provider, 'TokenFactory',
    path.join(BASE, 'token', 'TokenFactory.sol', 'TokenFactory.json'),
    [ethers.parseEther('0.5'), wallet.address])

  // Write to .env.local
  const envPath = path.join(__dirname, '..', '..', 'frontend', '.env.local')
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''
  const updates = {
    NEXT_PUBLIC_FACTORY_SEPOLIA:       factAddr,
    NEXT_PUBLIC_ROUTER_SEPOLIA:        routAddr,
    NEXT_PUBLIC_TOKEN_FACTORY_SEPOLIA: tokAddr,
    NEXT_PUBLIC_WETH_SEPOLIA:          wethAddr,
  }
  for (const [k, v] of Object.entries(updates)) {
    const rx = new RegExp(`^(${k}=).*$`, 'm')
    env = rx.test(env) ? env.replace(rx, `$1${v}`) : env + `\n${k}=${v}`
  }
  fs.writeFileSync(envPath, env)

  console.log('\n════════════════════════════════════════')
  console.log('✓ Ethereum Sepolia deployment COMPLETE!')
  console.log('  WETH        :', wethAddr)
  console.log('  Factory     :', factAddr)
  console.log('  Router      :', routAddr)
  console.log('  TokenFactory:', tokAddr)
  console.log('✓ frontend/.env.local updated')
  console.log('════════════════════════════════════════')
}

main().catch(e => { console.error('\n✗ FAILED:', e.message); process.exit(1) })
