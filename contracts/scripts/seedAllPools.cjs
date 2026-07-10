/**
 * Seeds ETH/USDC + ETH/USDT pools on Ethereum Sepolia and Base Sepolia.
 * Uses gas estimation so it never hard-codes a limit that causes reverts.
 */
const { ethers } = require('ethers')

const POOLS = [
  // ── Ethereum Sepolia ─────────────────────────────────────────────
  {
    net: 'Ethereum Sepolia', chainId: 11155111,
    rpc:    'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:    '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
    router: '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    weth:   '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
    pairs: [
      { token: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', dec: 6, uAmt: '3', eAmt: '0.001' },
      { token: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', symbol: 'USDT', dec: 6, uAmt: '3', eAmt: '0.001' },
    ],
  },
  // ── Base Sepolia ─────────────────────────────────────────────────
  {
    net: 'Base Sepolia', chainId: 84532,
    rpc:    'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    key:    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    router: '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    weth:   '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
    pairs: [
      { token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', symbol: 'USDC', dec: 6, uAmt: '3', eAmt: '0.001' },
      { token: '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673', symbol: 'USDT', dec: 6, uAmt: '3', eAmt: '0.001' },
    ],
  },
]

const ERC20 = ['function balanceOf(address) view returns(uint256)', 'function approve(address,uint256) returns(bool)', 'function allowance(address,address) view returns(uint256)']
const ROUTER = ['function factory() view returns(address)', 'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)']
const FACTORY = ['function getPair(address,address) view returns(address)', 'function allPairsLength() view returns(uint256)']

async function addPair(wallet, provider, router, factory, weth, pair, fee) {
  const token  = new ethers.Contract(pair.token, ERC20, wallet)
  const uNeed  = ethers.parseUnits(pair.uAmt, pair.dec)
  const eNeed  = ethers.parseEther(pair.eAmt)
  const dl     = BigInt(Math.floor(Date.now() / 1000) + 900)

  // Check if pair already exists
  const existing = await factory.getPair(pair.token, weth)
  if (existing !== '0x0000000000000000000000000000000000000000') {
    console.log(`  ${pair.symbol}/ETH pool already exists: ${existing}`)
    return true
  }

  const uBal = await token.balanceOf(wallet.address)
  console.log(`  ${pair.symbol} balance: ${ethers.formatUnits(uBal, pair.dec)}`)
  if (uBal < uNeed) {
    console.log(`  ✗ Need ${pair.uAmt} ${pair.symbol} — get from faucet.circle.com`)
    return false
  }

  // Approve if needed
  const allow = await token.allowance(wallet.address, router.target)
  const opts  = { maxFeePerGas: (fee.maxFeePerGas ?? 5000000000n) * 2n, maxPriorityFeePerGas: (fee.maxPriorityFeePerGas ?? 1500000000n) * 2n }
  if (allow < uNeed) {
    console.log(`  Approving ${pair.symbol}...`)
    const a = await token.approve(router.target, uNeed, { ...opts, gasLimit: 100000n })
    await a.wait(1)
    console.log('  ✓ Approved')
  }

  // Estimate gas then add 50% buffer
  let gasEst
  try {
    gasEst = await router.addLiquidityETH.estimateGas(pair.token, uNeed, 0n, 0n, wallet.address, dl, { value: eNeed })
    console.log(`  Gas estimate: ${gasEst}`)
  } catch (e) {
    console.log(`  Gas estimate failed: ${e.message.slice(0, 80)}`)
    gasEst = 400000n
  }

  console.log(`  Adding ETH/${pair.symbol} liquidity (${pair.eAmt} ETH + ${pair.uAmt} ${pair.symbol})...`)
  const tx = await router.addLiquidityETH(
    pair.token, uNeed, 0n, 0n, wallet.address, dl,
    { ...opts, gasLimit: gasEst * 15n / 10n, value: eNeed }
  )
  console.log(`  tx: ${tx.hash}`)
  const r = await tx.wait(1)
  console.log(`  ✓ Mined block ${r.blockNumber}`)

  const pairAddr = await factory.getPair(pair.token, weth)
  console.log(`  ✅ ETH/${pair.symbol} pool: ${pairAddr}`)
  return true
}

async function seedNetwork(cfg) {
  console.log('\n' + '═'.repeat(58))
  console.log(cfg.net)
  console.log('═'.repeat(58))

  const p       = new ethers.JsonRpcProvider(cfg.rpc)
  const wallet  = new ethers.Wallet(cfg.key, p)
  const fee     = await p.getFeeData()
  const ethBal  = await p.getBalance(wallet.address)

  console.log('Wallet :', wallet.address)
  console.log('ETH    :', ethers.formatEther(ethBal))

  const router  = new ethers.Contract(cfg.router, ROUTER, wallet)
  const factAddr= await router.factory()
  const factory = new ethers.Contract(factAddr, FACTORY, p)
  const pairsBefore = await factory.allPairsLength()
  console.log('Pools  :', pairsBefore.toString())

  for (const pair of cfg.pairs) {
    try {
      await addPair(wallet, p, router, factory, cfg.weth, pair, fee)
    } catch (e) {
      console.log(`  ✗ ${pair.symbol}: ${e.message.slice(0, 150)}`)
    }
  }

  const pairsAfter = await factory.allPairsLength()
  console.log('\nTotal pools after:', pairsAfter.toString())
}

async function main() {
  for (const cfg of POOLS) {
    try { await seedNetwork(cfg) }
    catch (e) { console.log('Network error:', e.message.slice(0, 100)) }
  }
  console.log('\n' + '═'.repeat(58))
  console.log('Done — open /swap to trade ETH/USDC or ETH/USDT')
  console.log('═'.repeat(58))
}

main().catch(console.error)
