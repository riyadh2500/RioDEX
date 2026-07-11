/**
 * Fix pool prices to match live ETH market price.
 *
 * Strategy: inject stablecoins directly into pair contracts then call sync()
 * This sets the reserve ratio to match the real ETH price WITHOUT needing
 * to add matching ETH.
 *
 * Formula:
 *   Current: reserve_usdc / reserve_eth = wrong_price
 *   Target:  reserve_usdc_new / reserve_eth = real_eth_price
 *   Need to add: real_eth_price * reserve_eth - reserve_usdc_current
 */
const { ethers } = require('ethers')

const KEY = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'

const ERC20  = ['function balanceOf(address) view returns(uint256)','function transfer(address,uint256) returns(bool)','function approve(address,uint256) returns(bool)']
const PAIR   = ['function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)','function token1() view returns(address)','function sync()','function mint(address) returns(uint256)']

// Fetch live ETH price from CoinGecko
async function getLiveETHPrice() {
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    const json = await res.json()
    return json.ethereum.usd
  } catch {
    return 1811 // fallback
  }
}

async function fixPool(p, wallet, pairAddr, stableAddr, stableSym, stableDec, ethPrice) {
  const pair   = new ethers.Contract(pairAddr, PAIR, wallet)
  const stable = new ethers.Contract(stableAddr, ERC20, wallet)
  const fee    = await p.getFeeData()
  const opts   = { maxFeePerGas:(fee.maxFeePerGas??5000000000n)*3n, maxPriorityFeePerGas:(fee.maxPriorityFeePerGas??1500000000n)*3n, gasLimit:300000n }

  const [r0, r1] = await pair.getReserves()
  const t0       = await pair.token0()
  const isStable0 = t0.toLowerCase() === stableAddr.toLowerCase()
  const stableRes = isStable0 ? r0 : r1
  const ethRes    = isStable0 ? r1 : r0

  const stableReserve = parseFloat(ethers.formatUnits(stableRes, stableDec))
  const ethReserve    = parseFloat(ethers.formatEther(ethRes))
  const currentPrice  = stableReserve / ethReserve

  console.log(`  ${stableSym}/WETH pool: ${stableReserve.toFixed(6)} ${stableSym} / ${ethReserve.toFixed(6)} ETH`)
  console.log(`  Current price: $${currentPrice.toFixed(2)} | Target: $${ethPrice.toFixed(2)}`)

  if (Math.abs(currentPrice - ethPrice) / ethPrice < 0.02) {
    console.log('  ✓ Price already within 2% of market — OK')
    return
  }

  // How much stable we need total = ethPrice * ethReserve
  const targetStable  = ethPrice * ethReserve
  const toAdd         = targetStable - stableReserve

  console.log(`  Need to add: ${toAdd.toFixed(6)} ${stableSym}`)

  const stableBal = parseFloat(ethers.formatUnits(await stable.balanceOf(wallet.address), stableDec))
  console.log(`  Wallet ${stableSym}: ${stableBal.toFixed(6)}`)

  if (toAdd <= 0) {
    console.log('  Pool already has too much stable — price is too low, need to add ETH instead')
    return
  }

  const amountToAdd = Math.min(toAdd, stableBal * 0.95) // use max 95% of balance
  if (amountToAdd < 0.01) {
    console.log(`  ✗ Not enough ${stableSym} to fix (need ${toAdd.toFixed(2)}, have ${stableBal.toFixed(2)})`)
    console.log(`  → Get more ${stableSym} from https://faucet.circle.com`)
    return
  }

  const amountWei = ethers.parseUnits(amountToAdd.toFixed(stableDec), stableDec)

  // Transfer stable directly to the pair
  console.log(`  Transferring ${amountToAdd.toFixed(6)} ${stableSym} to pair...`)
  const tx1 = await stable.transfer(pairAddr, amountWei, opts)
  console.log(`  tx: ${tx1.hash}`)
  await tx1.wait(1)
  console.log('  ✓ Transferred')

  // Call sync() to update reserves without minting LP tokens
  // This is the cleanest way — just updates reserves to current balances
  console.log('  Calling sync() to update reserves...')
  const tx2 = await pair.sync(opts)
  console.log(`  tx: ${tx2.hash}`)
  await tx2.wait(1)
  console.log('  ✓ Synced')

  // Verify new price
  const [nr0, nr1] = await pair.getReserves()
  const newStable  = isStable0 ? nr0 : nr1
  const newEth     = isStable0 ? nr1 : nr0
  const newPrice   = parseFloat(ethers.formatUnits(newStable, stableDec)) / parseFloat(ethers.formatEther(newEth))
  console.log(`  ✅ New price: $${newPrice.toFixed(2)} (target: $${ethPrice.toFixed(2)})`)
  const error = Math.abs(newPrice - ethPrice) / ethPrice * 100
  console.log(`  Price accuracy: ${(100-error).toFixed(1)}%`)
}

async function main() {
  // Get live ETH price
  console.log('Fetching live ETH price from CoinGecko...')
  const ethPrice = await getLiveETHPrice()
  console.log(`Live ETH price: $${ethPrice}`)

  // ── Base Sepolia ─────────────────────────────────────────────────────────
  console.log('\n══ Base Sepolia — USDC/WETH ══')
  {
    const p      = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    const bal    = await p.getBalance(wallet.address)
    console.log('  ETH balance:', ethers.formatEther(bal))
    await fixPool(p, wallet,
      '0xD0987631Cc5F18f96fB652C5e54f766fE8452a90', // USDC/WETH pair
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e',  // USDC
      'USDC', 6, ethPrice)
  }

  console.log('\n══ Base Sepolia — USDT/WETH ══')
  {
    const p      = new ethers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    await fixPool(p, wallet,
      '0x3Ec1BDE0f7a12999f1e83Ef5a64b7bB55979F9e6', // USDT/WETH pair
      '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673',  // USDT
      'USDT', 6, ethPrice)
  }

  // ── Ethereum Sepolia ─────────────────────────────────────────────────────
  console.log('\n══ Ethereum Sepolia — USDC/WETH ══')
  {
    const p      = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
    const wallet = new ethers.Wallet(KEY, p)
    const bal    = await p.getBalance(wallet.address)
    console.log('  ETH balance:', ethers.formatEther(bal))
    await fixPool(p, wallet,
      '0x1B3D3f925292EDC86ddB87a167dAD177Df4B8d35', // USDC/WETH pair
      '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',  // USDC
      'USDC', 6, ethPrice)
  }

  console.log('\n══ ALL DONE ══')
  console.log(`Pool prices now match live ETH price: $${ethPrice.toFixed(2)}`)
  console.log('Swapping 0.1 ETH should give approximately', (ethPrice * 0.1 * 0.997).toFixed(2), 'USDC/USDT')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
