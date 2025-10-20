// W3C Verifiable Credentials Storage Service
// 管理用户的可验证凭证存储和检索

import { W3CVerifiableCredential } from '@/lib/types/credential'
import { BaiduKYCResult } from '@/lib/services/kyc/baidu-ai-provider'

export interface VCStorageData {
  vc: W3CVerifiableCredential
  createdAt: number
  lastUsed: number
  usageCount: number
  isValid: boolean
  expiresAt: number
}

export interface VCStatus {
  hasVC: boolean
  isValid: boolean
  isExpired: boolean
  createdAt?: number
  lastUsed?: number
  usageCount?: number
  expiresAt?: number
  vcId?: string
  provider?: string
  timestamp?: number
}

export class VCStorageService {
  private readonly storageKey = 'zkrwa_vc_storage'
  private readonly userPrefix = 'user_'

  /**
   * 从百度 KYC 结果创建 W3C VC
   */
  async createVCFromBaiduKYC(
    kycResult: BaiduKYCResult, 
    userAddress: string
  ): Promise<W3CVerifiableCredential> {
    try {
      console.log('🔧 开始从百度KYC结果创建VC...', { userAddress })

      // 提取用户数据
      const userData = kycResult.userData || {}
      const { firstName, lastName, idNumber, dateOfBirth, nationality = 'CN' } = userData
      const name = `${firstName} ${lastName}`

      // 计算年龄
      const age = this.calculateAge(dateOfBirth)
      
      // 生成 VC ID
      const vcId = `vc:baidu:${userAddress}:${Date.now()}`
      
      // 计算过期时间（1年后）
      const issuanceDate = new Date().toISOString()
      const expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

      // 生成凭证哈希（用于 ZK 证明）
      const credentialHash = this.generateCredentialHash({
        name,
        idNumber,
        age,
        nationality,
        userAddress,
        timestamp: Date.now()
      })

      // 创建 W3C VC
      const vc: W3CVerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://zkrwa.org/credentials/v1"
        ],
        id: vcId,
        type: ["VerifiableCredential", "BaiduKYCCredential"],
        issuer: {
          id: "did:web:baidu.ai",
          name: "百度智能云"
        },
        issuanceDate,
        expirationDate,
        credentialSubject: {
          id: userAddress,
          name,
          age,
          nationality,
          kycLevel: "basic",
          netWorth: 100000, // 默认资产值，实际应用中可以从其他数据源获取
          verificationMethod: "baidu_ai_kyc",
          hash: credentialHash
        },
        proof: {
          type: "BaiduAISignature2024",
          created: issuanceDate,
          verificationMethod: "did:web:baidu.ai#key-1",
          proofPurpose: "assertionMethod",
          proofValue: this.generateProofValue(kycResult, userAddress)
        }
      }

      console.log('✅ VC创建成功:', {
        vcId,
        age,
        nationality,
        hash: credentialHash.substring(0, 10) + '...'
      })

