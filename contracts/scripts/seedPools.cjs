/**
 * Seeds ETH/USDC liquidity pools on all 3 networks.
 * Creates real swap-able pairs using Circle testnet USDC.
 *
 * Requirements:
 *  - Sepolia:     needs ETH + USDC from https://faucet.circle.com (select Sepolia)
 *  - Base:        needs ETH + USDC from https://faucet.circle.com (select Base Sepolia)
 *  - ARC:         needs USDC (native) + wrap it for the USDC/WETH pair
 */
const { ethers } = require('ethers')

// Official Circle testnet USDC addresses
const NETWORKS = [
  {
    name:    'Ethereum Sepolia',
    rpc:     'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:     '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    chainId: 11155111,
    router:  '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    weth:    '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
    usdc:    '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    usdcDecimals: 6,
    ethAmount:    '0.001',
    usdcAmount:   '3',       // ~3 USDC per 0.001 ETH at ~$3000/ETH
  },
  {
    name:    'Base Sepolia',
    rpc:     'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:     '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    chainId: 84532,
    router:  '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    weth:    '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
    usdc:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdcDecimals: 6,
    ethAmount:    '0.001',
    usdcAmount:   '3',
  },
  {
    name:    'ARC Testnet',
    rpc:     'https://rpc.testnet.arc.network',
    key:     '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    chainId: 5042002,
    router:  '0xcb0A9835CDf63c84FE80Fcc59d91d7505871c98B',
    weth:    '0x889D9A5AF83525a2275e41464FAECcCb3337fF60',
    // On ARC: USDC is native gas. Use the ERC-20 alias for addLiquidity
    usdc:    '0x3600000000000000000000000000000000000000',
    usdcDecimals: 6,
    ethAmount:    '0.001',  // 0.001 WETH
    usdcAmount:   '3',      // 3 USDC
  },
]

const ERC20_ABI = [
  'function balanceOf(address) view returns(uint256)',
  'function approve(address,uint256) returns(bool)',
  'function allowance(address,address) view returns(uint256)',
  'function decimals() view returns(uint8)',
]

const WETH_ABI = [...ERC20_ABI, 'function deposit() payable']

const ROUTER_ABI = [
  'function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) payable returns(uint256,uint256,uint256)',
  'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns(uint256,uint256,uint256)',
  'function factory() view returns(address)',
]

const FACTORY_ABI = [
  'function allPairsLength() view returns(uint256)',
  'function getPair(address,address) view returns(address)',
]

async function seedNetwork(net) {
  console.log('\n' + '═'.repeat(58))
  console.log('Seeding:', net.name)
  console.log('═'.repeat(58))

  const provider = new ethers.JsonRpcProvider(net.rpc)
  const wallet   = new ethers.Wallet(net.key, provider)
  const fee      = await provider.getFeeData()
  const maxFee   = (fee.maxFeePerGas  ?? BigInt('5000000000')) * 2n
  const maxPrio  = (fee.maxPriorityFeePerGas ?? BigInt('1500000000')) * 2n
  const txOpts   = { maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPrio, gasLimit: 500000n }

  const ethBal  = await provider.getBalance(wallet.address)
  console.log('  ETH balance :', ethers.formatEther(ethBal))

  const usdc     = new ethers.Contract(net.usdc,   ERC20_ABI,  wallet)
  const weth     = new ethers.Contract(net.weth,   WETH_ABI,   wallet)
  const router   = new ethers.Contract(net.router, ROUTER_ABI, wallet)

  // Check USDC balance
  let usdcBal
  try {
    usdcBal = await usdc.balanceOf(wallet.address)
    console.log('  USDC balance:', ethers.formatUnits(usdcBal, net.usdcDecimals))
  } catch {
    usdcBal = BigInt(0)
    console.log('  USDC balance: 0 (could not read)')
  }

  const usdcNeeded = ethers.parseUnits(net.usdcAmount, net.usdcDecimals)
  const ethNeeded  = ethers.parseEther(net.ethAmount)

  if (usdcBal < usdcNeeded) {
    console.log(`  ✗ Need ${net.usdcAmount} USDC but have ${ethers.formatUnits(usdcBal, net.usdcDecimals)}`)
    console.log('  → Get USDC from https://faucet.circle.com')
    console.log('  → Skipping this network')
    return false
  }

  if (ethBal < ethNeeded + ethers.parseEther('0.005')) {
    console.log(`  ✗ Need more ETH. Have ${ethers.formatEther(ethBal)}, need ${net.ethAmount} + gas`)
    return false
  }

  const factoryAddr = await router.factory()
  const factory     = new ethers.Contract(factoryAddr, FACTORY_ABI, provider)

  // Step 1 — Approve USDC
  console.log(`\n  [1/3] Approving router for ${net.usdcAmount} USDC...`)
  const appTx = await usdc.approve(net.router, usdcNeeded, txOpts)
  console.log('   tx:', appTx.hash)
  await appTx.wait(1)
  console.log('   ✓ Approved')

  // Step 2 — addLiquidityETH(USDC, usdcAmount, 0, 0, wallet, deadline)
  console.log(`\n  [2/3] Adding ETH/USDC liquidity (${net.ethAmount} ETH + ${net.usdcAmount} USDC)...`)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
  const liqTx = await router.addLiquidityETH(
    net.usdc,
    usdcNeeded,
    BigInt(0),
    BigInt(0),
    wallet.address,
    deadline,
    { ...txOpts, value: ethNeeded },
  )
  console.log('   tx:', liqTx.hash)
  await liqTx.wait(1)
  console.log('   ✓ Liquidity added!')

  // Step 3 — Verify pair created
  const pairAddr   = await factory.getPair(net.usdc, net.weth)
  const pairsAfter = await factory.allPairsLength()
  console.log('\n  Pair address  :', pairAddr)
  console.log('  Total pairs   :', pairsAfter.toString())
  console.log('\n  ✅', net.name, '— ETH/USDC pool live! Swaps now work.')
  return true
}

async function main() {
  let anyFailed = false
  for (const net of NETWORKS) {
    try {
      const ok = await seedNetwork(net)
      if (!ok) anyFailed = true
    } catch (e) {
      console.log('\n  ✗ Error on', net.name + ':')
      console.log('   ', e.message.slice(0, 200))
      anyFailed = true
    }
  }

  console.log('\n' + '═'.repeat(58))
  if (anyFailed) {
    console.log('Some networks need USDC. Get it from https://faucet.circle.com')
    console.log('Then re-run: node scripts/seedPools.cjs')
  } else {
    console.log('✅ ALL POOLS SEEDED — swap is fully live on all networks!')
  }
  console.log('═'.repeat(58))
}

main().catch(console.error)
