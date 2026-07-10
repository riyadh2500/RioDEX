const { ethers } = require('ethers')

const NETWORKS = [
  {
    name: 'Ethereum Sepolia',
    rpc:     'https://eth-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    factory: '0xbB1fFC22407c5E6e94fc3e121bD98b77aD74c35F',
    router:  '0xb0AF2E1E3B6eb3ABFF90f4dA7529c276233d815e',
    weth:    '0xDd29CBe35Cc7cF79FEe85008E9fcB12b4972212E',
  },
  {
    name: 'Base Sepolia',
    rpc:     'https://base-sepolia.g.alchemy.com/v2/BbpNv394mOl1_uwH_8c9h7I-9jYZ6b2-',
    factory: '0xdbe19C3FE350fB7Da84200D5866E9A61D7946674',
    router:  '0x54FaF60Ee37D56262f99772427FEca1a8a3645A5',
    weth:    '0x9e892FA6fF95eF10988e3c9Da7c53E5dE105C26a',
  },
  {
    name: 'ARC Testnet',
    rpc:     'https://rpc.testnet.arc.network',
    factory: '0xf274De14171Ab928A5Ec19928cE35FaD91a42B64',
    router:  '0xcb0A9835CDf63c84FE80Fcc59d91d7505871c98B',
    weth:    '0x889D9A5AF83525a2275e41464FAECcCb3337fF60',
  },
]

const FACTORY_ABI = [
  'function allPairsLength() view returns (uint256)',
]
const ROUTER_ABI = [
  'function factory() view returns (address)',
  'function WETH() view returns (address)',
]

async function check(net) {
  console.log('\n' + '─'.repeat(50))
  console.log(net.name)
  console.log('─'.repeat(50))
  try {
    const p       = new ethers.JsonRpcProvider(net.rpc)
    const block   = await p.getBlockNumber()
    console.log('  Block:     ', block)

    const router  = new ethers.Contract(net.router,  ROUTER_ABI,  p)
    const factory = new ethers.Contract(net.factory, FACTORY_ABI, p)

    const rFactory = await router.factory()
    const rWETH    = await router.WETH()
    const pairs    = await factory.allPairsLength()

    console.log('  Pairs:     ', pairs.toString())
    console.log('  Router →   factory:', rFactory)
    console.log('  Router →   WETH:   ', rWETH)
    console.log('  Factory match:', rFactory.toLowerCase() === net.factory.toLowerCase() ? '✓ OK' : '✗ MISMATCH')
    console.log('  WETH match:   ', rWETH.toLowerCase()    === net.weth.toLowerCase()    ? '✓ OK' : '✗ MISMATCH')

    if (pairs > 0n) {
      console.log('\n  ⚠ Pairs exist — swap SHOULD work after liquidity check')
    } else {
      console.log('\n  ✗ NO POOLS — you must add liquidity first before swapping')
      console.log('    → Go to /liquidity/add, pick two tokens, deposit them')
    }
  } catch (e) {
    console.log('  ERROR:', e.message.slice(0, 120))
  }
}

async function main() {
  for (const net of NETWORKS) await check(net)
  console.log('\n' + '═'.repeat(50))
  console.log('DIAGNOSIS COMPLETE')
  console.log('═'.repeat(50))
}

main().catch(console.error)
