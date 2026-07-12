/**
 * fixAndDeepen.cjs
 * ─────────────────
 * 1. Fetches live ETH price from CoinGecko
 * 2. Fixes price ratio on every pool via transfer→sync()
 * 3. Adds maximum available ETH + tokens via addLiquidityETH to deepen pools
 * 4. Prints final state
 */
const { ethers } = require('ethers')

const KEY = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'

const ERC20   = [
  'function balanceOf(address) view returns(uint256)',
  'function transfer(address,uint256) returns(bool)',
  'function approve(address,uint256) returns(bool)',
  'function allowance(address,address) view returns(uint256)',
]
const PAIR_ABI = [
  'function getReserves() view returns(uint112,uint112,uint32)',
  'function token0() view returns(address)',
  'function sync()',
]
const ROUTER_ABI = [
  'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)',
  'function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns(uint256,uint256,uint256)',
]

async function fetchETHPrice() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    return (await r.json()).ethereum.usd
  } catch { return 1800 }
}

function txOpts(fee) {
  return {
    maxFeePerGas:         (fee.maxFeePerGas         ?? 5000000000n) * 3n,
    maxPriorityFeePerGas: (fee.maxPriorityFeePerGas ?? 1500000000n) * 3n,
  }
}

/** Fix pool ratio then add maximum liquidity */
async function fixPool({ p, wallet, routerAddr, pairAddr, tokenAddr, tokenSym, tokenDec, targetPrice }) {
  const pair   = new ethers.Contract(pairAddr,   PAIR_ABI,   wallet)
  const token  = new ethers.Contract(tokenAddr,  ERC20,      wallet)
  const router = new ethers.Contract(routerAddr, ROUTER_ABI, wallet)
  const fee    = await p.getFeeData()
  const opts   = txOpts(fee)

  // ── Current reserves ─────────────────────────────────────────────────────
  const [r0, r1] = await pair.getReserves()
  const t0       = await pair.token0()
  const isT0     = t0.toLowerCase() === tokenAddr.toLowerCase()
  const tRes     = isT0 ? r0 : r1
  const eRes     = isT0 ? r1 : r0

  const tFloat   = parseFloat(ethers.formatUnits(tRes, tokenDec))
  const eFloat   = parseFloat(ethers.formatEther(eRes))
  const curPrice = tFloat / eFloat

  const ethBal  = parseFloat(ethers.formatEther(await p.getBalance(wallet.address)))
  const tokBal  = parseFloat(ethers.formatUnits(await token.balanceOf(wallet.address), tokenDec))

  console.log(`  Reserves:  ${tFloat.toFixed(4)} ${tokenSym} / ${eFloat.toFixed(6)} ETH`)
  console.log(`  Price now: $${curPrice.toFixed(2)} | Target: $${targetPrice.toFixed(2)}`)
  console.log(`  Wallet:    ${ethBal.toFixed(6)} ETH | ${tokBal.toFixed(4)} ${tokenSym}`)

  // ── Step 1: fix price via inject + sync ──────────────────────────────────
  const targetTokenReserve = targetPrice * eFloat
  const toInject = targetTokenReserve - tFloat

  if (Math.abs(curPrice - targetPrice) / targetPrice > 0.02) {
    if (toInject > 0 && tokBal > 0.01) {
      const injectAmt = Math.min(toInject, tokBal * 0.99)
      const injectWei = ethers.parseUnits(injectAmt.toFixed(tokenDec), tokenDec)
      process.stdout.write(`  [1/3] Inject ${injectAmt.toFixed(4)} ${tokenSym} to fix price... `)
      await (await token.transfer(pairAddr, injectWei, { ...opts, gasLimit: 100000n })).wait(1)
      await (await pair.sync({ ...opts, gasLimit: 100000n })).wait(1)
      console.log('✓')
    } else if (toInject < 0) {
      console.log('  [1/3] Price too high — skipping inject (need more ETH in pool)')
    } else {
      console.log(`  [1/3] Not enough ${tokenSym} to fix price — skipping`)
    }
  } else {
    console.log(`  [1/3] Price OK (within 2%)`)
  }

  // ── Re-read reserves after fix ────────────────────────────────────────────
  const [nr0, nr1] = await pair.getReserves()
  const ntRes = isT0 ? nr0 : nr1
  const neRes = isT0 ? nr1 : nr0
  const ntFloat = parseFloat(ethers.formatUnits(ntRes, tokenDec))
  const neFloat = parseFloat(ethers.formatEther(neRes))
  const newPrice = ntFloat / neFloat
  console.log(`  Price after fix: $${newPrice.toFixed(2)}/ETH`)

  // ── Step 2: add maximum liquidity at current ratio ───────────────────────
  const freshTok = parseFloat(ethers.formatUnits(await token.balanceOf(wallet.address), tokenDec))
  const freshETH = parseFloat(ethers.formatEther(await p.getBalance(wallet.address)))

  // Use 90% of available tokens and matching ETH at pool ratio
  const maxByToken = (freshTok * 0.90) / newPrice
  const maxByETH   = freshETH - 0.015  // keep 0.015 for gas
  const addETH     = Math.min(maxByToken, maxByETH)
  const addToken   = addETH * newPrice

  if (addETH < 0.0005 || addToken < 0.001) {
    console.log(`  [2/3] Not enough funds to add more liquidity`)
    return
  }

  const eNeed = ethers.parseEther(addETH.toFixed(18).slice(0, 20))
  const tNeed = ethers.parseUnits(addToken.toFixed(tokenDec), tokenDec)
  const dl    = BigInt(Math.floor(Date.now() / 1000) + 900)

  const allow = await token.allowance(wallet.address, routerAddr)
  if (allow < tNeed) {
    process.stdout.write(`  [2/3] Approving ${tokenSym}... `)
    await (await token.approve(routerAddr, tNeed * 10n, { ...opts, gasLimit: 100000n })).wait(1)
    console.log('✓')
  }

  let gas
  try {
    gas = await router.addLiquidityETH.estimateGas(tokenAddr, tNeed, 0n, 0n, wallet.address, dl, { value: eNeed })
  } catch { gas = 500000n }

  process.stdout.write(`  [2/3] Add ${addETH.toFixed(6)} ETH + ${addToken.toFixed(4)} ${tokenSym}... `)
  const tx = await router.addLiquidityETH(tokenAddr, tNeed, 0n, 0n, wallet.address, dl, { ...opts, gasLimit: gas * 2n, value: eNeed })
  await tx.wait(1)
  console.log(`✓ tx:${tx.hash.slice(0, 14)}`)

  // ── Final state ───────────────────────────────────────────────────────────
  const [fr0, fr1] = await pair.getReserves()
  const ftRes = isT0 ? fr0 : fr1
  const feRes = isT0 ? fr1 : fr0
  const fPrice = parseFloat(ethers.formatUnits(ftRes, tokenDec)) / parseFloat(ethers.formatEther(feRes))
  const fETH   = parseFloat(ethers.formatEther(feRes))
  console.log(`  [3/3] Final: ${ethers.formatUnits(ftRes, tokenDec)} ${tokenSym} / ${ethers.formatEther(feRes)} ETH`)
  console.log(`  ✅ Price: $${fPrice.toFixed(2)}/ETH | Pool depth: ${fETH.toFixed(4)} ETH`)
  console.log(`  → Swap 0.1 ETH → ~${(0.1 * fPrice * 0.997).toFixed(4)} ${tokenSym} (~$${(0.1 * fPrice * 0.997).toFixed(2)})`)
}

