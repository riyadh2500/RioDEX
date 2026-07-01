import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

/// Deploy DEXRouter — the user-facing swap & liquidity contract
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy, get, log } = deployments
  const { deployer } = await getNamedAccounts()

  const factory = await get('DEXFactory')
  const weth    = await get('MockWETH')

  log('─────────────────────────────────────────')
  log('02 · Deploying DEXRouter …')
  log(`     factory → ${factory.address}`)
  log(`     WETH    → ${weth.address}`)

  const router = await deploy('DEXRouter', {
    from: deployer,
    args: [factory.address, weth.address],
    log: true,
    autoMine: true,
    waitConfirmations: network.live ? 1 : 0,
  })

  log(`     DEXRouter deployed → ${router.address}`)
}

func.tags = ['DEXRouter', 'all']
func.dependencies = ['DEXFactory', 'MockWETH']
export default func
