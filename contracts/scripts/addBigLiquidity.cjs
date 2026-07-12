/**
 * Adds large liquidity to pools so they can handle real swap amounts.
 * Uses the EXACT current pool ratio so we don't change the price,
 * just increase depth dramatically.
 *
 * Target: pool should hold ~0.5 ETH so 0.1 ETH swaps = only 20% of pool
 * (AMM formula: ~18% price impact at 20% pool depth — acceptable for testnet)
 */
const { ethers } = require('ethers')

const KEY = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'
const ERC20  = ['function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)']
const ROUTER = ['function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)']
const PAIR   = ['function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)']

async function addLargeETHLiquidity(p, wallet, routerAddr, pairAddr, tokenAddr, tokenSym, tokenDec) {
  const pair   = new ethers.Contract(pairAddr, PAIR, p)
  const token  = new ethers.Contract(tokenAddr, ERC20, wallet)
  const router = new ethers.Contract(routerAddr, ROUTER, wallet)
  const fee    = await p.getFeeData()
  const opts   = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*3n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*3n }

  const [r0, r1] = await pair.getReserves()
  const t0       = await pair.token0()
  const isToken0 = t0.toLowerCase() === tokenAddr.toLowerCase()
  const tokenRes = isToken0 ? r0 : r1
  const ethRes   = isToken0 ? r1 : r0

  const tokenReserve = parseFloat(ethers.formatUnits(tokenRes, tokenDec))
  const ethReserve   = parseFloat(ethers.formatEther(ethRes))
  const currentPrice = tokenReserve / ethReserve

  console.log(`  Current: ${tokenReserve.toFixed(4)} ${tokenSym} / ${ethReserve.toFixed(6)} ETH = $${currentPrice.toFixed(2)}/ETH`)

  // We want pool to hold 0.5 ETH total → need to add 0.5 - current ETH reserve
  const targetETH   = 0.5
  const addETH      = Math.max(0, targetETH - ethReserve)
  // Must add tokens at EXACT current ratio to not change price
  const addToken    = addETH * currentPrice

  const tokenBal = parseFloat(ethers.formatUnits(await token.balanceOf(wallet.address), tokenDec))
  const ethBal   = parseFloat(ethers.formatEther(await p.getBalance(wallet.address)))

  console.log(`  Wallet: ${ethBal.toFixed(6)} ETH | ${tokenBal.toFixed(4)} ${tokenSym}`)
  console.log(`  Need to add: ${addETH.toFixed(6)} ETH + ${addToken.toFixed(4)} ${tokenSym}`)

  if (addETH <= 0) { console.log('  Pool already large enough'); return }

  // Cap by available balance
  const maxETH   = Math.min(addETH, ethBal - 0.02)  // keep 0.02 for gas
  const maxToken = Math.min(addToken, tokenBal * 0.99)
  // Use the limiting factor
  const ratio     = currentPrice
  const useETH    = Math.min(maxETH, maxToken / ratio)
  const useToken  = useETH * ratio

  if (useETH < 0.001) {
    console.log(`  ✗ Insufficient funds. Need more ${tokenSym} from faucet.circle.com`)
    return
  }

  console.log(`  Adding: ${useETH.toFixed(6)} ETH + ${useToken.toFixed(4)} ${tokenSym}`)

  const uNeed = ethers.parseUnits(useToken.toFixed(tokenDec), tokenDec)
  const eNeed = ethers.parseEther(useETH.toFixed(18))
  const dl    = BigInt(Math.floor(Date.now()/1000) + 900)

  // Approve token
  const allow = await token.allowance(wallet.address, routerAddr)
  if (allow < uNeed) {
    process.stdout.write(`  Approving ${tokenSym}... `)
    await (await token.approve(routerAddr, uNeed * 10n, {...opts, gasLimit:100000n})).wait(1)
    console.log('✓')
  }

  // Estimate gas
  let gas
  try { gas = await router.addLiquidityETH.estimateGas(tokenAddr, uNeed, 0n, 0n, wallet.address, dl, {value:eNeed}) }
  catch(e) { console.log('  estimateGas err:', e.message.slice(0,60)); gas = 500000n }

  process.stdout.write(`  addLiquidityETH (gas~${gas})... `)
  const tx = await router.addLiquidityETH(tokenAddr, uNeed, 0n, 0n, wallet.address, dl, {...opts, gasLimit:gas*2n, value:eNeed})
  console.log(`tx:${tx.hash.slice(0,14)}`)
  await tx.wait(1)
  console.log('  ✓ Added!')

  // Verify
  const [nr0, nr1] = await pair.getReserves()
  const newToken   = isToken0 ? nr0 : nr1
  const newEth     = isToken0 ? nr1 : nr0
  const newPrice   = parseFloat(ethers.formatUnits(newToken, tokenDec)) / parseFloat(ethers.formatEther(newEth))
  console.log(`  New reserves: ${ethers.formatUnits(newToken,tokenDec)} ${tokenSym} / ${ethers.formatEther(newEth)} ETH`)
  console.log(`  Price: $${newPrice.toFixed(2)}/ETH`)
  console.log(`  Max swap without major slippage: ~${(parseFloat(ethers.formatEther(newEth)) * 0.1).toFixed(4)} ETH`)
}

async function main() {
  console.log('== Adding deep liquidity to all pools ==\n')

  // ── Base Sepolia ─────────────────────────────────────────────────────────
  console.log('── Base Sepolia USDC/WETH ──')
  {
    const p = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const w = new ethers.Wallet(KEY, p)
    await addLargeETHLiquidity(p, w,
      '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',  // router
      '0xD0987631Cc5F18f96fB652C5e54f766fE8452a90',  // pair
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e',  // USDC
      'USDC', 6)
  }

  // ── Ethereum Sepolia ─────────────────────────────────────────────────────
  console.log('\n── Ethereum Sepolia USDC/WETH ──')
  {
    const p = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const w = new ethers.Wallet(KEY, p)
    await addLargeETHLiquidity(p, w,
      '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',  // router
      '0x1B3D3f925292EDC86ddB87a167dAD177Df4B8d35',  // pair
      '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',  // USDC
      'USDC', 6)
  }

  console.log('\n== DONE ==')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
