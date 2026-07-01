import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

/// Deploy DEXFactory — the pair registry that creates all AMM pools
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log('─────────────────────────────────────────')
  log('01 · Deploying DEXFactory …')

  // The feeToSetter starts as the deployer; can be changed post-deployment
  const factory = await deploy('DEXFactory', {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
    waitConfirmations: network.live ? 1 : 0,
  })

  log(`     DEXFactory deployed → ${factory.address}`)
  log(`     feeToSetter         → ${deployer}`)
}

func.tags = ['DEXFactory', 'all']
func.dependencies = ['MockWETH']
export default func
