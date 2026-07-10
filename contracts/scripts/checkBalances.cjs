const { ethers } = require('ethers')

const ERC20 = ['function balanceOf(address) view returns(uint256)', 'function decimals() view returns(uint8)']

const checks = [
  {
    name: 'Ethereum Sepolia',
    rpc:  'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    addr: '0x575D7EF206B5649b1185034C74f9fBE61b0B00B3',
    tokens: [
      { symbol: 'USDC-new', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
      { symbol: 'USDC-old', address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' },
    ],
  },
  {
    name: 'Base Sepolia',
    rpc:  'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    addr: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    tokens: [
      { symbol: 'USDC', address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' },
    ],
  },
]

async function main() {
  for (const net of checks) {
    const p    = new ethers.JsonRpcProvider(net.rpc)
    const eth  = await p.getBalance(net.addr)
    console.log('\n' + net.name + ' — ' + net.addr)
    console.log('  ETH:', ethers.formatEther(eth))
    for (const tok of net.tokens) {
      try {
        const c = new ethers.Contract(tok.address, ERC20, p)
        const b = await c.balanceOf(net.addr)
        const d = await c.decimals()
        console.log(' ', tok.symbol + ':', ethers.formatUnits(b, d), '(' + tok.address + ')')
      } catch { console.log(' ', tok.symbol + ': error reading') }
    }
  }
}
main().catch(console.error)
