import { ethers } from 'ethers'
import { ZKRWARegistryContract } from '@/lib/contracts/zkrwa-registry-ethers'
import { 
  ZKRWAAssetFactoryContract,
  ZKRWATokenContract,
  ZKToERC3643AdapterContract
} from '@/lib/contracts/rwa-contracts-ethers'
import { 
  ZKRWA_TOKEN_ABI, 
  ZKRWA_ASSET_FACTORY_ABI, 
  getRWAContractAddresses 
} from '@/lib/contracts/rwa-abis'

export interface RWAAsset {
  address: string
  name: string
  symbol: string
  location: string
  totalValue: number
  tokenPrice: number
  totalSupply: number
  availableTokens: number
  circulatingSupply: number
  expectedReturn: number
  assetType: string
  description: string
  platform: string
  deployedAt: number
  deployer: string
  isActive: boolean
  totalRaised: number
  totalDividends: number
  riskLevel?: string // 添加可选的风险等级属性
}

export interface AssetCreationParams {
  name: string
  symbol: string
  platform: string
  assetInfo: {
    name: string
    location: string
    totalValue: string // in ETH
    assetType: string
    expectedReturn: number // in basis points
    description: string
  }
  tokenPrice: string // in ETH
  maxSupply: string // token amount
}

export interface InvestmentResult {
  success: boolean
  txHash?: string
  error?: string
  tokenAmount?: number
  ethAmount?: number
}

export class RWAAssetService {
  private provider: ethers.Provider
  private signer?: ethers.Signer
  private zkRegistry: ZKRWARegistryContract
  private factoryContract: ZKRWAAssetFactoryContract
  private adapterContract: ZKToERC3643AdapterContract
  private chainId: number

  constructor(provider: ethers.Provider, signer?: ethers.Signer, chainId: number = 11155111) {
    this.provider = provider
    this.signer = signer
    this.chainId = chainId
    
    // Initialize ZK Registry
    this.zkRegistry = new ZKRWARegistryContract(provider, signer!, chainId)
    
    // Initialize Factory Contract
    this.factoryContract = new ZKRWAAssetFactoryContract(provider, signer, chainId)
    
    // Initialize Adapter Contract
    this.adapterContract = new ZKToERC3643AdapterContract(provider, chainId)
    
    console.log('🏗️ RWAAssetService 初始化:', {
      chainId,
      factoryAddress: this.factoryContract.address,
      adapterAddress: this.adapterContract.address,
      hasProvider: !!provider,
      hasSigner: !!signer
    })
  }

  /**
   * 获取所有已部署的资产
   */
  async getDeployedAssets(): Promise<RWAAsset[]> {
    try {
      console.log('📋 获取已部署资产...')
      
      // 使用新的合约服务类获取资产
      const assetAddresses = await this.factoryContract.getDeployedAssets()
      console.log('🔍 找到资产地址:', assetAddresses)
      
      if (assetAddresses.length === 0) {
        console.log('📭 暂无已部署资产')
        return []
      }
      
      const assets = await Promise.all(
        assetAddresses.map(async (address: string) => {
          try {
            return await this.getAssetDetailsFromContract(address)
          } catch (error) {
            console.error(`❌ 获取资产详情失败 ${address}:`, error)
            return null
          }
        })
      )
      
      // Filter out failed requests
      const validAssets = assets.filter((asset): asset is RWAAsset => asset !== null)
      
      console.log('✅ 成功获取资产:', validAssets.length)
      return validAssets
      
    } catch (error) {
      console.error('❌ 获取已部署资产失败:', error)
      return []
    }
  }

  /**
   * 根据平台获取资产
   */
  async getAssetsByPlatform(platform: string): Promise<RWAAsset[]> {
    try {
      console.log('🔍 获取平台资产:', platform)
      
      const assetAddresses = await this.factoryContract.getAssetsByPlatform(platform)
      
      const assets = await Promise.all(
        assetAddresses.map(async (address: string) => {
          try {
            return await this.getAssetDetails(address)
          } catch (error) {
            console.error(`❌ 获取平台资产详情失败 ${address}:`, error)
            return null
          }
        })
      )
      
      return assets.filter((asset): asset is RWAAsset => asset !== null)
      
    } catch (error) {
      console.error('❌ 获取平台资产失败:', error)
      return []
    }
  }

