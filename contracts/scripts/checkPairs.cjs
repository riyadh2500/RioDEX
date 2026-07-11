const { ethers } = require('ethers')

const PAIR_ABI     = ['function token0() view returns(address)','function token1() view returns(address)','function getReserves() view returns(uint112,uint112,uint32)']
const FACTORY_ABI  = ['function allPairsLength() view returns(uint256)','function allPairs(uint256) view returns(address)']
const ERC20_ABI    = ['function symbol() view returns(string)','function decimals() view returns(uint8)']

const NETS = [
  { name:'Ethereum Sepolia', rpc:'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-', factory:'0xbB1fFC22407c5E6e94fc3e121bD98b77aD74c35F', weth:'0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E' },
  { name:'Base Sepolia',     rpc:'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-', factory:'0xdbe19C3FE350fB7Da84200D5866E9A61D7946674', weth:'0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a' },
  { name:'ARC Testnet',      rpc:'https://rpc.testnet.arc.network', factory:'0xf274De14171Ab928A5Ec19928cE35FaD91a42B64', weth:'0x889D9A5AF83525a2275e41464FAECcCb3337fF60' },
]

async function main() {
  for (const net of NETS) {
    console.log('\n══', net.name, '══')
    const p = new ethers.JsonRpcProvider(net.rpc)
    const f = new ethers.Contract(net.factory, FACTORY_ABI, p)
    const count = await f.allPairsLength()
    console.log('  Pairs:', count.toString())
    for (let i = 0; i < Number(count); i++) {
      const pairAddr = await f.allPairs(i)
      const pair     = new ethers.Contract(pairAddr, PAIR_ABI, p)
      const [t0, t1, reserves] = await Promise.all([pair.token0(), pair.token1(), pair.getReserves()])
      const tok0 = new ethers.Contract(t0, ERC20_ABI, p)
      const tok1 = new ethers.Contract(t1, ERC20_ABI, p)
      const [s0, d0, s1, d1] = await Promise.all([tok0.symbol(), tok0.decimals(), tok1.symbol(), tok1.decimals()])
      const r0 = ethers.formatUnits(reserves[0], d0)
      const r1 = ethers.formatUnits(reserves[1], d1)
      const isWETHPair = t0.toLowerCase()===net.weth.toLowerCase() || t1.toLowerCase()===net.weth.toLowerCase()
      console.log(`  [${i}] ${s0}/${s1}`)
      console.log(`      addr:     ${pairAddr}`)
      console.log(`      token0:   ${t0} (${s0})`)
      console.log(`      token1:   ${t1} (${s1})`)
      console.log(`      reserves: ${r0} ${s0} | ${r1} ${s1}`)
      console.log(`      hasWETH:  ${isWETHPair}`)
    }
  }
}
main().catch(console.error)
