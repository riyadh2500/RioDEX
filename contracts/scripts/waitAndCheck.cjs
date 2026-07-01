const { ethers } = require('ethers')

async function main() {
  const rpc  = 'https://arc-testnet.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'
  const addr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  const hash = '0xaad207ccfa59d05a6900f4cb33dbfc4c747e0c3c753b5acd2965e9886434d068'

  const provider = new ethers.JsonRpcProvider(rpc)

  console.log('Waiting for cancel tx to mine (polling every 3s)...')
  let mined = false
  for (let i = 0; i < 40; i++) {
    const receipt = await provider.getTransactionReceipt(hash).catch(() => null)
    if (receipt && receipt.blockNumber) {
      console.log('✓ Cancel tx mined in block', receipt.blockNumber)
      mined = true
      break
    }
    const confirmed = await provider.getTransactionCount(addr, 'latest')
    const pending   = await provider.getTransactionCount(addr, 'pending')
    console.log(`  attempt ${i+1}: confirmed=${confirmed} pending=${pending}`)
    await new Promise(r => setTimeout(r, 3000))
  }

  if (!mined) {
    console.log('Tx not yet mined after 2 minutes.')
    return
  }

  const confirmed = await provider.getTransactionCount(addr, 'latest')
  const pending   = await provider.getTransactionCount(addr, 'pending')
  console.log('Final state — confirmed:', confirmed, 'pending:', pending)

  if (pending > confirmed) {
    console.log('Still has pending tx — run clearStuckTx.cjs again')
  } else {
    console.log('✓ Mempool is clear — ready to deploy!')
  }
}

main().catch(e => { console.error(e.message); process.exit(1) })
