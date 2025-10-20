import { ethers } from 'ethers'
import { 
  ZKRWA_TOKEN_ABI, 
  ZKRWA_ASSET_FACTORY_ABI, 
  ZKRWA_ADAPTER_ABI,
  getRWAContractAddresses 
} from './rwa-abis'

/**
 * ZKRWAAssetFactory 合约交互类
 */
export class ZKRWAAssetFactoryContract {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer
  public readonly address: string

  constructor(provider: ethers.Provider, signer?: ethers.Signer, chainId: number = 11155111) {
    const addresses = getRWAContractAddresses(chainId)
    this.address = addresses.assetFactory
    this.provider = provider
    this.signer = signer
    this.contract = new ethers.Contract(
      this.address, 
      ZKRWA_ASSET_FACTORY_ABI, 
      signer || provider
    )
    
    console.log('🏗️ ZKRWAAssetFactory 合约初始化:', {
      address: this.address,
      chainId,
      hasProvider: !!provider,
      hasSigner: !!signer
    })
  }

  /**
   * 获取活跃资产列表
   */
  async getActiveAssets(): Promise<string[]> {
    try {
      const assets = await this.contract.getActiveAssets()
      console.log('📋 获取活跃资产:', assets)
      return assets
    } catch (error) {
      console.error('❌ 获取活跃资产失败:', error)
      return []
    }
  }

  /**
   * 获取所有资产列表
   */
  async getAllAssets(): Promise<string[]> {
    try {
      const assets = await this.contract.getAllAssets()
      console.log('📋 获取所有资产:', assets)
      return assets
    } catch (error) {
      console.error('❌ 获取所有资产失败:', error)
      return []
    }
  }

  /**
   * 获取已部署的资产列表（使用getActiveAssets作为实现）
   */
  async getDeployedAssets(): Promise<string[]> {
    return await this.getActiveAssets()
  }

  /**
   * 获取创建费用
   */
  async getCreationFee(totalValue?: bigint): Promise<bigint> {
    try {
      // 直接读取合约的 creationFee 状态变量
      const fee = await this.contract.creationFee()
      console.log('💸 获取创建费用:', {
        fee: ethers.formatEther(fee),
        totalValue: totalValue ? ethers.formatEther(totalValue) : 'N/A'
      })
      return fee
    } catch (error) {
      console.error('❌ 获取创建费用失败:', error)
      // 返回默认费用 0.01 ETH
      return ethers.parseEther('0.01')
    }
  }

  /**
   * 获取资产详情
   */
  async getAssetDetails(assetAddress: string): Promise<any> {
    try {
      const details = await this.contract.getAssetDetails(assetAddress)
      console.log('📊 资产详情:', details)
      return details
    } catch (error) {
      console.error('❌ 获取资产详情失败:', error)
      return null
    }
  }

