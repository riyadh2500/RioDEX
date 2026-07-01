import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

/// Deploy MockWETH — used as the native-currency wrapper on local networks
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log('─────────────────────────────────────────')
  log('00 · Deploying MockWETH …')

  const weth = await deploy('MockWETH', {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    waitConfirmations: network.live ? 1 : 0,
  })

  log(`     MockWETH deployed → ${weth.address}`)
}

func.tags = ['MockWETH', 'all']
export default func
