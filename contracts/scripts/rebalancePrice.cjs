/**
 * rebalancePrice.cjs
 * Swaps USDC → ETH in the pool to push price toward 1845 USDC/ETH.
 * Uses the constant-product formula to calculate exact swap amounts needed.
 *
 * Run: node scripts/rebalancePrice.cjs
 */
const { ethers } = require('ethers')

const TARGET_PRICE = 1845   // USDC per ETH

const NETS = [
  {
    name:   'Ethereum Sepolia',
    rpc:    'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:    '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    router: '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    usdc:   '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    weth:   '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
  },
  {
    name:   'Base Sepolia',
    rpc:    'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:    '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    router: '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    usdc:   '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    weth:   '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
  },
]

const ERC20_ABI = [
  'function balanceOf(address) view returns(uint256)',
  'function approve(address,uint256) returns(bool)',
  'function allowance(address,address) view returns(uint256)',
]
const ROUTER_ABI = [
  'function factory() view returns(address)',
  'function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns(uint256[])',
  'function swapExactETHForTokens(uint256,address[],address,uint256) payable returns(uint256[])',
]
const FACTORY_ABI = ['function getPair(address,address) view returns(address)']
const PAIR_ABI    = [
  'function getReserves() view returns(uint112,uint112,uint32)',
  'function token0() view returns(address)',
]

/**
 * Constant-product formula: given reserves and a target price,
 * calculate how much USDC to swap in to reach that price.
 *
 * Target: reserveUSDC_new / reserveWETH_new = targetPrice
 * With fee: k = reserveUSDC * reserveWETH (constant)
 * After swap of dx USDC in:
 *   reserveUSDC_new = reserveUSDC + dx * 0.997
 *   reserveWETH_new = k / reserveUSDC_new
 * We want reserveUSDC_new / reserveWETH_new = targetPrice
 * => reserveUSDC_new^2 / k = targetPrice
 * => reserveUSDC_new = sqrt(k * targetPrice)
 * => dx = (reserveUSDC_new - reserveUSDC) / 0.997
 */
function calcSwapUsdcIn(reserveUSDC, reserveWETH, targetPrice) {
  // work in floating point (sufficient precision for this use)
  const rU = Number(ethers.formatUnits(reserveUSDC, 6))
  const rW = Number(ethers.formatEther(reserveWETH))
  const k  = rU * rW
  const targetReserveUSDC = Math.sqrt(k * targetPrice)
  const dx = (targetReserveUSDC - rU) / 0.997
  return dx   // USDC to swap in (float)
}

async function rebalance(net) {
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
    console.log('No pool — skipping'); return
  }

  const pair   = new ethers.Contract(pairAddr, PAIR_ABI, provider)
  const token0 = await pair.token0()
  const [r0, r1] = await pair.getReserves()

  const usdcIsToken0 = token0.toLowerCase() === net.usdc.toLowerCase()
  const reserveUSDC  = usdcIsToken0 ? r0 : r1
  const reserveWETH  = usdcIsToken0 ? r1 : r0

  const currentPrice = Number(ethers.formatUnits(reserveUSDC, 6)) /
                       Number(ethers.formatEther(reserveWETH))

  console.log(`Current price: ${currentPrice.toFixed(2)} USDC/ETH`)
  console.log(`Target price:  ${TARGET_PRICE} USDC/ETH`)

  if (Math.abs(currentPrice - TARGET_PRICE) / TARGET_PRICE < 0.02) {
    console.log('✅ Price already within 2% of target — no swap needed')
    return
  }

  const usdcBal = await usdc.balanceOf(wallet.address)
  const ethBal  = await provider.getBalance(wallet.address)

  if (currentPrice < TARGET_PRICE) {
    // Pool has too little USDC relative to ETH → swap USDC in
    const usdcNeededFloat = calcSwapUsdcIn(reserveUSDC, reserveWETH, TARGET_PRICE)
    let   usdcToSwap      = ethers.parseUnits(Math.min(usdcNeededFloat, Number(ethers.formatUnits(usdcBal, 6)) * 0.9).toFixed(6), 6)

    if (usdcToSwap === 0n) { console.log('✗ Not enough USDC'); return }

    console.log(`Swapping ${ethers.formatUnits(usdcToSwap, 6)} USDC → ETH to raise price`)

    const txOpts = {
      maxFeePerGas:         (feeData.maxFeePerGas         ?? 5_000_000_000n) * 3n,
      maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 1_500_000_000n) * 3n,
      gasLimit: 300_000n,
    }

    // Approve
    if (await usdc.allowance(wallet.address, net.router) < usdcToSwap) {
      await (await usdc.approve(net.router, usdcToSwap, txOpts)).wait(1)
      console.log('✓ Approved')
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 900)
    const tx = await router.swapExactTokensForETH(
      usdcToSwap, 0n,
      [net.usdc, net.weth],
      wallet.address, deadline,
      txOpts,
    )
    console.log('tx:', tx.hash)
    await tx.wait(1)

  } else {
    // Pool has too much USDC → swap ETH in to lower price
    const ethToSwap = ethBal * 30n / 100n   // use 30% of ETH balance
    console.log(`Swapping ${ethers.formatEther(ethToSwap)} ETH → USDC to lower price`)

    const txOpts = {
      maxFeePerGas:         (feeData.maxFeePerGas         ?? 5_000_000_000n) * 3n,
      maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 1_500_000_000n) * 3n,
      gasLimit: 300_000n,
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 900)
    const tx = await router.swapExactETHForTokens(
      0n,
      [net.weth, net.usdc],
      wallet.address, deadline,
      { ...txOpts, value: ethToSwap },
    )
    console.log('tx:', tx.hash)
    await tx.wait(1)
  }

  // Show new price
  const [nr0, nr1] = await pair.getReserves()
  const nReserveUSDC = usdcIsToken0 ? nr0 : nr1
  const nReserveWETH = usdcIsToken0 ? nr1 : nr0
  const newPrice = Number(ethers.formatUnits(nReserveUSDC, 6)) /
                   Number(ethers.formatEther(nReserveWETH))
  console.log(`✅ New price: ${newPrice.toFixed(2)} USDC/ETH`)
}

async function main() {
  for (const net of NETS) {
    try { await rebalance(net) }
    catch (e) { console.error(`✗ ${net.name}: ${e.message?.slice(0, 300)}`) }
  }
  console.log('\nDone.')
}

main()
