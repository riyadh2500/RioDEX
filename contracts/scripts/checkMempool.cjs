const { ethers } = require('ethers')

async function main() {
  const pub  = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network')
  const addr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

  const c  = await pub.getTransactionCount(addr, 'latest')
  const pd = await pub.getTransactionCount(addr, 'pending')
  console.log('confirmed:', c, 'pending:', pd)

  // try txpool_content
  const content = await pub.send('txpool_content', []).catch(() => null)
  if (content && content.pending) {
    const mine = content.pending[addr] || content.pending[addr.toLowerCase()]
    if (mine) {
      console.log('Found in txpool_content:')
      for (const [nonce, tx] of Object.entries(mine)) {
        const maxFee = tx.maxFeePerGas ? BigInt(tx.maxFeePerGas).toString() : tx.gasPrice ? BigInt(tx.gasPrice).toString() : 'unknown'
        console.log('  nonce', nonce, 'maxFeePerGas:', maxFee, 'gasLimit:', tx.gas)
      }
      return
    }
    console.log('Not in txpool_content pending')
  } else {
    console.log('txpool_content not available')
  }

  // try txpool_inspect
  const inspect = await pub.send('txpool_inspect', []).catch(() => null)
  if (inspect && inspect.pending) {
    const mine = inspect.pending[addr] || inspect.pending[addr.toLowerCase()]
    if (mine) { console.log('txpool_inspect:', JSON.stringify(mine)); return }
    console.log('Not in txpool_inspect')
  }

  // Check recent known hashes
  const hashes = [
    '0x0dfc5a974dcb5e61ca5543de59d17c7c7a95507a300c4260d144a5cd592bbfc1',
    '0xb0661b2a2c32f09ac1b5cd3f4c4baa160448fe172b0974c9a3d0044ab6b22d3f',
    '0xaad207ccfa59d05a6900f4cb33dbfc4c747e0c3c753b5acd2965e9886434d068',
  ]
  for (const h of hashes) {
    const tx = await pub.send('eth_getTransactionByHash', [h]).catch(() => null)
    if (tx) {
      const fee = tx.maxFeePerGas ? BigInt(tx.maxFeePerGas).toString() : tx.gasPrice ? BigInt(tx.gasPrice).toString() : 'unknown'
      console.log('Found:', h.slice(0, 14), 'nonce:', parseInt(tx.nonce, 16), 'fee:', fee, 'block:', tx.blockNumber)
    } else {
      console.log('Not found:', h.slice(0, 14))
    }
  }
}
main().catch(console.error)
