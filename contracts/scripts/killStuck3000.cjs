const { ethers } = require('ethers')

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network')
  const wallet   = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider)

  const confirmed = await provider.getTransactionCount(wallet.address, 'latest')
  const pending   = await provider.getTransactionCount(wallet.address, 'pending')
  console.log('confirmed:', confirmed, 'pending:', pending)

  if (pending <= confirmed) { console.log('Clear!'); return }

  // 3000 gwei — must beat the highest stuck tx (deployARC used 250 gwei * 10 = 2500 gwei)
  const gwei3000 = BigInt('3000000000000')

  const tx = await wallet.sendTransaction({
    to: wallet.address, value: 0n,
    nonce: confirmed, gasLimit: 21000n,
    maxFeePerGas: gwei3000, maxPriorityFeePerGas: gwei3000,
    chainId: 5042002, type: 2,
  })
  console.log('hash:', tx.hash)

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const r  = await provider.getTransactionReceipt(tx.hash).catch(() => null)
    const c  = await provider.getTransactionCount(wallet.address, 'latest')
    const p  = await provider.getTransactionCount(wallet.address, 'pending')
    process.stdout.write(`\r  [${i+1}] c=${c} p=${p}   `)
    if (r) { console.log('\n✓ Mined block', r.blockNumber); return }
    if (p <= c) { console.log('\n✓ Clear!'); return }
  }
  console.log('\nTimeout')
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