      return vc
    } catch (error) {
      console.error('❌ VC创建失败:', error)
      throw new Error(`VC创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 存储 VC 到本地存储
   */
  storeVC(userAddress: string, vc: W3CVerifiableCredential): void {
    try {
      const storageData: VCStorageData = {
        vc,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        usageCount: 0,
        isValid: true,
        expiresAt: vc.expirationDate ? new Date(vc.expirationDate).getTime() : Date.now() + (365 * 24 * 60 * 60 * 1000)
      }

      const key = this.getUserStorageKey(userAddress)
      localStorage.setItem(key, JSON.stringify(storageData))

      console.log('✅ VC已存储到本地:', {
        userAddress,
        vcId: vc.id,
        expiresAt: vc.expirationDate
      })
    } catch (error) {
      console.error('❌ VC存储失败:', error)
      throw new Error('VC存储失败')
    }
  }

  /**
   * 获取用户的 VC 存储数据
   */
  getVCStorage(userAddress: string): VCStorageData | null {
    try {
      const key = this.getUserStorageKey(userAddress)
      const data = localStorage.getItem(key)
      
      if (!data) {
        return null
      }

      const storageData: VCStorageData = JSON.parse(data)
      
      // 检查是否过期
      if (storageData.expiresAt < Date.now()) {
        console.log('⚠️ VC已过期，清除存储')
        this.clearVC(userAddress)
        return null
      }

      return storageData
    } catch (error) {
      console.error('❌ 获取VC存储失败:', error)
      return null
    }
  }

  /**
   * 检查用户 VC 状态
   */
  checkVCStatus(userAddress: string): VCStatus {
    const storageData = this.getVCStorage(userAddress)
    
    if (!storageData) {
      return {
        hasVC: false,
        isValid: false,
        isExpired: false
      }
    }

    const isExpired = storageData.expiresAt < Date.now()
    const isValid = storageData.isValid && !isExpired

    // 提取提供商信息
    const provider = storageData.vc.credentialSubject?.verificationMethod || 
                    storageData.vc.issuer?.name || 
                    'unknown'

    return {
      hasVC: true,
      isValid,
      isExpired,
      createdAt: storageData.createdAt,
      lastUsed: storageData.lastUsed,
      usageCount: storageData.usageCount,
      expiresAt: storageData.expiresAt,
      vcId: storageData.vc.id,
      provider,
      timestamp: storageData.createdAt // 保持毫秒时间戳一致性
    }
  }

  /**
   * 更新 VC 使用记录
   */
  updateVCUsage(userAddress: string): void {
    const storageData = this.getVCStorage(userAddress)
    if (!storageData) {
      return
    }

    storageData.lastUsed = Date.now()
    storageData.usageCount += 1

    const key = this.getUserStorageKey(userAddress)
    localStorage.setItem(key, JSON.stringify(storageData))

    console.log('📊 VC使用记录已更新:', {
      userAddress,
      usageCount: storageData.usageCount,
      lastUsed: new Date(storageData.lastUsed).toISOString()
    })
  }

  /**
   * 清除用户的 VC
   */
  clearVC(userAddress: string): void {
    const key = this.getUserStorageKey(userAddress)
    localStorage.removeItem(key)
    console.log('🗑️ VC已清除:', userAddress)
  }

  /**
   * 获取 VC 用于 ZK 证明
   */
  getVCForProof(userAddress: string): W3CVerifiableCredential | null {
    const storageData = this.getVCStorage(userAddress)
    if (!storageData || !storageData.isValid) {
      return null
    }

    // 更新使用记录
    this.updateVCUsage(userAddress)

    return storageData.vc
  }

  /**
   * 验证 VC 的完整性
   */
  validateVC(vc: W3CVerifiableCredential): boolean {
    try {
      // 基本结构检查
      if (!vc.id || !vc.credentialSubject || !vc.issuer) {
        return false
      }

      // 检查过期时间
      if (vc.expirationDate && new Date(vc.expirationDate) < new Date()) {
        return false
      }

      // 检查必需字段
      const subject = vc.credentialSubject
      if (!subject.id || !subject.age || !subject.nationality || !subject.hash) {
        return false
      }

      return true
    } catch (error) {
      console.error('❌ VC验证失败:', error)
      return false
    }
  }

  // ========== 私有方法 ==========

  private getUserStorageKey(userAddress: string): string {
    return `${this.storageKey}_${this.userPrefix}${userAddress.toLowerCase()}`
  }

  private calculateAge(birthDate: string): number {
    if (!birthDate) return 25 // 默认年龄

    try {
      // 支持多种日期格式
      let date: Date
      
      if (birthDate.includes('-')) {
        // YYYY-MM-DD 格式
        date = new Date(birthDate)
      } else if (birthDate.length === 8) {
        // YYYYMMDD 格式
        const year = parseInt(birthDate.substring(0, 4))
        const month = parseInt(birthDate.substring(4, 6)) - 1
        const day = parseInt(birthDate.substring(6, 8))
        date = new Date(year, month, day)
      } else {
        return 25 // 无法解析，返回默认值
      }

      const today = new Date()
      let age = today.getFullYear() - date.getFullYear()
      const monthDiff = today.getMonth() - date.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--
      }

      return age > 0 && age < 150 ? age : 25
    } catch (error) {
      console.error('年龄计算失败:', error)
      return 25
    }
  }

  private generateCredentialHash(data: any): string {
    // 简单的哈希生成（实际应用中应使用 Poseidon 哈希）
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`
  }

  private generateProofValue(kycResult: BaiduKYCResult, userAddress: string): string {
    // 生成证明值（实际应用中应使用真实的数字签名）
    const data = {
      kycResult: kycResult.status,
      userAddress,
      timestamp: Date.now()
    }
    return `proof_${Buffer.from(JSON.stringify(data)).toString('base64')}`
  }
}