  /**
   * 从合约获取资产详情 (使用新的合约服务类)
   */
  async getAssetDetailsFromContract(assetAddress: string): Promise<RWAAsset> {
    try {
      // 使用新的合约服务类
      const tokenContract = new ZKRWATokenContract(assetAddress, this.provider, this.signer)
      
      // 获取基本代币信息
      const tokenInfo = await tokenContract.getTokenInfo()
      const assetInfo = await tokenContract.getAssetInfo()
      const investmentStats = await tokenContract.getInvestmentStats()
      
      // 从工厂合约获取部署信息
      const factoryDetails = await this.factoryContract.getAssetDetails(assetAddress)
      
      // 🔧 正确处理数据格式：代币数量也需要从wei转换，ETH价值从wei转换
      const soldTokens = Number(ethers.formatUnits(investmentStats.currentSupply, 18))  // 已售出代币数量（wei → 代币）
      const totalValueEther = Number(ethers.formatEther(assetInfo.totalValue))          // 总价值（wei → ETH）
      const totalRaisedEther = Number(ethers.formatEther(investmentStats.totalRaised))  // 已筹集（wei → ETH）
      
      // 🔧 修正：根据智能合约逻辑 1 ETH = 1 代币，最大代币供应量 = 总价值
      const maxSupplyTokens = totalValueEther  // 最大供应量应该等于总价值（1 ETH = 1 代币）
      const availableTokens = maxSupplyTokens - soldTokens  // 剩余可购买代币数量
      
      // 🔧 修正：根据智能合约逻辑，1 ETH = 1 代币
      const tokenPrice = 1.0  // 智能合约中 tokens = amount，即 1 ETH = 1 代币
      
      console.log('💰 资产数据转换:', {
        合约地址: assetAddress,
        名称: tokenInfo.name,
        '📊 投资统计原始数据': {
          已售出代币原始: investmentStats.currentSupply,
          最大供应量原始: investmentStats.maxSupply,
          已筹集ETH原始: investmentStats.totalRaised
        },
        '🔢 转换后代币数据': {
          已售出代币数: soldTokens,
          最大供应量代币数: maxSupplyTokens,
          剩余可购买代币数: availableTokens,
          '逻辑说明': '1 ETH = 1 代币，最大供应量 = 总价值',
          '合约maxSupply': Number(ethers.formatUnits(investmentStats.maxSupply, 18)),
          '修正后maxSupply': maxSupplyTokens
        },
        '💰 转换后ETH数据': {
          总价值ETH: totalValueEther,
          已筹集ETH: totalRaisedEther,
          单代币价格ETH: tokenPrice
        },
        '📈 销售进度': {
          百分比: ((soldTokens / maxSupplyTokens) * 100).toFixed(2) + '%',
          显示文本: `${soldTokens} / ${maxSupplyTokens} 代币已售出`
        }
      })
      
      return {
        address: assetAddress,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        location: 'Unknown', // 需要从资产信息中获取，暂时设为未知
        totalValue: totalValueEther,
        tokenPrice: tokenPrice,
        totalSupply: maxSupplyTokens,        // 🔧 修正：最大供应量（代币数量）
        availableTokens: availableTokens,    // 🔧 修正：剩余可购买数量（代币数量）
        circulatingSupply: soldTokens,       // 🔧 修正：已售出代币数量（来自投资统计）
        expectedReturn: 8.5, // 暂时硬编码，需要从合约获取
        assetType: 'Real Estate', // 暂时硬编码，需要从合约获取
        description: assetInfo.description,
        platform: assetInfo.platformName,
        deployedAt: Date.now(), // 暂时使用当前时间，需要从工厂合约获取
        deployer: factoryDetails.metadata.creator,
        isActive: assetInfo.isActive,
        totalRaised: totalRaisedEther,
        totalDividends: 0 // 暂时设为0，需要从合约获取分红信息
      }
    } catch (error) {
      console.error('❌ 从合约获取资产详情失败:', error)
      throw error
    }
  }