  /**
   * 创建新资产
   */
  async createAsset(params: {
    name: string
    symbol: string
    totalValue: bigint
    maxSupply: bigint
    description: string
    platformName: string
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!this.signer) {
        throw new Error('需要签名者来创建资产')
      }

      const tx = await this.contract.createAsset(
        params.name,
        params.symbol,
        params.totalValue,
        params.maxSupply,
        params.description,
        params.platformName
      )

      const receipt = await tx.wait()
      console.log('✅ 资产创建成功:', receipt.hash)
      
      return {
        success: true,
        txHash: receipt.hash
      }
    } catch (error: any) {
      console.error('❌ 资产创建失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 创建RWA资产（RWAAssetService使用的方法）
   */
  async createRWAAsset(
    name: string,
    symbol: string,
    platform: string,
    assetInfo: any,
    tokenPrice: bigint,
    maxSupply: bigint,
    options: { value: bigint }
  ): Promise<{ hash: string; wait: () => Promise<{ hash: string }> }> {
    try {
      if (!this.signer) {
        throw new Error('需要签名者来创建资产')
      }

      console.log('🏗️ 调用合约创建资产:', {
        name,
        symbol,
        platform,
        assetInfo,
        tokenPrice: ethers.formatEther(tokenPrice),
        maxSupply: ethers.formatUnits(maxSupply, 18),
        value: ethers.formatEther(options.value)
      })

      // 准备创建参数结构体
      const creationParams = {
        name,
        symbol,
        description: assetInfo.description,
        totalValue: assetInfo.totalValue,
        minInvestment: ethers.parseEther('0.01'), // 最小投资 0.01 ETH
        maxSupply,
        platformName: platform
      }

      const tx = await this.contract.createAsset(creationParams, options)

      console.log('📝 资产创建交易已提交:', tx.hash)
      
      return {
        hash: tx.hash,
        wait: async () => {
          const receipt = await tx.wait()
          return { hash: receipt.hash }
        }
      }
    } catch (error: any) {
      console.error('❌ 创建RWA资产失败:', error)
      throw error
    }
  }
}

/**
 * ZKRWAToken 合约交互类
 */
export class ZKRWATokenContract {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer
  public readonly address: string

  constructor(tokenAddress: string, provider: ethers.Provider, signer?: ethers.Signer) {
    this.address = tokenAddress
    this.provider = provider
    this.signer = signer
    this.contract = new ethers.Contract(
      this.address, 
      ZKRWA_TOKEN_ABI, 
      signer || provider
    )
    
    console.log('🏗️ ZKRWAToken 合约初始化:', {
      address: this.address,
      hasProvider: !!provider,
      hasSigner: !!signer
    })
  }

  /**
   * 获取代币基本信息
   */
  async getTokenInfo(): Promise<{
    name: string
    symbol: string
    totalSupply: string
    decimals: number
  }> {
    try {
      const [name, symbol, totalSupply, decimals] = await Promise.all([
        this.contract.name(),
        this.contract.symbol(),
        this.contract.totalSupply(),
        this.contract.decimals()
      ])

      return {
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        decimals: Number(decimals)
      }
    } catch (error) {
      console.error('❌ 获取代币信息失败:', error)
      throw error
    }
  }

  /**
   * 获取资产信息
   */
  async getAssetInfo(): Promise<{
    totalValue: string
    maxSupply: string
    description: string
    platformName: string
    isActive: boolean
  }> {
    try {
      const assetInfo = await this.contract.assetInfo()
      
      return {
        totalValue: assetInfo.totalValue.toString(),
        maxSupply: assetInfo.maxSupply.toString(),
        description: assetInfo.description,
        platformName: assetInfo.platformName,
        isActive: assetInfo.isActive
      }
    } catch (error) {
      console.error('❌ 获取资产信息失败:', error)
      throw error
    }
  }

  /**
   * 获取投资统计
   */
  async getInvestmentStats(): Promise<{
    totalRaised: string
    investorCount: number
    currentSupply: string
    maxSupply: string
  }> {
    try {
      // 调用智能合约的 getInvestmentStats 方法，返回4个值
      const stats = await this.contract.getInvestmentStats()
      
      console.log('📊 获取投资统计:', {
        totalInvestors: stats[0].toString(),
        totalRaised: stats[1].toString(),
        currentSupply: stats[2].toString(),
        maxSupply: stats[3].toString()
      })

      return {
        totalRaised: stats[1].toString(), // _totalRaised
        investorCount: Number(stats[0]), // _totalInvestors
        currentSupply: stats[2].toString(), // _currentSupply
        maxSupply: stats[3].toString() // _maxSupply
      }
    } catch (error) {
      console.error('❌ 获取投资统计失败:', error)
      return {
        totalRaised: '0',
        investorCount: 0,
        currentSupply: '0',
        maxSupply: '0'
      }
    }
  }

  /**
   * 投资购买代币
   */
  async invest(ethAmount: string): Promise<{ success: boolean; txHash?: string; hash?: string; error?: string }> {
    try {
      if (!this.signer) {
        throw new Error('需要签名者来进行投资')
      }

      // 将ETH金额转换为wei
      const ethAmountWei = ethers.parseEther(ethAmount)
      
      console.log('💰 开始投资:', {
        ethAmount,
        ethAmountWei: ethAmountWei.toString(),
        contractAddress: this.address
      })

      // 调用智能合约的invest方法
      // 根据ABI，invest方法接受amount参数（wei）并且是payable的
      const tx = await this.contract.invest(ethAmountWei, {
        value: ethAmountWei
      })

      console.log('📝 投资交易已提交:', tx.hash)
      const receipt = await tx.wait()
      console.log('✅ 投资成功:', receipt.hash)
      
      return {
        success: true,
        txHash: receipt.hash,
        hash: receipt.hash
      }
    } catch (error: any) {
      console.error('❌ 投资失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

/**
 * ZKToERC3643Adapter 合约交互类
 */
export class ZKToERC3643AdapterContract {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer
  public readonly address: string

  constructor(provider: ethers.Provider, signer?: ethers.Signer, chainId: number = 11155111) {
    const addresses = getRWAContractAddresses(chainId)
    this.address = addresses.adapter
    this.provider = provider
    this.signer = signer
    this.contract = new ethers.Contract(
      this.address, 
      ZKRWA_ADAPTER_ABI, 
      signer || provider
    )
    
    console.log('🏗️ ZKToERC3643Adapter 合约初始化:', {
      address: this.address,
      chainId,
      hasProvider: !!provider,
      hasSigner: !!signer
    })
  }

  /**
   * 检查用户合规性
   */
  async checkCompliance(userAddress: string, platform: string): Promise<boolean> {
    try {
      const isCompliant = await this.contract.isCompliant(userAddress, platform)
      console.log('🔍 合规性检查结果:', { userAddress, platform, isCompliant })
      return isCompliant
    } catch (error) {
      console.error('❌ 合规性检查失败:', error)
      return false
    }
  }

  /**
   * 检查用户是否已验证
   */
  async isVerified(userAddress: string): Promise<boolean> {
    try {
      // 确保合约有正确的 runner
      let contract = this.contract
      if (!contract.runner) {
        console.log('🔄 重新创建合约实例...')
        contract = new ethers.Contract(
          this.address,
          ZKRWA_ADAPTER_ABI,
          this.signer || this.provider
        )
      }
      
      console.log('🔍 调用合约方法 isVerified:', {
        userAddress: userAddress.substring(0, 10) + '...',
        contractAddress: this.address,
        hasRunner: !!contract.runner
      })
      
      const isVerified = await contract.isVerified(userAddress)
      console.log('🔍 身份验证结果:', { userAddress, isVerified })
      return isVerified
    } catch (error) {
      console.error('❌ 身份验证失败:', error)
      return false
    }
  }

  /**
   * 验证用户身份（别名方法）
   */
  async verifyIdentity(userAddress: string): Promise<boolean> {
    return await this.isVerified(userAddress)
  }
}
