// Force-replace the stuck pending tx at nonce 556 with a much higher gasPrice
// ARC uses USDC as gas — gasPrice is in USDC wei (6 decimals)
const { ethers } = require('ethers')

async function main() {
  const rpc = 'https://arc-testnet.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'
  const key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet   = new ethers.Wallet(key, provider)

  const confirmed = await provider.getTransactionCount(wallet.address, 'latest')
  const pending   = await provider.getTransactionCount(wallet.address, 'pending')
  console.log('Confirmed nonce:', confirmed, '| Pending nonce:', pending)

  if (pending <= confirmed) {
    console.log('No stuck tx — already clear!')
    return
  }

  const feeData = await provider.getFeeData()
  console.log('Current gasPrice:', feeData.gasPrice?.toString())

  // Use 10x the current gasPrice to guarantee replacement
  const gasPrice = feeData.gasPrice
    ? feeData.gasPrice * 10n
    : BigInt('500000000000') // 500 gwei fallback

  console.log('Replacing with gasPrice:', gasPrice.toString(), '(10x current)')

  const tx = await wallet.sendTransaction({
    to:       wallet.address,
    value:    0n,
    nonce:    confirmed,       // same nonce as the stuck tx
    gasLimit: 21000n,
    gasPrice,
  })

  console.log('Replacement tx hash:', tx.hash)
  console.log('Waiting for confirmation...')

  const receipt = await tx.wait(1)
  console.log('✓ Confirmed in block', receipt.blockNumber)
  console.log('Mempool is now clear — ready to deploy!')
}

main().catch(e => { console.error(e.message); process.exit(1) })
