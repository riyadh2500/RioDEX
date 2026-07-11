/**
 * Adds deep liquidity to all pools.
 * Uses the existing pool ratio so we don't change the price,
 * just increase depth so swaps don't fail.
 */
const { ethers } = require('ethers')

const KEY = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'
const ERC20  = ['function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)']
const ROUTER = ['function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)','function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns(uint256,uint256,uint256)']
const PAIR   = ['function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)','function totalSupply() view returns(uint256)']

async function inject(p, wallet, routerAddr, tokenAddr, tokenSym, tokenDec, uAmt, eAmt) {
  const router = new ethers.Contract(routerAddr, ROUTER, wallet)
  const token  = new ethers.Contract(tokenAddr, ERC20, wallet)
  const fee    = await p.getFeeData()
  const opts   = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*3n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*3n }

  const uNeed = ethers.parseUnits(uAmt, tokenDec)
  const eNeed = ethers.parseEther(eAmt)
  const dl    = BigInt(Math.floor(Date.now()/1000)+900)

  const uBal = await token.balanceOf(wallet.address)
  console.log(`  ${tokenSym} balance: ${ethers.formatUnits(uBal, tokenDec)}`)
  if (uBal < uNeed) { console.log(`  ✗ Not enough ${tokenSym}`); return }

  const allow = await token.allowance(wallet.address, routerAddr)
  if (allow < uNeed) {
    process.stdout.write(`  Approving ${tokenSym}... `)
    await (await token.approve(routerAddr, uNeed*10n, {...opts, gasLimit:100000n})).wait(1)
    console.log('✓')
  }

  let gas
  try { gas = await router.addLiquidityETH.estimateGas(tokenAddr, uNeed, 0n, 0n, wallet.address, dl, {value:eNeed}) }
  catch(e) { console.log(`  gas estimate failed: ${e.message.slice(0,60)}`); gas = 500000n }

  process.stdout.write(`  Adding ${eAmt} ETH + ${uAmt} ${tokenSym}... `)
  const tx = await router.addLiquidityETH(tokenAddr, uNeed, 0n, 0n, wallet.address, dl, {...opts, gasLimit:gas*2n, value:eNeed})
  await tx.wait(1)
  console.log(`✓  tx:${tx.hash.slice(0,14)}`)
}

async function injectTokenPair(p, wallet, routerAddr, tA, sA, dA, tB, sB, dB, aAmt, bAmt) {
  const router = new ethers.Contract(routerAddr, ROUTER, wallet)
  const tokA   = new ethers.Contract(tA, ERC20, wallet)
  const tokB   = new ethers.Contract(tB, ERC20, wallet)
  const fee    = await p.getFeeData()
  const opts   = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*3n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*3n }
  const aNeed  = ethers.parseUnits(aAmt, dA)
  const bNeed  = ethers.parseUnits(bAmt, dB)
  const dl     = BigInt(Math.floor(Date.now()/1000)+900)

  const aBal = await tokA.balanceOf(wallet.address)
  const bBal = await tokB.balanceOf(wallet.address)
  console.log(`  ${sA}: ${ethers.formatUnits(aBal,dA)} | ${sB}: ${ethers.formatUnits(bBal,dB)}`)
  if (aBal < aNeed || bBal < bNeed) { console.log('  ✗ Not enough tokens'); return }

  for (const [tok, sym, need] of [[tokA,sA,aNeed],[tokB,sB,bNeed]]) {
    const allow = await tok.allowance(wallet.address, routerAddr)
    if (allow < need) {
      process.stdout.write(`  Approving ${sym}... `)
      await (await tok.approve(routerAddr, need*10n, {...opts, gasLimit:100000n})).wait(1)
      console.log('✓')
    }
  }

  let gas
  try { gas = await router.addLiquidity.estimateGas(tA, tB, aNeed, bNeed, 0n, 0n, wallet.address, dl) }
  catch(e) { console.log(`  gas estimate failed: ${e.message.slice(0,60)}`); gas = 500000n }

  process.stdout.write(`  Adding ${aAmt} ${sA} + ${bAmt} ${sB}... `)
  const tx = await router.addLiquidity(tA, tB, aNeed, bNeed, 0n, 0n, wallet.address, dl, {...opts, gasLimit:gas*2n})
  await tx.wait(1)
  console.log(`✓  tx:${tx.hash.slice(0,14)}`)
}

async function main() {
  // ── Ethereum Sepolia ─────────────────────────────────────────────────────
  console.log('\n══ Ethereum Sepolia ══')
  {
    const p      = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    console.log('  ETH:', ethers.formatEther(await p.getBalance(wallet.address)))
    // Add 20 USDC + 0.007 ETH (≈ 2857 USDC/ETH) to deepen the pool significantly
    await inject(p, wallet, '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
      '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 'USDC', 6, '20', '0.007')
  }

  // ── Base Sepolia ─────────────────────────────────────────────────────────
  console.log('\n══ Base Sepolia ══')
  {
    const p      = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    console.log('  ETH:', ethers.formatEther(await p.getBalance(wallet.address)))
    // Add more USDC liquidity (pool already has 12 USDC / 0.004 ETH ≈ 3000:1 ratio, good!)
    await inject(p, wallet, '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'USDC', 6, '15', '0.005')
  }

  // ── ARC Testnet ──────────────────────────────────────────────────────────
  console.log('\n══ ARC Testnet ══')
  {
    const p      = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network')
    const wallet = new ethers.Wallet(KEY, p)
    console.log('  USDC:', ethers.formatEther(await p.getBalance(wallet.address)))
    // Add more USDC/EURC
    await injectTokenPair(p, wallet, '0xcb0A9835CDf63c84FE80Fcc59d91d7505871c98B',
      '0x3600000000000000000000000000000000000000', 'USDC', 6,
      '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', 'EURC', 6,
      '20', '20')
  }

  console.log('\n══ Done — checking final reserves ══')
  const p = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
  const pair = new ethers.Contract('0xD0987631Cc5F18f96fB652C5e54f766fE8452a90', PAIR, p)
  const [r0, r1] = await pair.getReserves()
  console.log('Base USDC/WETH reserves:', ethers.formatUnits(r0,6), 'USDC /', ethers.formatEther(r1), 'WETH')
  console.log('Swaps should now work for amounts up to ~', ethers.formatUnits(r0/10n,6), 'USDC')
}

main().catch(e => { console.error('Error:', e.message.slice(0,200)); process.exit(1) })
