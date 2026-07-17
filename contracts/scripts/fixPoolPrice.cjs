/**
 * fixPoolPrice.cjs
 * Adds liquidity at the correct market price (1845 USDC per ETH) to rebalance
 * the existing ETH/USDC pools on Sepolia and Base Sepolia.
 *
 * Run: node scripts/fixPoolPrice.cjs
 */
const { ethers } = require('ethers')

// ── Config ─────────────────────────────────────────────────────────────────────
const ETH_PRICE_USD = 1845   // target price: 1 ETH = 1845 USDC

const NETS = [
  {
    name:    'Ethereum Sepolia',
    rpc:     'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:     '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    router:  '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    usdc:    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    weth:    '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
  },
  {
    name:    'Base Sepolia',
    rpc:     'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:     '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    router:  '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    usdc:    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    weth:    '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
  },
]

const ERC20_ABI = [
  'function balanceOf(address) view returns(uint256)',
  'function approve(address,uint256) returns(bool)',
  'function allowance(address,address) view returns(uint256)',
]
const ROUTER_ABI = [
  'function factory() view returns(address)',
  'function addLiquidityETH(address token,uint256 amountTokenDesired,uint256 amountTokenMin,uint256 amountETHMin,address to,uint256 deadline) payable returns(uint256,uint256,uint256)',
]
const FACTORY_ABI = [
  'function getPair(address,address) view returns(address)',
]
const PAIR_ABI = [
  'function getReserves() view returns(uint112,uint112,uint32)',
  'function token0() view returns(address)',
]

async function fix(net) {
  console.log(`\n══ ${net.name} ══`)
  const provider = new ethers.JsonRpcProvider(net.rpc)
  const wallet   = new ethers.Wallet(net.key, provider)
  const feeData  = await provider.getFeeData()

  const router   = new ethers.Contract(net.router, ROUTER_ABI, wallet)
  const usdc     = new ethers.Contract(net.usdc, ERC20_ABI, wallet)
  const factAddr = await router.factory()
  const factory  = new ethers.Contract(factAddr, FACTORY_ABI, provider)

  const pairAddr = await factory.getPair(net.usdc, net.weth)
  if (pairAddr === '0x0000000000000000000000000000000000000000') {
    console.log('No pool exists yet — nothing to fix')
    return
  }

  const pair     = new ethers.Contract(pairAddr, PAIR_ABI, provider)
  const token0   = await pair.token0()
  const [r0, r1] = await pair.getReserves()

  // Determine which reserve is USDC and which is WETH
  const usdcIsToken0 = token0.toLowerCase() === net.usdc.toLowerCase()
  const reserveUSDC  = usdcIsToken0 ? r0 : r1
  const reserveWETH  = usdcIsToken0 ? r1 : r0

  const currentPrice = Number(ethers.formatUnits(reserveUSDC, 6)) /
                       Number(ethers.formatEther(reserveWETH))

  console.log(`Current pool price: ${currentPrice.toFixed(2)} USDC per ETH`)
  console.log(`Target price:       ${ETH_PRICE_USD} USDC per ETH`)
  console.log(`Reserve USDC: ${ethers.formatUnits(reserveUSDC, 6)}`)
  console.log(`Reserve WETH: ${ethers.formatEther(reserveWETH)}`)

  // Check balances
  const ethBal  = await provider.getBalance(wallet.address)
  const usdcBal = await usdc.balanceOf(wallet.address)
  console.log(`\nWallet ETH:  ${ethers.formatEther(ethBal)}`)
  console.log(`Wallet USDC: ${ethers.formatUnits(usdcBal, 6)}`)

  // Add liquidity at correct ratio using available ETH
  // Use 80% of available ETH (keep some for gas)
  const ethToAdd  = ethBal * 80n / 100n
  const usdcToAdd = ethers.parseUnits(
    (Number(ethers.formatEther(ethToAdd)) * ETH_PRICE_USD).toFixed(6),
    6,
  )

  if (usdcToAdd > usdcBal) {
    // Not enough USDC — use all USDC and calculate matching ETH
    const usdcAvail   = usdcBal * 90n / 100n   // use 90% of USDC
    const ethMatching = ethers.parseEther(
      (Number(ethers.formatUnits(usdcAvail, 6)) / ETH_PRICE_USD).toFixed(18),
    )
    console.log(`\nUsing all available USDC: ${ethers.formatUnits(usdcAvail, 6)} USDC`)
    console.log(`Matching ETH: ${ethers.formatEther(ethMatching)}`)
    await addLiq(wallet, router, usdc, net, usdcAvail, ethMatching, feeData)
  } else {
    console.log(`\nAdding ${ethers.formatEther(ethToAdd)} ETH + ${ethers.formatUnits(usdcToAdd, 6)} USDC`)
    await addLiq(wallet, router, usdc, net, usdcToAdd, ethToAdd, feeData)
  }

  // Show new price
  const [nr0, nr1] = await pair.getReserves()
  const nReserveUSDC = usdcIsToken0 ? nr0 : nr1
  const nReserveWETH = usdcIsToken0 ? nr1 : nr0
  const newPrice = Number(ethers.formatUnits(nReserveUSDC, 6)) /
                   Number(ethers.formatEther(nReserveWETH))
  console.log(`\n✅ New pool price: ${newPrice.toFixed(2)} USDC per ETH`)
}

async function addLiq(wallet, router, usdc, net, usdcAmt, ethAmt, feeData) {
  const txOpts = {
    maxFeePerGas:         (feeData.maxFeePerGas         ?? 5_000_000_000n) * 3n,
    maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 1_500_000_000n) * 3n,
    gasLimit: 400_000n,
  }

  // Approve USDC
  const allowance = await usdc.allowance(wallet.address, net.router)
  if (allowance < usdcAmt) {
    console.log('Approving USDC...')
    await (await usdc.approve(net.router, usdcAmt, txOpts)).wait(1)
    console.log('✓ Approved')
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 900)
  console.log('Sending addLiquidityETH...')
  const tx = await router.addLiquidityETH(
    net.usdc,
    usdcAmt,
    0n,   // amountTokenMin
    0n,   // amountETHMin
    wallet.address,
    deadline,
    { ...txOpts, value: ethAmt },
  )
  console.log('tx:', tx.hash)
  const receipt = await tx.wait(1)
  console.log('✓ Mined block', receipt.blockNumber)
}

async function main() {
  for (const net of NETS) {
    try { await fix(net) }
    catch (e) { console.error(`✗ ${net.name}: ${e.message?.slice(0, 300)}`) }
  }
  console.log('\nDone.')
}

main()
