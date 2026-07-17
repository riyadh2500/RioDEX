/**
 * addUsdcUsdtPool.cjs
 * Creates a USDC / USDT pool using whatever USDT balance is available.
 * Run: node scripts/addUsdcUsdtPool.cjs
 */
const { ethers } = require('ethers')

const NETS = [
  {
    name:    'Ethereum Sepolia',
    rpc:     'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:     '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    router:  '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    usdc:    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    usdt:    '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    dec:     6,
  },
  {
    name:    'Base Sepolia',
    rpc:     'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:     '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    router:  '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    usdc:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdt:    '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673',
    dec:     6,
  },
]

const ERC20_ABI = [
  'function balanceOf(address) view returns(uint256)',
  'function approve(address,uint256) returns(bool)',
  'function allowance(address,address) view returns(uint256)',
]
const ROUTER_ABI = [
  'function factory() view returns(address)',
  'function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns(uint256,uint256,uint256)',
]
const FACTORY_ABI = [
  'function getPair(address,address) view returns(address)',
  'function allPairsLength() view returns(uint256)',
]

async function addPool(net) {
  console.log(`\n══ ${net.name} ══`)
  const provider = new ethers.JsonRpcProvider(net.rpc)
  const wallet   = new ethers.Wallet(net.key, provider)
  const feeData  = await provider.getFeeData()

  const router   = new ethers.Contract(net.router, ROUTER_ABI, wallet)
  const usdc     = new ethers.Contract(net.usdc, ERC20_ABI, wallet)
  const usdt     = new ethers.Contract(net.usdt, ERC20_ABI, wallet)
  const factAddr = await router.factory()
  const factory  = new ethers.Contract(factAddr, FACTORY_ABI, provider)

  // Check if pool already exists
  const existing = await factory.getPair(net.usdc, net.usdt)
  if (existing !== '0x0000000000000000000000000000000000000000') {
    console.log('✅ USDC/USDT pool already exists:', existing)
    return
  }

  const usdcBal = await usdc.balanceOf(wallet.address)
  const usdtBal = await usdt.balanceOf(wallet.address)
  console.log(`USDC: ${ethers.formatUnits(usdcBal, net.dec)}`)
  console.log(`USDT: ${ethers.formatUnits(usdtBal, net.dec)}`)

  if (usdtBal === 0n) {
    console.log('✗ No USDT balance — get testnet USDT from faucet first')
    console.log('  Sepolia USDT faucet: https://faucet.circle.com or use a DEX to get USDT')
    return
  }

  // Use all available USDT, match with equal USDC (1:1 stablecoin)
  const usdtAmt = usdtBal
  const usdcAmt = usdtAmt < usdcBal ? usdtAmt : usdcBal   // min of both
  console.log(`Using ${ethers.formatUnits(usdcAmt, net.dec)} USDC + ${ethers.formatUnits(usdtAmt, net.dec)} USDT`)

  const txOpts = {
    maxFeePerGas:         (feeData.maxFeePerGas         ?? 5_000_000_000n) * 3n,
    maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 1_500_000_000n) * 3n,
    gasLimit: 500_000n,
  }

  // Approve USDC
  if (await usdc.allowance(wallet.address, net.router) < usdcAmt) {
    console.log('Approving USDC...')
    await (await usdc.approve(net.router, usdcAmt, txOpts)).wait(1)
    console.log('✓ USDC approved')
  }

  // Approve USDT
  if (await usdt.allowance(wallet.address, net.router) < usdtAmt) {
    console.log('Approving USDT...')
    await (await usdt.approve(net.router, usdtAmt, txOpts)).wait(1)
    console.log('✓ USDT approved')
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 900)
  console.log('Adding USDC/USDT liquidity...')
  const tx = await router.addLiquidity(
    net.usdc, net.usdt,
    usdcAmt, usdtAmt,
    0n, 0n,
    wallet.address, deadline,
    txOpts,
  )
  console.log('tx:', tx.hash)
  const receipt = await tx.wait(1)
  console.log('✓ Mined block', receipt.blockNumber)

  const pair  = await factory.getPair(net.usdc, net.usdt)
  const total = await factory.allPairsLength()
  console.log(`✅ USDC/USDT pool: ${pair}`)
  console.log(`Total pools: ${total}`)
}

async function main() {
  for (const net of NETS) {
    try { await addPool(net) }
    catch (e) { console.error(`✗ ${net.name}: ${e.message?.slice(0, 300)}`) }
  }
  console.log('\nDone.')
}

main()
