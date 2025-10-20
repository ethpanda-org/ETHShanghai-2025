import { ethers } from 'ethers'
import { ZKRWARegistryContract } from '@/lib/contracts/zkrwa-registry-ethers'
import { UserVerificationStatus, VerificationStatusResult, IdentityInfo, VCInfo } from '@/lib/types/verification-status'

/**
 * 验证状态服务类
 * 负责检查用户的ZK-KYC验证状态
 */
export class VerificationStatusService {
  private zkRegistry?: ZKRWARegistryContract

  constructor() {
    // 构造函数保持简单，延迟初始化合约
  }

  /**
   * 初始化ZK注册表合约
   */
  private async initializeContract(provider?: ethers.Provider, signer?: ethers.Signer): Promise<ZKRWARegistryContract> {
    if (this.zkRegistry) {
      // 检查现有实例是否仍然有效
      try {
        if (this.zkRegistry.contract.runner) {
          return this.zkRegistry
        }
      } catch (error) {
        console.warn('⚠️ 现有合约实例无效，重新创建')
        this.zkRegistry = undefined
      }
    }

    // 如果没有提供provider，尝试使用浏览器的provider
    if (!provider && typeof window !== 'undefined' && window.ethereum) {
      try {
        provider = new ethers.BrowserProvider(window.ethereum)
      } catch (error) {
        throw new Error('无法连接到钱包provider')
      }
    }

    if (!provider) {
      throw new Error('未找到有效的provider')
    }

    // 如果没有signer，从provider获取
    if (!signer) {
      try {
        signer = await provider.getSigner()
      } catch (error) {
        console.warn('⚠️ 无法获取signer，使用只读模式')
        // 对于只读操作，可以不需要signer
      }
    }

    try {
      this.zkRegistry = new ZKRWARegistryContract(provider, signer || provider, 11155111) // 默认使用Sepolia
      
      // 验证合约实例
      if (!this.zkRegistry.contract.runner) {
        throw new Error('合约runner初始化失败')
      }
      
      return this.zkRegistry
    } catch (error: any) {
      throw new Error('创建合约实例失败: ' + error.message)
    }
  }

  /**
   * 检查完整的验证状态
   */
  async checkCompleteVerificationStatus(
    userAddress: string, 
    provider?: ethers.Provider, 
    signer?: ethers.Signer
  ): Promise<VerificationStatusResult> {
    try {
      if (!userAddress) {
        return {
          status: UserVerificationStatus.NOT_CONNECTED,
          message: '请先连接钱包'
        }
      }

      console.log('🔍 检查用户验证状态:', userAddress)

      // 初始化合约 - 添加更好的错误处理
      let zkRegistry: ZKRWARegistryContract
      try {
        zkRegistry = await this.initializeContract(provider, signer)
      } catch (contractError: any) {
        console.error('❌ 合约初始化失败:', contractError)
        return {
          status: UserVerificationStatus.NOT_VERIFIED,
          message: '合约连接失败，请检查网络连接和钱包状态'
        }
      }

      // 检查身份验证状态 - 添加重试机制
      let hasValidIdentity: boolean
      try {
        // 先检查合约连接状态
        if (!zkRegistry.contract.runner) {
          throw new Error('合约runner未初始化')
        }
        
        hasValidIdentity = await zkRegistry.contract.hasValidIdentity(userAddress)
      } catch (callError: any) {
        console.error('❌ 合约调用失败:', callError)
        
        // 如果是runner问题，尝试重新初始化
        if (callError.message?.includes('contract runner') || callError.message?.includes('runner')) {
          console.log('🔄 尝试重新初始化合约...')
          try {
            // 强制重新创建合约实例
            this.zkRegistry = undefined
            zkRegistry = await this.initializeContract(provider, signer)
            hasValidIdentity = await zkRegistry.contract.hasValidIdentity(userAddress)
          } catch (retryError: any) {
            console.error('❌ 重试失败:', retryError)
            return {
              status: UserVerificationStatus.NOT_VERIFIED,
              message: '无法连接到智能合约，请检查网络和钱包连接'
            }
          }
        } else {
          return {
            status: UserVerificationStatus.NOT_VERIFIED,
            message: '合约调用失败：' + callError.message
          }
        }
      }
      
      if (!hasValidIdentity) {
        return {
          status: UserVerificationStatus.NOT_VERIFIED,
          message: '用户尚未完成ZK-KYC身份验证'
        }
      }

      // 获取身份信息
      const identityInfo = await this.getIdentityInfo(userAddress, zkRegistry)
      
      // 检查身份是否过期
      const currentTime = Math.floor(Date.now() / 1000)
      if (identityInfo && identityInfo.expiresAt < currentTime) {
        const expiredDays = Math.floor((currentTime - identityInfo.expiresAt) / (24 * 60 * 60))
        return {
          status: UserVerificationStatus.VERIFIED_EXPIRED,
          message: `身份验证已过期 ${expiredDays} 天`,
          identityInfo,
          expiredDays
        }
      }

      // 检查身份是否被撤销
      if (identityInfo && identityInfo.isRevoked) {
        return {
          status: UserVerificationStatus.VERIFIED_REVOKED,
          message: '身份验证已被撤销',
          identityInfo
        }
      }

      // 检查是否即将过期
      let isExpiringSoon = false
      let daysUntilExpiry = 0
      let hoursUntilExpiry = 0

      if (identityInfo && identityInfo.expiresAt > currentTime) {
        const timeUntilExpiry = identityInfo.expiresAt - currentTime
        daysUntilExpiry = Math.floor(timeUntilExpiry / (24 * 60 * 60))
        hoursUntilExpiry = Math.floor(timeUntilExpiry / (60 * 60))
        isExpiringSoon = daysUntilExpiry <= 7 // 7天内过期算作即将过期
      }

      // 获取VC信息（模拟）
      const vcInfo = await this.getVCInfo(userAddress)

      console.log('✅ 验证状态检查完成:', {
        hasValidIdentity,
        isExpiringSoon,
        daysUntilExpiry
      })

      return {
        status: UserVerificationStatus.VERIFIED_VALID,
        message: isExpiringSoon 
          ? `身份验证有效，但将在 ${daysUntilExpiry} 天后过期`
          : '身份验证有效',
        identityInfo,
        vcInfo,
        isExpiringSoon,
        daysUntilExpiry,
        hoursUntilExpiry
      }

    } catch (error) {
      console.error('❌ 检查验证状态失败:', error)
      return {
        status: UserVerificationStatus.NOT_VERIFIED,
        message: '检查验证状态失败，请重试'
      }
    }
  }