/** Fix token/token pool (ARC USDC/EURC) */
async function fixTokenPool({ p, wallet, routerAddr, pairAddr, tokenA, symA, decA, tokenB, symB, decB }) {
  const pair   = new ethers.Contract(pairAddr, PAIR_ABI, wallet)
  const tokA   = new ethers.Contract(tokenA, ERC20, wallet)
  const tokB   = new ethers.Contract(tokenB, ERC20, wallet)
  const router = new ethers.Contract(routerAddr, ROUTER_ABI, wallet)
  const fee    = await p.getFeeData()
  const opts   = txOpts(fee)

  const [r0, r1]  = await pair.getReserves()
  const t0        = await pair.token0()
  const isA0      = t0.toLowerCase() === tokenA.toLowerCase()
  const rA        = parseFloat(ethers.formatUnits(isA0 ? r0 : r1, decA))
  const rB        = parseFloat(ethers.formatUnits(isA0 ? r1 : r0, decB))
  console.log(`  Reserves: ${rA.toFixed(4)} ${symA} / ${rB.toFixed(4)} ${symB}`)

  const balA = parseFloat(ethers.formatUnits(await tokA.balanceOf(wallet.address), decA))
  const balB = parseFloat(ethers.formatUnits(await tokB.balanceOf(wallet.address), decB))
  console.log(`  Wallet: ${balA.toFixed(4)} ${symA} | ${balB.toFixed(4)} ${symB}`)

  const ratio  = rA / rB  // tokens A per token B
  const addB   = Math.min(balB * 0.90, 20)
  const addA   = addB * ratio

  if (addB < 0.01 || balA < addA) { console.log('  Not enough tokens — skipping'); return }

  const aNeed = ethers.parseUnits(addA.toFixed(decA), decA)
  const bNeed = ethers.parseUnits(addB.toFixed(decB), decB)
  const dl    = BigInt(Math.floor(Date.now() / 1000) + 900)

  for (const [tok, sym, need] of [[tokA, symA, aNeed], [tokB, symB, bNeed]]) {
    const allow = await tok.allowance(wallet.address, routerAddr)
    if (allow < need) {
      process.stdout.write(`  Approving ${sym}... `)
      await (await tok.approve(routerAddr, need * 10n, { ...opts, gasLimit: 100000n })).wait(1)
      console.log('✓')
    }
  }

  let gas
  try { gas = await router.addLiquidity.estimateGas(tokenA, tokenB, aNeed, bNeed, 0n, 0n, wallet.address, dl) }
  catch { gas = 500000n }

  process.stdout.write(`  Add ${addA.toFixed(4)} ${symA} + ${addB.toFixed(4)} ${symB}... `)
  const tx = await router.addLiquidity(tokenA, tokenB, aNeed, bNeed, 0n, 0n, wallet.address, dl, { ...opts, gasLimit: gas * 2n })
  await tx.wait(1)
  console.log(`✓ tx:${tx.hash.slice(0, 14)}`)

  const [nr0, nr1] = await pair.getReserves()
  const nrA = parseFloat(ethers.formatUnits(isA0 ? nr0 : nr1, decA))
  const nrB = parseFloat(ethers.formatUnits(isA0 ? nr1 : nr0, decB))
  console.log(`  ✅ Final: ${nrA.toFixed(4)} ${symA} / ${nrB.toFixed(4)} ${symB}`)
}

