/**
 * Seeds initial ETH/WETH liquidity pools on all 3 deployed networks.
 * This creates the pools so swaps become possible immediately.
 *
 * Pool seeded: ETH ↔ WETH (i.e. deposit ETH + WETH into a pair)
 * Amount: 0.01 ETH + 0.01 WETH per network
 *
 * Run: node scripts/seedLiquidity.cjs
 */
const { ethers } = require('ethers')

const NETWORKS = [
  {
    name:    'Ethereum Sepolia',
    rpc:     'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:     '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    chainId: 11155111,
    router:  '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    weth:    '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
  },
  {
    name:    'Base Sepolia',
    rpc:     'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:     '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    chainId: 84532,
    router:  '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    weth:    '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
  },
  {
    name:    'ARC Testnet',
    rpc:     'https://rpc.testnet.arc.network',
    key:     '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    chainId: 5042002,
    router:  '0xcb0A9835CDf63c84FE80Fcc59d91d7505871c98B',
    weth:    '0x889D9A5AF83525a2275e41464FAECcCb3337fF60',
  },
]

const WETH_ABI = [
  'function deposit() payable',
  'function approve(address,uint256) returns(bool)',
  'function balanceOf(address) view returns(uint256)',
  'function allowance(address,address) view returns(uint256)',
]

const ROUTER_ABI = [
  'function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) payable returns(uint256,uint256,uint256)',
  'function WETH() view returns(address)',
]

const FACTORY_ABI = [
  'function allPairsLength() view returns(uint256)',
  'function getPair(address,address) view returns(address)',
]

const ROUTER_FACTORY_ABI = ['function factory() view returns(address)']

async function seedNetwork(net) {
  console.log('\n' + '═'.repeat(55))
  console.log('Seeding:', net.name)
  console.log('═'.repeat(55))

  const provider = new ethers.JsonRpcProvider(net.rpc)
  const wallet   = new ethers.Wallet(net.key, provider)

  const bal   = await provider.getBalance(wallet.address)
  const nonce = await provider.getTransactionCount(wallet.address, 'latest')
  const fee   = await provider.getFeeData()

  console.log('  Address:', wallet.address)
  console.log('  Balance:', ethers.formatEther(bal), 'native')
  console.log('  Nonce  :', nonce)

  // Check existing pools
  const routerContract  = new ethers.Contract(net.router, ROUTER_FACTORY_ABI, provider)
  const factoryAddr     = await routerContract.factory()
  const factoryContract = new ethers.Contract(factoryAddr, FACTORY_ABI, provider)
  const pairsBefore     = await factoryContract.allPairsLength()
  console.log('  Existing pools:', pairsBefore.toString())

  if (bal < ethers.parseEther('0.005')) {
    console.log('  ✗ Insufficient balance — need at least 0.005 ETH, skipping')
    return
  }

  const weth   = new ethers.Contract(net.weth, WETH_ABI, wallet)
  const router = new ethers.Contract(net.router, ROUTER_ABI, wallet)

  const maxFee  = (fee.maxFeePerGas  ?? BigInt('5000000000')) * 2n
  const maxPrio = (fee.maxPriorityFeePerGas ?? BigInt('1500000000')) * 2n
  const txOpts  = { maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPrio, gasLimit: 300000n }

  // Step 1 — wrap 0.01 ETH → WETH
  const wrapAmount = ethers.parseEther('0.01')
  console.log('\n  [1/3] Wrapping 0.01 ETH → WETH ...')
  const wrapTx = await weth.deposit({ ...txOpts, value: wrapAmount })
  console.log('   tx:', wrapTx.hash)
  await wrapTx.wait(1)
  console.log('   ✓ Wrapped')

  // Step 2 — approve router to spend WETH
  console.log('\n  [2/3] Approving router to spend WETH ...')
  const approveTx = await weth.approve(net.router, wrapAmount, txOpts)
  console.log('   tx:', approveTx.hash)
  await approveTx.wait(1)
  console.log('   ✓ Approved')

  // Step 3 — addLiquidityETH: deposit 0.01 WETH + 0.01 ETH
  console.log('\n  [3/3] Adding ETH/WETH liquidity (0.01 ETH + 0.01 WETH) ...')
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
  const liquidityTx = await router.addLiquidityETH(
    net.weth,           // token = WETH
    wrapAmount,         // amountTokenDesired = 0.01 WETH
    BigInt(0),          // amountTokenMin = 0 (accept any)
    BigInt(0),          // amountETHMin = 0 (accept any)
    wallet.address,     // LP tokens go to deployer
    deadline,
    { ...txOpts, value: wrapAmount },
  )
  console.log('   tx:', liquidityTx.hash)
  await liquidityTx.wait(1)

  const pairsAfter = await factoryContract.allPairsLength()
  const pairAddr   = await factoryContract.getPair(net.weth, net.weth)
  console.log('   ✓ Liquidity added!')
  console.log('   Pairs now:', pairsAfter.toString())

  console.log('\n  ✓', net.name, 'pool seeded — ETH/WETH swaps now work!')
}

async function main() {
  for (const net of NETWORKS) {
    try {
      await seedNetwork(net)
    } catch (e) {
      console.log('\n  ✗ Failed on', net.name + ':', e.message.slice(0, 150))
    }
  }
  console.log('\n' + '═'.repeat(55))
  console.log('SEEDING COMPLETE — check /swap in the app')
  console.log('═'.repeat(55))
}

main().catch(console.error)
