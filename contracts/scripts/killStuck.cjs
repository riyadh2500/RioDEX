// Definitively replace the stuck tx using the PUBLIC ARC RPC
// (avoids any Alchemy-specific mempool filtering)
const { ethers } = require('ethers')

async function main() {
  // Use the PUBLIC RPC — Alchemy may be caching/filtering replacements
  const rpc  = 'https://rpc.testnet.arc.network'
  const key  = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet   = new ethers.Wallet(key, provider)

  const confirmed = await provider.getTransactionCount(wallet.address, 'latest')
  const pending   = await provider.getTransactionCount(wallet.address, 'pending')
  const fee       = await provider.getFeeData()

  console.log('Address  :', wallet.address)
  console.log('Confirmed:', confirmed, '| Pending:', pending)
  console.log('Network gasPrice:', fee.gasPrice?.toString())

  if (pending <= confirmed) {
    console.log('No stuck tx — mempool is clear!')
    return
  }

  // Must exceed 202000000000 (our last forceReplace gasPrice)
  // Use 500 gwei to guarantee acceptance
  const gasPrice = BigInt('500000000000')
  console.log('Sending replacement at nonce', confirmed, 'gasPrice', gasPrice.toString())

  const tx = await wallet.sendTransaction({
    to:       wallet.address,
    value:    0n,
    nonce:    confirmed,
    gasLimit: 21000n,
    gasPrice,
    chainId:  5042002,
  })

  console.log('Replacement tx:', tx.hash)
  console.log('Waiting for confirmation...')

  // Poll manually since .wait() can hang
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const r = await provider.getTransactionReceipt(tx.hash).catch(() => null)
    const c = await provider.getTransactionCount(wallet.address, 'latest')
    const p = await provider.getTransactionCount(wallet.address, 'pending')
    process.stdout.write(`  [${i+1}] confirmed=${c} pending=${p}\r`)
    if (r) {
      console.log('\n✓ Mined in block', r.blockNumber, '| Status:', r.status === 1 ? 'OK' : 'FAILED')
      console.log('Mempool clear — ready to deploy!')
      return
    }
    if (p <= c) {
      console.log('\n✓ Pending count dropped — mempool appears clear!')
      return
    }
  }
  console.log('\nTimed out — tx may still be pending')
}

main().catch(e => { console.error(e.message); process.exit(1) })
