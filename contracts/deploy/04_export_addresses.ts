import * as fs   from 'fs'
import * as path from 'path'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

/**
 * Maps a Hardhat network name to the env-var suffix used in frontend/.env.local
 * e.g.  "sepolia"    → "SEPOLIA"
 *        "bnbTestnet" → "BNB_TESTNET"
 *        "baseSepolia"→ "BASE_SEPOLIA"
 *        "arcTestnet" → "ARC_TESTNET"
 *        "localhost"  → "LOCALHOST"
 *        "hardhat"    → "LOCALHOST"
 */
function networkToEnvKey(networkName: string): string {
  const MAP: Record<string, string> = {
    hardhat:     'LOCALHOST',
    localhost:   'LOCALHOST',
    sepolia:     'SEPOLIA',
    bnbTestnet:  'BNB_TESTNET',
    baseSepolia: 'BASE_SEPOLIA',
    arcTestnet:  'ARC_TESTNET',
  }
  return MAP[networkName] ?? networkName.toUpperCase().replace(/-/g, '_')
}

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, network } = hre
  const { get } = deployments

  const envKey = networkToEnvKey(network.name)

  console.log('─────────────────────────────────────────')
  console.log(`04 · Exporting contract addresses for [${network.name}] → key suffix [${envKey}] …`)

  const factory      = await get('DEXFactory')
  const router       = await get('DEXRouter')
  const weth         = await get('MockWETH')
  const tokenFactory = await get('TokenFactory')

  const envPath = path.resolve(__dirname, '../../frontend/.env.local')
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

  const replacements: Record<string, string> = {
    [`NEXT_PUBLIC_FACTORY_${envKey}`]:       factory.address,
    [`NEXT_PUBLIC_ROUTER_${envKey}`]:        router.address,
    [`NEXT_PUBLIC_TOKEN_FACTORY_${envKey}`]: tokenFactory.address,
    [`NEXT_PUBLIC_WETH_${envKey}`]:          weth.address,
  }

  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`^(${key}=).*$`, 'm')
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `$1${value}`)
    } else {
      envContent += `\n${key}=${value}`
    }
    console.log(`     ${key} → ${value}`)
  }

  fs.writeFileSync(envPath, envContent, 'utf-8')
  console.log('\n     ✓ frontend/.env.local updated')

  // Also write a JSON summary
  const jsonDir  = path.resolve(__dirname, `../deployments/${network.name}`)
  fs.mkdirSync(jsonDir, { recursive: true })
  const jsonPath = path.join(jsonDir, 'addresses.json')
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        network:      network.name,
        chainId:      network.config.chainId,
        factory:      factory.address,
        router:       router.address,
        weth:         weth.address,
        tokenFactory: tokenFactory.address,
      },
      null,
      2,
    ),
  )
  console.log(`     ✓ deployments/${network.name}/addresses.json written`)
}

func.tags     = ['export', 'all']
func.dependencies = ['TokenFactory']
func.runAtTheEnd  = true
export default func
