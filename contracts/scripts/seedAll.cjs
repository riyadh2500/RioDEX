const { ethers } = require('ethers')

const ERC20   = ['function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)']
const ROUTER  = ['function factory() view returns(address)','function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)','function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns(uint256,uint256,uint256)']
const FACTORY = ['function getPair(address,address) view returns(address)','function allPairsLength() view returns(uint256)']

async function addETHPair(wallet, p, router, factory, weth, token, sym, dec, uAmt, eAmt) {
  const existing = await factory.getPair(token, weth)
  if (existing !== '0x0000000000000000000000000000000000000000') {
    console.log(`  ETH/${sym} already exists: ${existing}`)
    return true
  }
  const tok   = new ethers.Contract(token, ERC20, wallet)
  const uNeed = ethers.parseUnits(uAmt, dec)
  const eNeed = ethers.parseEther(eAmt)
  const uBal  = await tok.balanceOf(wallet.address)
  console.log(`  ${sym} balance: ${ethers.formatUnits(uBal, dec)}`)
  if (uBal < uNeed) { console.log(`  ✗ Need ${uAmt} ${sym} — get from faucet.circle.com`); return false }
  const fee   = await p.getFeeData()
  const opts  = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*2n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*2n }
  const allow = await tok.allowance(wallet.address, router.target)
  if (allow < uNeed) {
    console.log(`  Approving ${sym}...`)
    await (await tok.approve(router.target, uNeed, {...opts, gasLimit:100000n})).wait(1)
    console.log('  ✓ Approved')
  }
  let gas
  try { gas = await router.addLiquidityETH.estimateGas(token, uNeed, 0n, 0n, wallet.address, BigInt(Math.floor(Date.now()/1000)+900), {value:eNeed}) }
  catch { gas = 400000n }
  const dl = BigInt(Math.floor(Date.now()/1000)+900)
  console.log(`  Adding ETH/${sym} (${eAmt} ETH + ${uAmt} ${sym}) gas~${gas}...`)
  const tx = await router.addLiquidityETH(token, uNeed, 0n, 0n, wallet.address, dl, {...opts, gasLimit:gas*15n/10n, value:eNeed})
  console.log(`  tx: ${tx.hash}`)
  await tx.wait(1)
  const pair = await factory.getPair(token, weth)
  console.log(`  ✅ ETH/${sym} pool: ${pair}`)
  return true
}

async function addTokenPair(wallet, p, router, factory, tokenA, symA, decA, tokenB, symB, decB, aAmt, bAmt) {
  const existing = await factory.getPair(tokenA, tokenB)
  if (existing !== '0x0000000000000000000000000000000000000000') {
    console.log(`  ${symA}/${symB} already exists: ${existing}`)
    return true
  }
  const tokA  = new ethers.Contract(tokenA, ERC20, wallet)
  const tokB  = new ethers.Contract(tokenB, ERC20, wallet)
  const aNeed = ethers.parseUnits(aAmt, decA)
  const bNeed = ethers.parseUnits(bAmt, decB)
  const aBal  = await tokA.balanceOf(wallet.address)
  const bBal  = await tokB.balanceOf(wallet.address)
  console.log(`  ${symA} balance: ${ethers.formatUnits(aBal,decA)} | ${symB} balance: ${ethers.formatUnits(bBal,decB)}`)
  if (aBal < aNeed) { console.log(`  ✗ Need ${aAmt} ${symA}`); return false }
  if (bBal < bNeed) { console.log(`  ✗ Need ${bAmt} ${symB}`); return false }
  const fee  = await p.getFeeData()
  const opts = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*2n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*2n }
  for (const [tok, sym, need, spender] of [[tokA,symA,aNeed,router.target],[tokB,symB,bNeed,router.target]]) {
    const allow = await tok.allowance(wallet.address, spender)
    if (allow < need) {
      console.log(`  Approving ${sym}...`)
      await (await tok.approve(spender, need, {...opts, gasLimit:100000n})).wait(1)
      console.log(`  ✓ ${sym} approved`)
    }
  }
  let gas
  try { gas = await router.addLiquidity.estimateGas(tokenA, tokenB, aNeed, bNeed, 0n, 0n, wallet.address, BigInt(Math.floor(Date.now()/1000)+900)) }
  catch { gas = 400000n }
  const dl = BigInt(Math.floor(Date.now()/1000)+900)
  console.log(`  Adding ${symA}/${symB} (${aAmt} ${symA} + ${bAmt} ${symB}) gas~${gas}...`)
  const tx = await router.addLiquidity(tokenA, tokenB, aNeed, bNeed, 0n, 0n, wallet.address, dl, {...opts, gasLimit:gas*15n/10n})
  console.log(`  tx: ${tx.hash}`)
  await tx.wait(1)
  const pair = await factory.getPair(tokenA, tokenB)
  console.log(`  ✅ ${symA}/${symB} pool: ${pair}`)
  return true
}

