/**
 * Restores pool price using ETH→inject strategy:
 * Since we have ETH but no USDC, we use the pair's sync() mechanism.
 * We do a reverse swap: USDC→ETH direction to drain some ETH from pool,
 * OR simply inject USDC (if any) and sync.
 *
 * Strategy with only ETH available:
 * Pool has too much ETH relative to USDC.
 * We need to remove excess ETH from pool = we can call removeLiquidity
 * to burn LP tokens and get ETH+USDC back, then re-add at correct ratio.
 *
 * But we hold LP tokens! We can:
 * 1. Remove ALL liquidity (get ETH + USDC back)
 * 2. Calculate correct ratio for current ETH price
 * 3. Re-add at correct ratio
 */
const { ethers } = require('ethers')

const KEY = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'
const RPC  = 'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'

const ROUTER   = '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5'
const PAIR     = '0xD0987631Cc5F18f96fB652C5e54f766fE8452a90'
const USDC     = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const WETH     = '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a'

const ERC20   = ['function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)']
const PAIR_ABI= ['function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)','function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)']
const ROUTER_ABI=[
  'function removeLiquidityETH(address,uint256,uint256,uint256,address,uint256) returns(uint256,uint256)',
  'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)',
]

async function fetchETHPrice() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    return (await r.json()).ethereum.usd
  } catch { return 1798 }
}

async function main() {
  const p      = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(KEY, p)
  const fee    = await p.getFeeData()
  const opts   = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*3n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*3n }

  const pair   = new ethers.Contract(PAIR,   PAIR_ABI,   wallet)
  const usdc   = new ethers.Contract(USDC,   ERC20,      wallet)
  const router = new ethers.Contract(ROUTER, ROUTER_ABI, wallet)

  const ethPrice = await fetchETHPrice()
  console.log(`Live ETH price: $${ethPrice}`)

  // Current state
  const [r0, r1]   = await pair.getReserves()
  const t0         = await pair.token0()
  const isUSDC0    = t0.toLowerCase() === USDC.toLowerCase()
  const uRes       = parseFloat(ethers.formatUnits(isUSDC0 ? r0 : r1, 6))
  const eRes       = parseFloat(ethers.formatEther(isUSDC0 ? r1 : r0))
  const curPrice   = uRes / eRes
  const totalLP    = await pair.totalSupply()
  const myLP       = await pair.balanceOf(wallet.address)
  const myShare    = parseFloat(ethers.formatEther(myLP)) / parseFloat(ethers.formatEther(totalLP))

  console.log(`Pool: ${uRes.toFixed(4)} USDC / ${eRes.toFixed(6)} ETH = $${curPrice.toFixed(2)}/ETH`)
  console.log(`My LP: ${ethers.formatEther(myLP)} (${(myShare*100).toFixed(2)}% of pool)`)

  if (myLP === BigInt(0)) {
    console.log('No LP tokens to remove — cannot rebalance')
    return
  }

  // ── Step 1: Remove ALL my liquidity ──────────────────────────────────────
  const dl = BigInt(Math.floor(Date.now()/1000) + 900)
  console.log('\nStep 1: Approving LP tokens for router...')
  await (await pair.approve(ROUTER, myLP, {...opts, gasLimit:100000n})).wait(1)
  console.log('✓ Approved')

  console.log('Step 1: Removing all my liquidity...')
  const removeTx = await router.removeLiquidityETH(
    USDC, myLP, 0n, 0n, wallet.address, dl,
    {...opts, gasLimit:500000n}
  )
  console.log(`  tx: ${removeTx.hash}`)
  await removeTx.wait(1)
  console.log('✓ Removed')

  // ── Step 2: Check what we got back ───────────────────────────────────────
  const freshETH  = parseFloat(ethers.formatEther(await p.getBalance(wallet.address)))
  const freshUSDC = parseFloat(ethers.formatUnits(await usdc.balanceOf(wallet.address), 6))
  console.log(`\nGot back: ${freshETH.toFixed(6)} ETH | ${freshUSDC.toFixed(4)} USDC`)

  // ── Step 3: Add back at CORRECT ratio ────────────────────────────────────
  // Correct ratio: ethPrice USDC per 1 ETH
  // Use 90% of available USDC, compute matching ETH
  const useUSDC   = freshUSDC * 0.95
  const useETH    = Math.min(useUSDC / ethPrice, freshETH - 0.015)

  console.log(`\nStep 3: Re-adding at correct price $${ethPrice}/ETH`)
  console.log(`  Adding ${useETH.toFixed(6)} ETH + ${(useETH * ethPrice).toFixed(4)} USDC`)

  const uNeed = ethers.parseUnits((useETH * ethPrice).toFixed(6), 6)
  const eNeed = ethers.parseEther(useETH.toFixed(18).slice(0,20))
  const dl2   = BigInt(Math.floor(Date.now()/1000) + 900)

  const allow = await usdc.allowance(wallet.address, ROUTER)
  if (allow < uNeed) {
    process.stdout.write('  Approving USDC... ')
    await (await usdc.approve(ROUTER, uNeed * 10n, {...opts, gasLimit:100000n})).wait(1)
    console.log('✓')
  }

  let gas
  try { gas = await router.addLiquidityETH.estimateGas(USDC, uNeed, 0n, 0n, wallet.address, dl2, {value:eNeed}) }
  catch { gas = 500000n }

  const addTx = await router.addLiquidityETH(USDC, uNeed, 0n, 0n, wallet.address, dl2, {...opts, gasLimit:gas*2n, value:eNeed})
  console.log(`  tx: ${addTx.hash}`)
  await addTx.wait(1)
  console.log('✓ Re-added!')

  // ── Final check ───────────────────────────────────────────────────────────
  const [nr0, nr1] = await pair.getReserves()
  const nuRes = parseFloat(ethers.formatUnits(isUSDC0 ? nr0 : nr1, 6))
  const neRes = parseFloat(ethers.formatEther(isUSDC0 ? nr1 : nr0))
  const newPrice = nuRes / neRes
  console.log(`\n═══════════════════════════════`)
  console.log(`Pool restored: ${nuRes.toFixed(4)} USDC / ${neRes.toFixed(6)} ETH`)
  console.log(`New price: $${newPrice.toFixed(2)}/ETH (live: $${ethPrice})`)
  console.log(`Accuracy: ${(100 - Math.abs(newPrice-ethPrice)/ethPrice*100).toFixed(1)}%`)
  console.log(`Swap 0.1 ETH → ~${(0.1*newPrice*0.997).toFixed(4)} USDC (~$${(0.1*newPrice*0.997).toFixed(2)})`)
  console.log('═══════════════════════════════')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
