/**
 * Fix Ethereum Sepolia pool — inject all available USDC + ETH to:
 * 1. Bring price to $1783/ETH via sync()
 * 2. Add as much depth as possible
 */
const { ethers } = require('ethers')

const KEY  = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'
const RPC  = 'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'
const PAIR = '0x1B3D3f925292EDC86ddB87a167dAD177Df4B8d35'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const ROUTER = '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e'

const ERC20   = ['function balanceOf(address) view returns(uint256)','function transfer(address,uint256) returns(bool)','function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)']
const PAIRABI = ['function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)','function sync()','function mint(address) returns(uint256)']
const ROUTABI = ['function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)']

async function main() {
  const p      = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(KEY, p)
  const fee    = await p.getFeeData()
  const opts   = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*3n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*3n }

  const pair   = new ethers.Contract(PAIR,   PAIRABI, wallet)
  const usdc   = new ethers.Contract(USDC,   ERC20,   wallet)
  const router = new ethers.Contract(ROUTER, ROUTABI, wallet)

  const ethBal  = await p.getBalance(wallet.address)
  const usdcBal = await usdc.balanceOf(wallet.address)

  console.log('ETH  :', ethers.formatEther(ethBal))
  console.log('USDC :', ethers.formatUnits(usdcBal, 6))

  const [r0, r1] = await pair.getReserves()
  const t0       = await pair.token0()
  const isUSDC0  = t0.toLowerCase() === USDC.toLowerCase()
  const uRes     = isUSDC0 ? r0 : r1
  const eRes     = isUSDC0 ? r1 : r0

  const uReserve = parseFloat(ethers.formatUnits(uRes, 6))
  const eReserve = parseFloat(ethers.formatEther(eRes))
  console.log(`\nPool: ${uReserve.toFixed(4)} USDC / ${eReserve.toFixed(6)} ETH = $${(uReserve/eReserve).toFixed(2)}/ETH`)

  // Fetch live price
  let livePrice = 1783
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    const json = await res.json()
    livePrice  = json.ethereum.usd
  } catch {}
  console.log(`Live ETH price: $${livePrice}`)

  // Step 1: inject USDC to fix price ratio
  const targetUSDC = livePrice * eReserve
  const toInject   = targetUSDC - uReserve
  console.log(`Need ${toInject.toFixed(4)} more USDC to reach $${livePrice}/ETH`)

  if (toInject > 0) {
    const availableUSDC = parseFloat(ethers.formatUnits(usdcBal, 6))
    const injectAmount  = Math.min(toInject, availableUSDC * 0.95)

    if (injectAmount > 0.01) {
      const injectWei = ethers.parseUnits(injectAmount.toFixed(6), 6)
      console.log(`\nStep 1: Transferring ${injectAmount.toFixed(4)} USDC to pair...`)
      const tx1 = await usdc.transfer(PAIR, injectWei, {...opts, gasLimit:100000n})
      console.log('  tx:', tx1.hash)
      await tx1.wait(1)

      console.log('Step 1: Calling sync()...')
      const tx2 = await pair.sync({...opts, gasLimit:100000n})
      console.log('  tx:', tx2.hash)
      await tx2.wait(1)
      console.log('✓ Price fixed')
    }
  }

  // Step 2: add ETH+USDC at new correct ratio to deepen pool
  const [nr0, nr1] = await pair.getReserves()
  const nuRes = isUSDC0 ? nr0 : nr1
  const neRes = isUSDC0 ? nr1 : nr0
  const newPrice = parseFloat(ethers.formatUnits(nuRes, 6)) / parseFloat(ethers.formatEther(neRes))
  console.log(`\nNew price after fix: $${newPrice.toFixed(2)}/ETH`)

  const freshUSDC = await usdc.balanceOf(wallet.address)
  const freshETH  = await p.getBalance(wallet.address)
  const uAvail    = parseFloat(ethers.formatUnits(freshUSDC, 6))
  const eAvail    = parseFloat(ethers.formatEther(freshETH))

  // Add as much ETH+USDC as possible at the fixed ratio
  const maxByUSDC = uAvail * 0.90 / newPrice  // ETH equivalent of available USDC
  const maxByETH  = eAvail - 0.02              // keep 0.02 for gas
  const addETH    = Math.min(maxByUSDC, maxByETH, 0.5)
  const addUSDC   = addETH * newPrice

  if (addETH > 0.001 && addUSDC > 0.01) {
    const eNeed = ethers.parseEther(addETH.toFixed(18))
    const uNeed = ethers.parseUnits(addUSDC.toFixed(6), 6)
    const dl    = BigInt(Math.floor(Date.now()/1000) + 900)

    const allow = await usdc.allowance(wallet.address, ROUTER)
    if (allow < uNeed) {
      process.stdout.write('\nStep 2: Approving USDC... ')
      await (await usdc.approve(ROUTER, uNeed * 2n, {...opts, gasLimit:100000n})).wait(1)
      console.log('✓')
    }

    let gas
    try { gas = await router.addLiquidityETH.estimateGas(USDC, uNeed, 0n, 0n, wallet.address, dl, {value:eNeed}) }
    catch { gas = 400000n }

    console.log(`Step 2: Adding ${addETH.toFixed(6)} ETH + ${addUSDC.toFixed(4)} USDC (gas~${gas})...`)
    const tx3 = await router.addLiquidityETH(USDC, uNeed, 0n, 0n, wallet.address, dl, {...opts, gasLimit:gas*2n, value:eNeed})
    console.log('  tx:', tx3.hash)
    await tx3.wait(1)
    console.log('✓ Liquidity added!')
  }

  // Final state
  const [fr0, fr1] = await pair.getReserves()
  const fuRes = isUSDC0 ? fr0 : fr1
  const feRes = isUSDC0 ? fr1 : fr0
  const finalPrice = parseFloat(ethers.formatUnits(fuRes, 6)) / parseFloat(ethers.formatEther(feRes))
  const finalETH   = parseFloat(ethers.formatEther(feRes))

  console.log(`\n════════════════════════════════`)
  console.log(`Sepolia USDC pool FINAL state:`)
  console.log(`  ${ethers.formatUnits(fuRes,6)} USDC / ${ethers.formatEther(feRes)} ETH`)
  console.log(`  Price: $${finalPrice.toFixed(2)}/ETH`)
  console.log(`  Max recommended swap: ${(finalETH * 0.1).toFixed(4)} ETH (~$${(finalETH * 0.1 * finalPrice).toFixed(2)})`)
  console.log(`  Swap 0.1 ETH → ~${(0.1 * finalPrice * 0.997).toFixed(4)} USDC (~$${(0.1 * finalPrice * 0.997).toFixed(2)})`)
  console.log(`════════════════════════════════`)
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
