/**
 * Finds the exact gasPrice of the stuck pending tx by scanning recent
 * known tx hashes, then sends a replacement at gasPrice * 1.15 + 1.
 */
const { ethers } = require('ethers')

const RPCS = [
  'https://rpc.testnet.arc.network',
  'https://arc-testnet.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
]
const KEY     = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const CHAIN   = 5042002
const ADDR    = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

// All tx hashes we've ever sent at nonce 556
const CANDIDATE_HASHES = [
  '0xaad207ccfa59d05a6900f4cb33dbfc4c747e0c3c753b5acd2965e9886434d068',
  '0xb0661b2a2c32f09ac1b5cd3f4c4baa160448fe172b0974c9a3d0044ab6b22d3f',
  '0x0dfc5a974dcb5e61ca5543de59d17c7c7a95507a300c4260d144a5cd592bbfc1',
]

async function getProvider() {
  for (const rpc of RPCS) {
    try {
      const p = new ethers.JsonRpcProvider(rpc)
      await p.getBlockNumber()
      console.log('Using RPC:', rpc)
      return p
    } catch { /* try next */ }
  }
  throw new Error('No RPC available')
}

async function main() {
  const provider = await getProvider()
  const wallet   = new ethers.Wallet(KEY, provider)

  const confirmed = await provider.getTransactionCount(ADDR, 'latest')
  const pending   = await provider.getTransactionCount(ADDR, 'pending')
  const feeData   = await provider.getFeeData()

  console.log(`confirmed=${confirmed} pending=${pending}`)
  console.log(`network gasPrice=${feeData.gasPrice?.toString()}`)

  if (pending <= confirmed) {
    console.log('Mempool clear — ready to deploy!')
    return
  }

  // Try to find the stuck tx and get its gasPrice
  let stuckGasPrice = BigInt(0)
  for (const hash of CANDIDATE_HASHES) {
    try {
      const raw = await provider.send('eth_getTransactionByHash', [hash])
      if (raw && raw.hash) {
        const gp = raw.maxFeePerGas
          ? BigInt(raw.maxFeePerGas)
          : raw.gasPrice
          ? BigInt(raw.gasPrice)
          : BigInt(0)
        console.log(`Found pending tx ${hash.slice(0, 14)} gasPrice=${gp}`)
        if (gp > stuckGasPrice) stuckGasPrice = gp
      }
    } catch { /* not found */ }
  }

  if (stuckGasPrice === BigInt(0)) {
    // Can't find the tx directly — try binary search starting at current * 50x
    stuckGasPrice = (feeData.gasPrice ?? BigInt('20200000000')) * 100n
    console.log(`Tx not directly found — using estimated gasPrice=${stuckGasPrice}`)
  }

  // Replacement must be >= stuck * 1.10 + 1 (EIP-1559 rule)
  const replacement = stuckGasPrice * 115n / 100n + BigInt(1)
  console.log(`Sending replacement at gasPrice=${replacement} (115% of stuck ${stuckGasPrice})`)

  // Send as legacy type 0 to avoid EIP-1559 complications
  const tx = await wallet.sendTransaction({
    to:       ADDR,
    value:    0n,
    nonce:    confirmed,
    gasLimit: 21000n,
    gasPrice: replacement,
    chainId:  CHAIN,
    type:     0,
  })

  console.log('Replacement hash:', tx.hash)

  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const receipt = await provider.getTransactionReceipt(tx.hash).catch(() => null)
    const c  = await provider.getTransactionCount(ADDR, 'latest')
    const p  = await provider.getTransactionCount(ADDR, 'pending')
    process.stdout.write(`\r  [${i+1}] c=${c} p=${p}   `)
    if (receipt) {
      console.log(`\n✓ Mined block ${receipt.blockNumber} — CLEAR!`)
      return
    }
    if (p <= c) {
      console.log('\n✓ Pending dropped to 0 — CLEAR!')
      return
    }
  }
  console.log('\nTimed out')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
