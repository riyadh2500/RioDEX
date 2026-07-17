const { ethers } = require('ethers')

const WALLET  = '0x575D7EF206B5649b1185034C74f9fBE61b0B00B3'
const ERC20   = ['function balanceOf(address) view returns(uint256)']

const NETS = [
  {
    name: 'Ethereum Sepolia',
    rpc:  'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    usdt: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
  },
  {
    name: 'Base Sepolia',
    rpc:  'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdt: '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673',
  },
]

async function main() {
  for (const net of NETS) {
    const p = new ethers.JsonRpcProvider(net.rpc)
    const usdc = new ethers.Contract(net.usdc, ERC20, p)
    const usdt = new ethers.Contract(net.usdt, ERC20, p)
    const [eth, u, t] = await Promise.all([
      p.getBalance(WALLET),
      usdc.balanceOf(WALLET),
      usdt.balanceOf(WALLET),
    ])
    console.log(`\n── ${net.name} ──`)
    console.log(`ETH:  ${ethers.formatEther(eth)}`)
    console.log(`USDC: ${ethers.formatUnits(u, 6)}`)
    console.log(`USDT: ${ethers.formatUnits(t, 6)}`)
  }
}
main().catch(console.error)
