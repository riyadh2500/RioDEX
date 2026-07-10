const { ethers } = require('ethers')

const KEY  = '0xa956f55ce4ad076af920c194f53e241810c1c68c1f39870876d40656f6af97a4'
const ERC20 = ['function balanceOf(address) view returns(uint256)','function symbol() view returns(string)','function decimals() view returns(uint8)']

const NETWORKS = [
  {
    name: 'Ethereum Sepolia', chainId: 11155111,
    rpc: 'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    tokens: [
      { addr: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', sym: 'USDC' },
      { addr: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', sym: 'USDT' },
    ],
    factory: '0xbB1fFC22407c5E6e94fc3e121bD98b77aD74c35F',
  },
  {
    name: 'Base Sepolia', chainId: 84532,
    rpc: 'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    tokens: [
      { addr: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', sym: 'USDC' },
      { addr: '0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673', sym: 'USDT' },
    ],
    factory: '0xdbe19C3FE350fB7Da84200D5866E9A61D7946674',
  },
  {
    name: 'ARC Testnet', chainId: 5042002,
    rpc: 'https://rpc.testnet.arc.network',
    tokens: [
      { addr: '0x3600000000000000000000000000000000000000', sym: 'USDC' },
      { addr: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', sym: 'EURC' },
    ],
    factory: '0xf274De14171Ab928A5Ec19928cE35FaD91a42B64',
  },
]

const FACTORY_ABI = ['function allPairsLength() view returns(uint256)','function getPair(address,address) view returns(address)']

async function main() {
  const wallet = new ethers.Wallet(KEY)
  console.log('Wallet:', wallet.address)

  for (const net of NETWORKS) {
    console.log('\n══ ' + net.name + ' ══')
    const p = new ethers.JsonRpcProvider(net.rpc)

    const native = await p.getBalance(wallet.address)
    console.log('  Native:', ethers.formatEther(native), net.name.includes('ARC') ? 'USDC' : 'ETH')

    for (const tok of net.tokens) {
      try {
        const c = new ethers.Contract(tok.addr, ERC20, p)
        const [b, d] = await Promise.all([c.balanceOf(wallet.address), c.decimals()])
        console.log(' ', tok.sym + ':', ethers.formatUnits(b, d))
      } catch { console.log(' ', tok.sym + ': error') }
    }

    try {
      const f = new ethers.Contract(net.factory, FACTORY_ABI, p)
      const cnt = await f.allPairsLength()
      console.log('  Pools:', cnt.toString())
    } catch { console.log('  Pools: error') }
  }
}
main().catch(console.error)