async function main() {
  // ── Task 3: Ethereum Sepolia ──────────────────────────────────────────────
  console.log('\n══ Ethereum Sepolia ══')
  {
    const p      = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet('0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4', p)
    const router  = new ethers.Contract('0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e', ROUTER, wallet)
    const factory = new ethers.Contract(await router.factory(), FACTORY, p)
    const WETH    = '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E'
    console.log('Wallet:', wallet.address, '| ETH:', ethers.formatEther(await p.getBalance(wallet.address)))
    console.log('Pools before:', (await factory.allPairsLength()).toString())
    try { await addETHPair(wallet, p, router, factory, WETH, '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 'USDC', 6, '3', '0.001') } catch(e) { console.log('USDC err:', e.message.slice(0,120)) }
    try { await addETHPair(wallet, p, router, factory, WETH, '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', 'USDT', 6, '3', '0.001') } catch(e) { console.log('USDT err:', e.message.slice(0,120)) }
    console.log('Pools after:', (await factory.allPairsLength()).toString())
  }

  // ── Task 4: Base Sepolia ──────────────────────────────────────────────────
  console.log('\n══ Base Sepolia ══')
  {
    const p      = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', p)
    const router  = new ethers.Contract('0x54FaF60Ee37D56262f99772427FEca1a8a3645A5', ROUTER, wallet)
    const factory = new ethers.Contract(await router.factory(), FACTORY, p)
    const WETH    = '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a'
    console.log('Wallet:', wallet.address, '| ETH:', ethers.formatEther(await p.getBalance(wallet.address)))
    console.log('Pools before:', (await factory.allPairsLength()).toString())
    try { await addETHPair(wallet, p, router, factory, WETH, '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'USDC', 6, '3', '0.001') } catch(e) { console.log('USDC err:', e.message.slice(0,120)) }
    try { await addETHPair(wallet, p, router, factory, WETH, '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673', 'USDT', 6, '3', '0.001') } catch(e) { console.log('USDT err:', e.message.slice(0,120)) }
    console.log('Pools after:', (await factory.allPairsLength()).toString())
  }

  // ── Task 5: ARC Testnet ───────────────────────────────────────────────────
  console.log('\n══ ARC Testnet ══')
  {
    const p      = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network')
    const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', p)
    const router  = new ethers.Contract('0xcb0A9835CDf63c84FE80Fcc59d91d7505871c98B', ROUTER, wallet)
    const factory = new ethers.Contract(await router.factory(), FACTORY, p)
    console.log('Wallet:', wallet.address, '| USDC:', ethers.formatEther(await p.getBalance(wallet.address)))
    console.log('Pools before:', (await factory.allPairsLength()).toString())
    // USDC/EURC pool — token-to-token (no ETH involved on ARC)
    try {
      await addTokenPair(wallet, p, router, factory,
        '0x3600000000000000000000000000000000000000', 'USDC', 6,
        '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', 'EURC', 6,
        '5', '5')
    } catch(e) { console.log('USDC/EURC err:', e.message.slice(0,120)) }
    console.log('Pools after:', (await factory.allPairsLength()).toString())
  }

  console.log('\n══ ALL DONE ══')
}

main().catch(console.error)