  /**
   * 获取身份信息
   */
  private async getIdentityInfo(userAddress: string, zkRegistry: ZKRWARegistryContract): Promise<IdentityInfo | undefined> {
    try {
      // 从合约获取身份信息
      const identityData = await zkRegistry.contract.getIdentityProof(userAddress)
      
      if (!identityData || !identityData.isActive) {
        return undefined
      }

      return {
        commitment: identityData.commitment || '0x0',
        nullifierHash: identityData.nullifierHash || '0x0',
        provider: identityData.provider || 'ZK-KYC',
        timestamp: Number(identityData.timestamp) || Math.floor(Date.now() / 1000),
        expiresAt: Number(identityData.expiresAt) || (Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60), // 默认1年后过期
        isActive: identityData.isActive || false,
        isRevoked: identityData.isRevoked || false
      }
    } catch (error) {
      console.error('❌ 获取身份信息失败:', error)
      
      // 返回默认的身份信息
      return {
        commitment: '0x0',
        nullifierHash: '0x0',
        provider: 'ZK-KYC',
        timestamp: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1年后过期
        isActive: true,
        isRevoked: false
      }
    }
  }

  /**
   * 获取VC信息（模拟实现）
   */
  private async getVCInfo(userAddress: string): Promise<VCInfo> {
    try {
      // 这里应该从实际的VC存储中获取信息
      // 目前返回模拟数据
      return {
        hasVC: true,
        isValid: true,
        isExpired: false,
        createdAt: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // 30天前创建
        lastUsed: Math.floor(Date.now() / 1000) - 24 * 60 * 60, // 1天前使用
        usageCount: 5,
        expiresAt: Math.floor(Date.now() / 1000) + 335 * 24 * 60 * 60, // 335天后过期
        vcId: `vc_${userAddress.substring(2, 10)}`,
        provider: 'ZK-KYC',
        timestamp: Math.floor(Date.now() / 1000)
      }
    } catch (error) {
      console.error('❌ 获取VC信息失败:', error)
      return {
        hasVC: false,
        isValid: false,
        isExpired: false
      }
    }
  }

  /**
   * 检查用户是否已验证（简化版本）
   */
  async isUserVerified(userAddress: string, provider?: ethers.Provider): Promise<boolean> {
    try {
      const status = await this.checkCompleteVerificationStatus(userAddress, provider)
      return status.status === UserVerificationStatus.VERIFIED_VALID
    } catch (error) {
      console.error('❌ 检查用户验证状态失败:', error)
      return false
    }
  }

  /**
   * 检查平台合规性
   */
  async checkPlatformCompliance(userAddress: string, platform: string, provider?: ethers.Provider): Promise<boolean> {
    try {
      const zkRegistry = await this.initializeContract(provider)
      return await zkRegistry.contract.isPlatformCompliant(userAddress, platform)
    } catch (error) {
      console.error('❌ 检查平台合规性失败:', error)
      return false
    }
  }
}

// 全局类型声明
declare global {
  interface Window {
    ethereum?: any
  }
}

