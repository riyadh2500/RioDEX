/**
 * Adds more liquidity to existing pools to make swaps work with reasonable amounts.
 * Target: ~10 USDC / 0.003 ETH per pool (3000 USDC/ETH price ratio)
 */
const { ethers } = require('ethers')

const KEY = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'

const ERC20   = ['function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)']
const ROUTER  = ['function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)','function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns(uint256,uint256,uint256)']
const FACTORY = ['function getPair(address,address) view returns(address)','function allPairs(uint256) view returns(address)','function allPairsLength() view returns(uint256)']
const PAIR    = ['function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)']

async function addETHLiquidity(p, wallet, routerAddr, tokenAddr, tokenSym, tokenDec, uAmount, ethAmount) {
  const router = new ethers.Contract(routerAddr, ROUTER, wallet)
  const token  = new ethers.Contract(tokenAddr, ERC20, wallet)
  const fee    = await p.getFeeData()
  const opts   = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*2n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*2n }

  const uNeed = ethers.parseUnits(uAmount, tokenDec)
  const eNeed = ethers.parseEther(ethAmount)
  const dl    = BigInt(Math.floor(Date.now()/1000)+900)

  const allow = await token.allowance(wallet.address, routerAddr)
  if (allow < uNeed) {
    process.stdout.write(`  Approving ${tokenSym}... `)
    await (await token.approve(routerAddr, uNeed, {...opts, gasLimit:100000n})).wait(1)
    console.log('✓')
  }

  let gas
  try { gas = await router.addLiquidityETH.estimateGas(tokenAddr, uNeed, 0n, 0n, wallet.address, dl, {value:eNeed}) }
  catch(e) { console.log('  estimateGas failed:', e.message.slice(0,80)); gas = 400000n }

  console.log(`  Adding ${ethAmount} ETH + ${uAmount} ${tokenSym} (gas~${gas})...`)
  const tx = await router.addLiquidityETH(tokenAddr, uNeed, 0n, 0n, wallet.address, dl, {...opts, gasLimit:gas*15n/10n, value:eNeed})
  console.log(`  tx: ${tx.hash}`)
  await tx.wait(1)
  console.log(`  ✅ Added!`)
}

async function main() {
  // ── Ethereum Sepolia ──────────────────────────────────────────────────────
  console.log('\n══ Ethereum Sepolia ══')
  {
    const p      = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    const ROUTER_ADDR = '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e'
    const ethBal = await p.getBalance(wallet.address)
    console.log('  ETH:', ethers.formatEther(ethBal))
    // Add 10 USDC + 0.003 ETH to deepen pool
    await addETHLiquidity(p, wallet, ROUTER_ADDR, '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 'USDC', 6, '10', '0.003')
  }

  // ── Base Sepolia ──────────────────────────────────────────────────────────
  console.log('\n══ Base Sepolia ══')
  {
    const p      = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    const ROUTER_ADDR = '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5'
    const ethBal = await p.getBalance(wallet.address)
    console.log('  ETH:', ethers.formatEther(ethBal))
    // Add 10 USDC + 0.003 ETH
    await addETHLiquidity(p, wallet, ROUTER_ADDR, '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'USDC', 6, '10', '0.003')
    // Add 10 USDT + 0.003 ETH
    await addETHLiquidity(p, wallet, ROUTER_ADDR, '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673', 'USDT', 6, '10', '0.003')
  }

  console.log('\n══ DONE ══')
  console.log('Pools now have deeper liquidity — swaps should work.')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
