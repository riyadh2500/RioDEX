const { ethers } = require('ethers')

// ETH/USDC pools — each entry uses the correct USDC for that chain
const NETWORKS = [
  {
    name:         'Ethereum Sepolia',
    rpc:          'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:          '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    chainId:      11155111,
    router:       '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    weth:         '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
    usdc:         '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // correct Circle Sepolia USDC
    usdcDec:      6,
    ethAmt:       '0.001',
    usdcAmt:      '3',
  },
  {
    name:         'Base Sepolia',
    rpc:          'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    chainId:      84532,
    router:       '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    weth:         '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
    usdc:         '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Circle Base Sepolia USDC
    usdcDec:      6,
    ethAmt:       '0.001',
    usdcAmt:      '3',
  },
]

const ERC20 = [
  'function balanceOf(address) view returns(uint256)',
  'function approve(address,uint256) returns(bool)',
  'function allowance(address,address) view returns(uint256)',
]

const ROUTER = [
  'function factory() view returns(address)',
  'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)',
]

const FACTORY = [
  'function allPairsLength() view returns(uint256)',
  'function getPair(address,address) view returns(address)',
]

async function seed(net) {
  console.log('\n' + '═'.repeat(55))
  console.log(net.name)
  console.log('═'.repeat(55))

  const p      = new ethers.JsonRpcProvider(net.rpc)
  const wallet = new ethers.Wallet(net.key, p)
  const fee    = await p.getFeeData()
  const opts   = {
    maxFeePerGas:         (fee.maxFeePerGas  ?? 5000000000n) * 2n,
    maxPriorityFeePerGas: (fee.maxPriorityFeePerGas ?? 1500000000n) * 2n,
    gasLimit: 600000n,
  }

  const ethBal = await p.getBalance(wallet.address)
  const usdc   = new ethers.Contract(net.usdc, ERC20, wallet)
  const uBal   = await usdc.balanceOf(wallet.address).catch(() => 0n)

  console.log('  Wallet :', wallet.address)
  console.log('  ETH    :', ethers.formatEther(ethBal))
  console.log('  USDC   :', ethers.formatUnits(uBal, net.usdcDec))

  const ethNeed  = ethers.parseEther(net.ethAmt)
  const usdcNeed = ethers.parseUnits(net.usdcAmt, net.usdcDec)

  if (uBal < usdcNeed) {
    console.log(`  ✗ Need ${net.usdcAmt} USDC — get from https://faucet.circle.com`)
    return
  }
  if (ethBal < ethNeed + ethers.parseEther('0.005')) {
    console.log('  ✗ Not enough ETH for gas')
    return
  }

  // Check pair already exists
  const router  = new ethers.Contract(net.router, ROUTER, wallet)
  const factAddr= await router.factory()
  const factory = new ethers.Contract(factAddr, FACTORY, p)
  const pairs   = await factory.allPairsLength()
  const existing= await factory.getPair(net.usdc, net.weth)
  console.log('  Pairs  :', pairs.toString())

  if (existing !== '0x0000000000000000000000000000000000000000') {
    console.log('  Pool already exists:', existing)
    console.log('  ✅ Swaps already enabled on', net.name)
    return
  }

  // Approve USDC
  console.log('\n  [1/2] Approving', net.usdcAmt, 'USDC ...')
  const a = await usdc.approve(net.router, usdcNeed, opts)
  console.log('   tx:', a.hash)
  await a.wait(1)
  console.log('   ✓')

  // addLiquidityETH
  console.log('  [2/2] Adding ETH/USDC liquidity ...')
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
  const liq = await router.addLiquidityETH(
    net.usdc, usdcNeed, 0n, 0n, wallet.address, deadline,
    { ...opts, value: ethNeed },
  )
  console.log('   tx:', liq.hash)
  await liq.wait(1)

  const pair = await factory.getPair(net.usdc, net.weth)
  console.log('  ✅ Pool created:', pair)
  console.log('  Swaps now work on', net.name, '!')
}

async function main() {
  for (const n of NETWORKS) {
    try { await seed(n) }
    catch (e) { console.log('  ✗', n.name + ':', e.message.slice(0, 120)) }
  }
  console.log('\n Done. If ARC needs seeding, add USDC to 0xf39F via faucet.circle.com')
}

main().catch(console.error)
