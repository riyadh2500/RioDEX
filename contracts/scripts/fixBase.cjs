/**
 * Restores Base Sepolia ETH/USDC pool at live market price.
 * Uses remove+readd strategy since we have both ETH and USDC after previous removeLiquidity.
 */
const { ethers } = require('ethers')

const KEY     = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'
const RPC     = 'https://sepolia.base.org'
const ROUTER  = '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5'
const PAIR    = '0xD0987631Cc5F18f96fB652C5e54f766fE8452a90'
const USDC    = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

const ERC20      = ['function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)','function transfer(address,uint256) returns(bool)']
const PAIR_ABI   = ['function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)','function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)','function sync()']
const ROUTER_ABI = ['function removeLiquidityETH(address,uint256,uint256,uint256,address,uint256) returns(uint256,uint256)','function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)']

async function getETHPrice() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    return (await r.json()).ethereum.usd
  } catch { return 1805 }
}

async function main() {
  const p      = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(KEY, p)
  const fee    = await p.getFeeData()
  const opts   = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*3n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*3n }

  const ethPrice = await getETHPrice()
  console.log(`Live ETH price: $${ethPrice}`)

  const pair   = new ethers.Contract(PAIR,   PAIR_ABI,   wallet)
  const usdc   = new ethers.Contract(USDC,   ERC20,      wallet)
  const router = new ethers.Contract(ROUTER, ROUTER_ABI, wallet)

  // ── Remove any remaining LP ──────────────────────────────────────────────
  const myLP = await pair.balanceOf(wallet.address)
  if (myLP > BigInt(0)) {
    console.log(`Removing ${ethers.formatEther(myLP)} LP tokens...`)
    await (await pair.approve(ROUTER, myLP, {...opts, gasLimit:100000n})).wait(1)
    const dl1 = BigInt(Math.floor(Date.now()/1000) + 900)
    await (await router.removeLiquidityETH(USDC, myLP, 0n, 0n, wallet.address, dl1, {...opts, gasLimit:500000n})).wait(1)
    console.log('✓ Removed')
  }

  // ── Check balances ───────────────────────────────────────────────────────
  const ethBal  = parseFloat(ethers.formatEther(await p.getBalance(wallet.address)))
  const usdcBal = parseFloat(ethers.formatUnits(await usdc.balanceOf(wallet.address), 6))
  console.log(`Wallet: ${ethBal.toFixed(6)} ETH | ${usdcBal.toFixed(4)} USDC`)

  // ── Inject USDC to fix price ratio in pool ───────────────────────────────
  const [r0, r1]   = await pair.getReserves()
  const t0         = await pair.token0()
  const isUSDC0    = t0.toLowerCase() === USDC.toLowerCase()
  const uRes       = parseFloat(ethers.formatUnits(isUSDC0 ? r0 : r1, 6))
  const eRes       = parseFloat(ethers.formatEther(isUSDC0 ? r1 : r0))
  console.log(`Pool residual: ${uRes.toFixed(4)} USDC / ${eRes.toFixed(6)} ETH`)

  if (eRes > 0 && uRes / eRes < ethPrice * 0.95) {
    const needed = ethPrice * eRes - uRes
    const inject = Math.min(needed, usdcBal * 0.5)
    if (inject > 0.01) {
      console.log(`Injecting ${inject.toFixed(4)} USDC to fix residual price...`)
      await (await usdc.transfer(PAIR, ethers.parseUnits(inject.toFixed(6), 6), {...opts, gasLimit:100000n})).wait(1)
      await (await pair.sync({...opts, gasLimit:100000n})).wait(1)
      console.log('✓ Synced')
    }
  }

  // ── Add max liquidity at correct ratio ───────────────────────────────────
  const freshETH  = parseFloat(ethers.formatEther(await p.getBalance(wallet.address)))
  const freshUSDC = parseFloat(ethers.formatUnits(await usdc.balanceOf(wallet.address), 6))

  const useUSDC = freshUSDC * 0.95
  const useETH  = Math.min(useUSDC / ethPrice, freshETH - 0.015)
  const useUSD  = useETH * ethPrice

  console.log(`\nAdding ${useETH.toFixed(6)} ETH + ${useUSD.toFixed(4)} USDC at $${ethPrice}/ETH...`)

  const uNeed = ethers.parseUnits(useUSD.toFixed(6), 6)
  const eNeed = ethers.parseEther(useETH.toFixed(18).slice(0,20))
  const dl2   = BigInt(Math.floor(Date.now()/1000) + 900)

  const allow = await usdc.allowance(wallet.address, ROUTER)
  if (allow < uNeed) {
    process.stdout.write('Approving USDC... ')
    await (await usdc.approve(ROUTER, uNeed * 10n, {...opts, gasLimit:100000n})).wait(1)
    console.log('✓')
  }

  let gas
  try { gas = await router.addLiquidityETH.estimateGas(USDC, uNeed, 0n, 0n, wallet.address, dl2, {value:eNeed}) }
  catch { gas = 500000n }

  const tx = await router.addLiquidityETH(USDC, uNeed, 0n, 0n, wallet.address, dl2, {...opts, gasLimit:gas*2n, value:eNeed})
  console.log(`tx: ${tx.hash}`)
  await tx.wait(1)
  console.log('✓ Added!')

  // ── Final verification ───────────────────────────────────────────────────
  const [fr0, fr1] = await pair.getReserves()
  const fuRes = parseFloat(ethers.formatUnits(isUSDC0 ? fr0 : fr1, 6))
  const feRes = parseFloat(ethers.formatEther(isUSDC0 ? fr1 : fr0))
  const finalPrice = fuRes / feRes
  const impact01   = ((fuRes - feRes * finalPrice * 0.1 / (feRes + 0.1)) / (0.1 * finalPrice) - 1) * 100

  console.log(`\n═══════════════════════════════════`)
  console.log(`✅ BASE POOL RESTORED`)
  console.log(`   ${fuRes.toFixed(2)} USDC / ${feRes.toFixed(4)} ETH`)
  console.log(`   Price: $${finalPrice.toFixed(2)}/ETH`)
  console.log(`   Swap 0.1 ETH → ~${(0.1*finalPrice*0.997).toFixed(2)} USDC (~$${(0.1*finalPrice*0.997).toFixed(2)})`)
  console.log(`   Price accuracy: ${(100-Math.abs(finalPrice-ethPrice)/ethPrice*100).toFixed(1)}%`)
  console.log(`═══════════════════════════════════`)
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
