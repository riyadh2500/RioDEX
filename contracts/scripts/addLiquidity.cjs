const { ethers } = require('ethers')

const NETS = [
  {
    name: 'Ethereum Sepolia', chainId: 11155111,
    rpc:    'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:    '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    router: '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    usdc:   '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    weth:   '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
    usdcAmt:'3', ethAmt:'0.001',
  },
  {
    name: 'Base Sepolia', chainId: 84532,
    rpc:    'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    router: '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    usdc:   '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    weth:   '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
    usdcAmt:'3', ethAmt:'0.001',
  },
]

const ERC20_ABI = [
  'function balanceOf(address) view returns(uint256)',
  'function approve(address,uint256) returns(bool)',
  'function allowance(address,address) view returns(uint256)',
]
const ROUTER_ABI = [
  'function factory() view returns(address)',
  'function WETH() view returns(address)',
  'function addLiquidityETH(address token,uint256 amountTokenDesired,uint256 amountTokenMin,uint256 amountETHMin,address to,uint256 deadline) payable returns(uint256,uint256,uint256)',
]
const FACTORY_ABI = [
  'function allPairsLength() view returns(uint256)',
  'function getPair(address,address) view returns(address)',
]

async function add(net) {
  console.log('\n══ ' + net.name + ' ══')
  const p      = new ethers.JsonRpcProvider(net.rpc)
  const wallet = new ethers.Wallet(net.key, p)
  const fee    = await p.getFeeData()

  const router  = new ethers.Contract(net.router, ROUTER_ABI, wallet)
  const usdc    = new ethers.Contract(net.usdc,   ERC20_ABI,  wallet)
  const factAddr= await router.factory()
  const factory = new ethers.Contract(factAddr, FACTORY_ABI, p)

  const pairBefore = await factory.getPair(net.usdc, net.weth)
  if (pairBefore !== '0x0000000000000000000000000000000000000000') {
    console.log('Pool already exists:', pairBefore, '— skipping')
    return
  }

  const ethBal  = await p.getBalance(wallet.address)
  const usdcBal = await usdc.balanceOf(wallet.address)
  console.log('ETH :', ethers.formatEther(ethBal))
  console.log('USDC:', ethers.formatUnits(usdcBal, 6))

  const usdcNeed = ethers.parseUnits(net.usdcAmt, 6)
  const ethNeed  = ethers.parseEther(net.ethAmt)

  // First simulate to get gas estimate
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 900)
  const gas = await router.addLiquidityETH.estimateGas(
    net.usdc, usdcNeed, 0n, 0n, wallet.address, deadline,
    { value: ethNeed }
  ).catch(() => 400000n)
  console.log('Estimated gas:', gas.toString())

  const opts = {
    maxFeePerGas:         (fee.maxFeePerGas  ?? 5000000000n) * 3n,
    maxPriorityFeePerGas: (fee.maxPriorityFeePerGas ?? 1500000000n) * 3n,
    gasLimit: gas * 15n / 10n,  // 1.5x buffer
  }

  // Approve if needed
  const allow = await usdc.allowance(wallet.address, net.router)
  if (allow < usdcNeed) {
    console.log('Approving USDC...')
    const tx = await usdc.approve(net.router, usdcNeed, opts)
    await tx.wait(1)
    console.log('✓ Approved')
  } else {
    console.log('USDC already approved')
  }

  console.log('Adding ETH/USDC liquidity...')
  const dl2 = BigInt(Math.floor(Date.now() / 1000) + 900)
  const tx  = await router.addLiquidityETH(
    net.usdc, usdcNeed, 0n, 0n, wallet.address, dl2,
    { ...opts, value: ethNeed }
  )
  console.log('tx:', tx.hash)
  const receipt = await tx.wait(1)
  console.log('✓ Mined block', receipt.blockNumber)

  const pair = await factory.getPair(net.usdc, net.weth)
  const cnt  = await factory.allPairsLength()
  console.log('✅ Pool:', pair)
  console.log('Total pairs:', cnt.toString())
  console.log('ETH/USDC swaps now work on', net.name, '!')
}

async function main() {
  for (const n of NETS) {
    try { await add(n) }
    catch (e) { console.log('✗', n.name + ':', e.message.slice(0, 200)) }
  }
}
main()