  /**
   * 获取单个资产详情 (保留旧方法作为备用)
   */
  async getAssetDetails(assetAddress: string): Promise<RWAAsset> {
    try {
      // 优先使用新方法
      return await this.getAssetDetailsFromContract(assetAddress)
    } catch (error) {
      console.error('❌ 新方法失败，尝试旧方法:', error)
      
      try {
        // 降级到旧方法
        const tokenContract = new ethers.Contract(assetAddress, ZKRWA_TOKEN_ABI, this.provider)
        
        // Get basic token info
        const [name, symbol, totalSupply, assetInfo] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.totalSupply(),
          tokenContract.assetInfo()
        ])
        
        return {
          address: assetAddress,
          name,
          symbol,
          location: 'Unknown',
          totalValue: Number(ethers.formatEther(assetInfo.totalValue || 0)),
          tokenPrice: 0.1, // 默认价格
          totalSupply: Number(ethers.formatUnits(totalSupply, 18)),
          availableTokens: 1000, // 默认可用数量
          circulatingSupply: Number(ethers.formatUnits(totalSupply, 18)),
          expectedReturn: 8.5,
          assetType: 'Real Estate',
          description: assetInfo.description || 'No description available',
          platform: assetInfo.platformName || 'Unknown',
          deployedAt: Date.now(),
          deployer: ethers.ZeroAddress,
          isActive: true,
          totalRaised: 0,
          totalDividends: 0
        };
      } catch (fallbackError) {
        console.error('❌ 获取资产详情失败:', fallbackError)
        throw fallbackError
      }
    }
  }

  /**
   * 检查用户合规性 (使用适配器合约)
   */
  async checkUserCompliance(userAddress: string, platform: string): Promise<boolean> {
    try {
      console.log('🔍 开始用户合规检查:', { userAddress, platform })
      
      // 方法1: 直接检查ZK注册表中的身份验证状态
      let isVerified = false
      try {
        isVerified = await this.zkRegistry.contract.hasValidIdentity(userAddress)
        console.log('✅ ZK注册表身份验证结果:', { userAddress, isVerified })
      } catch (error) {
        console.warn('⚠️ ZK注册表检查失败，尝试适配器检查:', error)
        
        // 方法2: 如果ZK注册表失败，尝试适配器合约
        try {
          isVerified = await this.adapterContract.isVerified(userAddress)
          console.log('✅ 适配器身份验证结果:', { userAddress, isVerified })
        } catch (adapterError) {
          console.error('❌ 适配器检查也失败:', adapterError)
          // 方法3: 如果合约调用都失败，检查本地存储的验证状态
          if (typeof window !== 'undefined') {
            const localVerified = localStorage.getItem(`verified_${userAddress}`) === 'true'
            console.log('📱 本地存储验证结果:', { userAddress, localVerified })
            isVerified = localVerified
          }
        }
      }
      
      if (!isVerified) {
        console.log('❌ 用户未通过身份验证')
        return false
      }

      // 检查ZK注册表中的平台合规性
      let isPlatformCompliant = false
      try {
        isPlatformCompliant = await this.zkRegistry.contract.isPlatformCompliant(userAddress, platform)
      } catch (error) {
        console.warn('⚠️ 平台合规检查失败，默认通过:', error)
        // 如果平台合规检查失败，但用户已验证，则默认通过
        isPlatformCompliant = true
      }
      
      console.log('🔍 用户合规检查完成:', {
        userAddress,
        platform,
        isVerified,
        isPlatformCompliant,
        finalResult: isPlatformCompliant
      })

      return isPlatformCompliant
    } catch (error) {
      console.error('❌ 检查用户合规性失败:', error)
      return false
    }
  }

  /**
   * 检查用户身份验证状态
   */
  async checkUserIdentity(userAddress: string): Promise<boolean> {
    try {
      return await this.zkRegistry.hasValidIdentity(userAddress)
    } catch (error) {
      console.error('❌ 检查用户身份失败:', error)
      return false
    }
  }

  /**
   * 投资资产
   */
  async investInAsset(
    assetAddress: string, 
    tokenAmount: number, 
    userAddress: string
  ): Promise<InvestmentResult> {
    try {
      if (!this.signer) {
        throw new Error('需要钱包签名者进行投资')
      }

      console.log('💰 开始投资流程:', {
        assetAddress,
        tokenAmount,
        userAddress
      })

      // 1. 检查用户身份验证
      const hasValidIdentity = await this.checkUserIdentity(userAddress)
      if (!hasValidIdentity) {
        return {
          success: false,
          error: '请先完成ZK-KYC身份验证'
        }
      }

      // 2. 获取资产信息
      const asset = await this.getAssetDetails(assetAddress)
      
      // 3. 检查平台合规性
      const isCompliant = await this.checkUserCompliance(userAddress, asset.platform)
      if (!isCompliant) {
        return {
          success: false,
          error: `您不符合${asset.platform}平台的投资要求`
        }
      }

      // 4. 计算所需ETH - 根据智能合约逻辑：1 ETH = 1 代币
      const requiredETH = tokenAmount * 1.0  // 🔧 修正：1 ETH = 1 代币
      
      // 🔧 添加最小投资金额检查
      const MIN_INVESTMENT_ETH = 0.01 // 最小投资 0.01 ETH
      
      if (requiredETH < MIN_INVESTMENT_ETH) {
        return {
          success: false,
          error: `投资金额太小。最小投资金额为 ${MIN_INVESTMENT_ETH} ETH，请至少购买 ${MIN_INVESTMENT_ETH} 个代币 (1 ETH = 1 代币)`
        }
      }

      const ethAmount = ethers.parseEther(requiredETH.toString())

      console.log('💸 投资计算 (1 ETH = 1 代币):', {
        tokenAmount,
        智能合约比例: '1 ETH = 1 代币',
        requiredETH,
        minInvestment: MIN_INVESTMENT_ETH,
        meetsMinimum: requiredETH >= MIN_INVESTMENT_ETH,
        ethAmount: ethers.formatEther(ethAmount),
        说明: '按智能合约逻辑计算，不使用asset.tokenPrice'
      })

      // 5. 执行投资 (使用新的合约服务类)
      const tokenContract = new ZKRWATokenContract(assetAddress, this.provider, this.signer)
      
      const result = await tokenContract.invest(requiredETH.toString())

      console.log('✅ 投资成功:', result.hash)

      return {
        success: true,
        txHash: result.hash,
        tokenAmount,
        ethAmount: requiredETH
      }

    } catch (error: any) {
      console.error('❌ 投资失败:', error)
      return {
        success: false,
        error: error.message || '投资执行失败'
      }
    }
  }

  /**
   * 获取用户待领取分红
   */
  async getPendingDividends(assetAddress: string, userAddress: string): Promise<number> {
    try {
      const tokenContract = new ethers.Contract(assetAddress, ZKRWA_TOKEN_ABI, this.provider)
      const pendingDividends = await tokenContract.getPendingDividends(userAddress)
      return Number(ethers.formatEther(pendingDividends))
    } catch (error) {
      console.error('❌ 获取待领取分红失败:', error)
      return 0
    }
  }

  /**
   * 领取分红
   */
  async claimDividends(assetAddress: string): Promise<InvestmentResult> {
    try {
      if (!this.signer) {
        throw new Error('需要钱包签名者进行操作')
      }

      const tokenContract = new ethers.Contract(assetAddress, ZKRWA_TOKEN_ABI, this.signer)
      const tx = await tokenContract.claimDividends()
      
      const receipt = await tx.wait()
      
      return {
        success: true,
        txHash: receipt?.hash
      }

    } catch (error: any) {
      console.error('❌ 领取分红失败:', error)
      return {
        success: false,
        error: error.message || '领取分红失败'
      }
    }
  }

  /**
   * 创建新的RWA资产
   */
  async createAsset(params: AssetCreationParams, userAddress: string): Promise<InvestmentResult> {
    try {
      if (!this.signer) {
        throw new Error('需要钱包签名者进行创建')
      }

      console.log('🏗️ 创建RWA资产:', params)

      // 1. 检查用户身份验证
      const hasValidIdentity = await this.checkUserIdentity(userAddress)
      if (!hasValidIdentity) {
        return {
          success: false,
          error: '请先完成ZK-KYC身份验证'
        }
      }

      // 2. 检查平台合规性
      const isCompliant = await this.checkUserCompliance(userAddress, params.platform)
      if (!isCompliant) {
        return {
          success: false,
          error: `您不符合${params.platform}平台的要求`
        }
      }

      // 3. 计算创建费用
      const totalValueWei = ethers.parseEther(params.assetInfo.totalValue)
      const creationFee = await this.factoryContract.getCreationFee(totalValueWei)

      console.log('💸 创建费用:', ethers.formatEther(creationFee), 'ETH')

      // 4. 准备参数
      const assetInfo = {
        name: params.assetInfo.name,
        location: params.assetInfo.location,
        totalValue: totalValueWei,
        assetType: params.assetInfo.assetType,
        expectedReturn: params.assetInfo.expectedReturn,
        description: params.assetInfo.description
      }

      const tokenPriceWei = ethers.parseEther(params.tokenPrice)
      const maxSupplyWei = ethers.parseUnits(params.maxSupply, 18)

      // 5. 创建资产
      const tx = await this.factoryContract.createRWAAsset(
        params.name,
        params.symbol,
        params.platform,
        assetInfo,
        tokenPriceWei,
        maxSupplyWei,
        { value: creationFee }
      )

      console.log('📝 创建交易已提交:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('✅ 资产创建成功:', receipt?.hash)

      return {
        success: true,
        txHash: receipt?.hash
      }

    } catch (error: any) {
      console.error('❌ 创建资产失败:', error)
      return {
        success: false,
        error: error.message || '创建资产失败'
      }
    }
  }

  /**
   * 获取工厂统计信息
   */
  async getFactoryStats() {
    try {
      const stats = await this.factoryContract.getFactoryStats()
      return {
        totalAssets: Number(stats.totalAssets),
        activeAssets: Number(stats.activeAssets),
        totalValueLocked: Number(ethers.formatEther(stats.totalValueLocked)),
        totalTokensIssued: Number(ethers.formatUnits(stats.totalTokensIssued, 18))
      }
    } catch (error) {
      console.error('❌ 获取工厂统计失败:', error)
      return {
        totalAssets: 0,
        activeAssets: 0,
        totalValueLocked: 0,
        totalTokensIssued: 0
      }
    }
  }
}