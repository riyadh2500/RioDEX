/** Swap ETH → USDC on Sepolia to get more USDC for rebalancing */
const { ethers } = require('ethers')

const NET = {
  rpc:    'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
  key:    '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4',
  router: '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
  usdc:   '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  weth:   '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
}

const ROUTER_ABI = [
  'function swapExactETHForTokens(uint256,address[],address,uint256) payable returns(uint256[])',
]
const ERC20_ABI = ['function balanceOf(address) view returns(uint256)']

async function main() {
  const provider = new ethers.JsonRpcProvider(NET.rpc)
  const wallet   = new ethers.Wallet(NET.key, provider)
  const feeData  = await provider.getFeeData()
  const router   = new ethers.Contract(NET.router, ROUTER_ABI, wallet)
  const usdc     = new ethers.Contract(NET.usdc, ERC20_ABI, provider)

  const ethBal = await provider.getBalance(wallet.address)
  console.log('ETH balance:', ethers.formatEther(ethBal))

  // Swap 0.05 ETH → USDC (at current bad price ~1324, gets ~66 USDC)
  const ethIn = ethers.parseEther('0.05')
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 900)
  const txOpts = {
    maxFeePerGas:         (feeData.maxFeePerGas         ?? 5_000_000_000n) * 3n,
    maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 1_500_000_000n) * 3n,
    gasLimit: 300_000n,
    value: ethIn,
  }

  console.log('Swapping 0.05 ETH → USDC...')
  const tx = await router.swapExactETHForTokens(
    0n, [NET.weth, NET.usdc], wallet.address, deadline, txOpts,
  )
  console.log('tx:', tx.hash)
  await tx.wait(1)

  const newBal = await usdc.balanceOf(wallet.address)
  console.log('New USDC balance:', ethers.formatUnits(newBal, 6))
}

main().catch(console.error)
