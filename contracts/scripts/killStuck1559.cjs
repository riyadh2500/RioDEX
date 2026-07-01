/**
 * Replace stuck pending tx using EIP-1559 fields (type 2).
 * ARC Testnet uses EIP-1559 — maxFeePerGas must be ≥ 110% of stuck tx's maxFeePerGas.
 */
const { ethers } = require('ethers')

async function main() {
  const rpc = 'https://rpc.testnet.arc.network'
  const key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet   = new ethers.Wallet(key, provider)

  const confirmed = await provider.getTransactionCount(wallet.address, 'latest')
  const pending   = await provider.getTransactionCount(wallet.address, 'pending')
  const feeData   = await provider.getFeeData()

  console.log('Address  :', wallet.address)
  console.log('Confirmed:', confirmed, '| Pending:', pending)
  console.log('baseFee  :', feeData.gasPrice?.toString())
  console.log('maxFee   :', feeData.maxFeePerGas?.toString())
  console.log('priority :', feeData.maxPriorityFeePerGas?.toString())

  if (pending <= confirmed) {
    console.log('Mempool is clear — no stuck tx!')
    return
  }

  // Use 20x the current maxFeePerGas to guarantee replacement
  const base      = feeData.maxFeePerGas   ?? BigInt('20200000000')
  const priority  = feeData.maxPriorityFeePerGas ?? BigInt('20200000000')
  const maxFee    = base * 20n
  const maxPrio   = priority * 20n

  console.log('\nSending EIP-1559 replacement:')
  console.log('  nonce        :', confirmed)
  console.log('  maxFeePerGas :', maxFee.toString())
  console.log('  maxPriority  :', maxPrio.toString())

  const tx = await wallet.sendTransaction({
    to:                   wallet.address,
    value:                0n,
    nonce:                confirmed,
    gasLimit:             21000n,
    maxFeePerGas:         maxFee,
    maxPriorityFeePerGas: maxPrio,
    chainId:              5042002,
    type:                 2,
  })

  console.log('\nReplacement tx hash:', tx.hash)
  console.log('Polling for confirmation...')

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const c  = await provider.getTransactionCount(wallet.address, 'latest')
    const pd = await provider.getTransactionCount(wallet.address, 'pending')
    process.stdout.write(`\r  [${i + 1}] confirmed=${c} pending=${pd}   `)
    const receipt = await provider.getTransactionReceipt(tx.hash).catch(() => null)
    if (receipt) {
      console.log('\n✓ Mined in block', receipt.blockNumber)
      console.log('Mempool clear — ready to deploy!')
      return
    }
    if (pd <= c) {
      console.log('\n✓ Pending count dropped to 0 — mempool clear!')
      return
    }
  }
  console.log('\nTimed out after 2 min.')
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1) })
