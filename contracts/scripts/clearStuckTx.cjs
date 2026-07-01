const { ethers } = require('ethers')

async function main() {
  const rpc = 'https://arc-testnet.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-'
  const key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet   = new ethers.Wallet(key, provider)

  const confirmed = await provider.getTransactionCount(wallet.address, 'latest')
  const pending   = await provider.getTransactionCount(wallet.address, 'pending')

  console.log('Address:', wallet.address)
  console.log('Confirmed nonce:', confirmed)
  console.log('Pending nonce:', pending)

  if (pending <= confirmed) {
    console.log('No stuck transactions — nothing to clear.')
    return
  }

  // Replace the stuck tx: send 0-value to self at the same nonce with 2x gas
  const feeData = await provider.getFeeData()
  const gasPrice = feeData.gasPrice ? feeData.gasPrice * 2n : BigInt(2_000_000)

  console.log('Sending cancel tx at nonce', confirmed, 'with gasPrice', gasPrice.toString())

  const tx = await wallet.sendTransaction({
    to:       wallet.address,
    value:    0n,
    nonce:    confirmed,
    gasLimit: 21000n,
    gasPrice,
  })

  console.log('Cancel tx hash:', tx.hash)
  const receipt = await tx.wait()
  console.log('Confirmed in block:', receipt.blockNumber)
  console.log('Stuck transaction cleared!')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
