import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { parseEther } from 'ethers'

/// Deploy TokenFactory — lets users launch their own ERC-20 tokens for a fee
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  // Creation fee: 0.5 ETH on localhost (matches NEXT_PUBLIC_TOKEN_CREATION_FEE_ETH in .env.local)
  const creationFee = parseEther('0.5')
  // Fee receiver defaults to deployer; change post-deployment via setFeeReceiver()
  const feeReceiver = deployer

  log('─────────────────────────────────────────')
  log('03 · Deploying TokenFactory …')
  log(`     creationFee → ${creationFee.toString()} wei  (0.5 ETH)`)
  log(`     feeReceiver → ${feeReceiver}`)

  const tokenFactory = await deploy('TokenFactory', {
    from: deployer,
    args: [creationFee, feeReceiver],
    log: true,
    autoMine: true,
    waitConfirmations: network.live ? 1 : 0,
  })

  log(`     TokenFactory deployed → ${tokenFactory.address}`)

  // ── Seed two MockERC20 tokens for local testing ──
  if (!network.live) {
    log('\n     Seeding test tokens …')
    const { ethers } = hre

    const MockERC20Factory = await ethers.getContractFactory('MockERC20')

    const usdc = await MockERC20Factory.deploy('USD Coin', 'USDC', 6)
    await usdc.waitForDeployment()
    log(`     MockUSDC deployed → ${await usdc.getAddress()}`)

    const usdt = await MockERC20Factory.deploy('Tether USD', 'USDT', 6)
    await usdt.waitForDeployment()
    log(`     MockUSDT deployed → ${await usdt.getAddress()}`)

    // Mint initial balances for the deployer
    const signers = await ethers.getSigners()
    const amount  = BigInt('1000000') * BigInt('1000000') // 1 million tokens (6 decimals)
    await usdc.mint(signers[0].address, amount)
    await usdt.mint(signers[0].address, amount)
    log(`     Minted 1 000 000 USDC + USDT to ${signers[0].address}`)
  }
}

func.tags = ['TokenFactory', 'all']
func.dependencies = ['DEXRouter']
export default func
