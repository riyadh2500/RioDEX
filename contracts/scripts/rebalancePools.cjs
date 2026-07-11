/**
 * Rebalances all pools to match real market prices.
 * Strategy: add large amounts of USDC relative to ETH to push price toward ~3500 USDC/ETH.
 * We add USDC without adding more ETH to shift the ratio.
 *
 * Current state (Base):  3.44 USDC / 0.014 ETH = 245 USDC/ETH  ← WRONG
 * Target:               49 USDC / 0.014 ETH = ~3500 USDC/ETH  ← CORRECT
 *
 * To rebalance: swap USDC→ETH using the router (this changes pool reserves to correct ratio)
 * OR add lots of USDC without adding ETH (use addLiquidity with existing pair)
 *
 * Best approach: add a huge USDC-only amount using addLiquidity to push price up.
 * We add 45 USDC + 0 ETH to existing Base pool using direct pair interaction.
 */
const { ethers } = require('ethers')

const KEY = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'

const ERC20   = ['function balanceOf(address) view returns(uint256)','function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)','function transfer(address,uint256) returns(bool)']
const PAIR    = ['function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)','function mint(address) returns(uint256)','function totalSupply() view returns(uint256)']
const ROUTER  = ['function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)']
const FACTORY = ['function getPair(address,address) view returns(address)']

// Current pool ratio: 3.44 USDC / 0.014 ETH = 245 USDC per ETH
// Target ratio: ~3500 USDC per ETH
// To fix: we need to add 0.014 * 3500 - 3.44 = 49 - 3.44 = ~45.5 MORE USDC to the pool
// without adding any ETH. We do this by calling addLiquidityETH with a tiny ETH amount
// and massive USDC — the router will use the pool ratio to calculate amounts.
// Actually the cleanest fix: directly transfer USDC to the pair then call pair.mint()

async function directAddUSDC(p, wallet, pairAddr, usdcAddr, extraUSDC) {
  const pair  = new ethers.Contract(pairAddr, PAIR, wallet)
  const usdc  = new ethers.Contract(usdcAddr, ERC20, wallet)
  const fee   = await p.getFeeData()
  const opts  = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*3n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*3n, gasLimit:200000n }

  const [r0, r1] = await pair.getReserves()
  const t0 = await pair.token0()
  const isUSDC0 = t0.toLowerCase() === usdcAddr.toLowerCase()
  const usdcReserve = isUSDC0 ? r0 : r1
  const ethReserve  = isUSDC0 ? r1 : r0
  const currentPrice = Number(ethers.formatUnits(usdcReserve, 6)) / Number(ethers.formatEther(ethReserve))

  console.log(`  Current reserves: ${ethers.formatUnits(usdcReserve,6)} USDC / ${ethers.formatEther(ethReserve)} ETH`)
  console.log(`  Current price: ${currentPrice.toFixed(2)} USDC/ETH`)
  console.log(`  Target price: ~3500 USDC/ETH`)

  const usdcBal = await usdc.balanceOf(wallet.address)
  const needed  = ethers.parseUnits(extraUSDC.toString(), 6)
  console.log(`  USDC balance: ${ethers.formatUnits(usdcBal, 6)}`)

  if (usdcBal < needed) { console.log(`  ✗ Not enough USDC (need ${extraUSDC})`); return }

  // Transfer USDC directly to the pair contract
  console.log(`  Transferring ${extraUSDC} USDC directly to pair...`)
  const tx = await usdc.transfer(pairAddr, needed, opts)
  console.log(`  tx: ${tx.hash}`)
  await tx.wait(1)
  console.log('  ✓ Transferred')

  // Mint LP tokens (this updates reserves)
  console.log('  Minting LP tokens to lock in new reserves...')
  const mintTx = await pair.mint(wallet.address, opts)
  console.log(`  tx: ${mintTx.hash}`)
  await mintTx.wait(1)
  console.log('  ✓ Minted')

  const [nr0, nr1] = await pair.getReserves()
  const newUSDC = isUSDC0 ? nr0 : nr1
  const newETH  = isUSDC0 ? nr1 : nr0
  const newPrice = Number(ethers.formatUnits(newUSDC, 6)) / Number(ethers.formatEther(newETH))
  console.log(`  New reserves: ${ethers.formatUnits(newUSDC,6)} USDC / ${ethers.formatEther(newETH)} ETH`)
  console.log(`  New price: ${newPrice.toFixed(2)} USDC/ETH`)
}

async function main() {
  // ── Base Sepolia USDC/WETH pool ──────────────────────────────────────────
  console.log('\n══ Rebalancing Base Sepolia USDC/WETH pool ══')
  {
    const p      = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    const PAIR_ADDR = '0xD0987631Cc5F18f96fB652C5e54f766fE8452a90'
    const USDC_ADDR = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
    // Pool has 3.44 USDC / 0.014 ETH. Need ~49 USDC / 0.014 ETH = 3500:1
    // Add 45.5 USDC to reach target
    await directAddUSDC(p, wallet, PAIR_ADDR, USDC_ADDR, 45.5)
  }

  // ── Ethereum Sepolia USDC/WETH pool ─────────────────────────────────────
  console.log('\n══ Rebalancing Ethereum Sepolia USDC/WETH pool ══')
  {
    const p      = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    const PAIR_ADDR = '0x1B3D3f925292EDC86ddB87a167dAD177Df4B8d35'
    const USDC_ADDR = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    // Pool has 0.522 USDC / 0.021 ETH = 24.9:1. Need 73.5 USDC / 0.021 ETH = 3500:1
    // Add 73 USDC
    await directAddUSDC(p, wallet, PAIR_ADDR, USDC_ADDR, 73)
  }

  console.log('\n══ DONE — pools now reflect real ETH price ══')
  console.log('Swapping 0.005 ETH should give ~17.5 USDC (at $3500/ETH)')
}

main().catch(e => { console.error('Error:', e.message.slice(0,200)); process.exit(1) })
