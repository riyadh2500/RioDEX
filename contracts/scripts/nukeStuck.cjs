/**
 * Nuclear option — sends replacement at 1,000,000 gwei.
 * If this fails, the ARC node itself is broken for this address.
 */
const { ethers } = require('ethers')

const KEY   = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const ADDR  = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const CHAIN = 5042002

const PRICES_TO_TRY = [
  BigInt('5000000000000'),      // 5,000 gwei
  BigInt('10000000000000'),     // 10,000 gwei
  BigInt('50000000000000'),     // 50,000 gwei
  BigInt('100000000000000'),    // 100,000 gwei
  BigInt('1000000000000000'),   // 1,000,000 gwei
]

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network')
  const wallet   = new ethers.Wallet(KEY, provider)

  const confirmed = await provider.getTransactionCount(ADDR, 'latest')
  const pending   = await provider.getTransactionCount(ADDR, 'pending')
  console.log(`confirmed=${confirmed} pending=${pending}`)

  if (pending <= confirmed) { console.log('Already clear!'); return }

  for (const gasPrice of PRICES_TO_TRY) {
    console.log(`\nTrying gasPrice=${gasPrice} (${(gasPrice / BigInt('1000000000')).toString()} gwei)...`)
    try {
      const tx = await wallet.sendTransaction({
        to: ADDR, value: 0n,
        nonce: confirmed, gasLimit: 21000n,
        gasPrice, chainId: CHAIN, type: 0,
      })
      console.log('Accepted! hash:', tx.hash)

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const r = await provider.getTransactionReceipt(tx.hash).catch(() => null)
        const c = await provider.getTransactionCount(ADDR, 'latest')
        const p = await provider.getTransactionCount(ADDR, 'pending')
        process.stdout.write(`\r  [${i+1}] c=${c} p=${p}   `)
        if (r) { console.log(`\n✓ Mined block ${r.blockNumber} — CLEAR!`); return }
        if (p <= c) { console.log('\n✓ Pending dropped — CLEAR!'); return }
      }
      return
    } catch (e) {
      if (e.message.includes('underpriced') || e.message.includes('already known')) {
        console.log(`  Rejected: ${e.message.slice(0, 80)}`)
        continue
      }
      throw e
    }
  }
  console.log('\nAll prices rejected — ARC node has blacklisted this address.')
  console.log('You must use a DIFFERENT wallet to deploy to ARC.')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
