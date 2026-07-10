const { ethers } = require('ethers')

async function main() {
  const p      = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-')
  const wallet = new ethers.Wallet('0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4', p)

  const ROUTER = '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e'
  const USDC   = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  const WETH   = '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E'

  const routerABI = [
    'function addLiquidityETH(address token,uint256 amountTokenDesired,uint256 amountTokenMin,uint256 amountETHMin,address to,uint256 deadline) payable returns(uint256,uint256,uint256)',
    'function factory() view returns(address)',
    'function WETH() view returns(address)',
  ]
  const erc20ABI  = ['function allowance(address,address) view returns(uint256)', 'function balanceOf(address) view returns(uint256)']
  const factoryABI= ['function getPair(address,address) view returns(address)']

  const router  = new ethers.Contract(ROUTER, routerABI, wallet)
  const usdc    = new ethers.Contract(USDC,   erc20ABI,  p)

  const routerWETH    = await router.WETH()
  const routerFactory = await router.factory()
  const allowance     = await usdc.allowance(wallet.address, ROUTER)
  const usdcBal       = await usdc.balanceOf(wallet.address)
  const ethBal        = await p.getBalance(wallet.address)

  console.log('Router WETH    :', routerWETH)
  console.log('Configured WETH:', WETH)
  console.log('WETH match     :', routerWETH.toLowerCase() === WETH.toLowerCase())
  console.log('Allowance USDC :', ethers.formatUnits(allowance, 6))
  console.log('USDC balance   :', ethers.formatUnits(usdcBal, 6))
  console.log('ETH balance    :', ethers.formatEther(ethBal))

  // Try eth_call to get the revert reason
  const factory   = new ethers.Contract(routerFactory, factoryABI, p)
  const pairAddr  = await factory.getPair(USDC, routerWETH)
  console.log('Existing pair  :', pairAddr)

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
  const usdcAmt  = ethers.parseUnits('3', 6)
  const ethAmt   = ethers.parseEther('0.001')

  try {
    const result = await router.addLiquidityETH.staticCall(
      USDC, usdcAmt, 0n, 0n, wallet.address, deadline,
      { value: ethAmt }
    )
    console.log('staticCall SUCCESS:', result)
  } catch (e) {
    console.log('staticCall REVERT:', e.message.slice(0, 300))
    if (e.data) console.log('revert data:', e.data)
  }
}
main().catch(console.error)