async function main() {
  const ethPrice = await fetchETHPrice()
  console.log(`\nLive ETH price: $${ethPrice}\n`)

  // ── Ethereum Sepolia ──────────────────────────────────────────────────────
  console.log('═══ Ethereum Sepolia — ETH/USDC ═══')
  await fixPool({
    p:          new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'),
    wallet:     new ethers.Wallet(KEY, new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')),
    routerAddr: '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    pairAddr:   '0x1B3D3f925292EDC86ddB87a167dAD177Df4B8d35',
    tokenAddr:  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    tokenSym:   'USDC', tokenDec: 6, targetPrice: ethPrice,
  }).catch(e => console.log('  Error:', e.message.slice(0, 100)))

  // ── Base Sepolia USDC ─────────────────────────────────────────────────────
  console.log('\n═══ Base Sepolia — ETH/USDC ═══')
  await fixPool({
    p:          new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'),
    wallet:     new ethers.Wallet(KEY, new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')),
    routerAddr: '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    pairAddr:   '0xD0987631Cc5F18f96fB652C5e54f766fE8452a90',
    tokenAddr:  '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    tokenSym:   'USDC', tokenDec: 6, targetPrice: ethPrice,
  }).catch(e => console.log('  Error:', e.message.slice(0, 100)))

  // ── ARC USDC/EURC ─────────────────────────────────────────────────────────
  console.log('\n═══ ARC Testnet — USDC/EURC ═══')
  await fixTokenPool({
    p:          new ethers.JsonRpcProvider('https://rpc.testnet.arc.network'),
    wallet:     new ethers.Wallet(KEY, new ethers.JsonRpcProvider('https://rpc.testnet.arc.network')),
    routerAddr: '0xcb0A9835CDf63c84FE80Fcc59d91d7505871c98B',
    pairAddr:   '0x199dbD93032dE64884d10023C1d6bF42dEb4370d',
    tokenA: '0x3600000000000000000000000000000000000000', symA: 'USDC', decA: 6,
    tokenB: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', symB: 'EURC', decB: 6,
  }).catch(e => console.log('  Error:', e.message.slice(0, 100)))

  console.log('\n══════════════════════════════════════════')
  console.log('ALL DONE — swap 0.1 ETH on Base Sepolia')
  console.log('   ETH → USDC should give ~$' + (ethPrice * 0.1 * 0.997).toFixed(2))
  console.log('══════════════════════════════════════════')
}

main().catch(console.error)
