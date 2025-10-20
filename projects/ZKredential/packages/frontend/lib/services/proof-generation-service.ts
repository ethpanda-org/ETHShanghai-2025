// ZK Proof generation service - 简化版支持VC和证明生成

import type { 
  W3CVerifiableCredential 
} from "../types/credential"

// 简化的类型定义
interface RWARequirements {
  platform: string
  minAge: number
  allowedCountries: string[]
  minAssets: number
}

interface ZKProofRequest {
  vc: W3CVerifiableCredential
  requirements: RWARequirements
  walletAddress: string
  nonce: string
}

interface EnhancedZKProof {
  proof: any
  publicSignals: any[]
  commitment: string
  timestamp: number
  proofHash: string
  requirements: RWARequirements
  platform: string
  expiresAt: number
}

export class ProofGenerationService {
  constructor() {
    // 简化构造函数
  }

  // 检查ZK服务器健康状态
  async checkServerHealth(): Promise<boolean> {
    try {
      const ZK_SERVER_URL = process.env.NEXT_PUBLIC_ZK_SERVER_URL || 'http://localhost:8080'
      const response = await fetch(`${ZK_SERVER_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒超时
      })
      return response.ok
    } catch (error) {
      console.error('ZK服务器健康检查失败:', error)
      return false
    }
  }

  // 从VC生成ZK证明 - 核心功能
  async generateProofFromVC(request: ZKProofRequest & { platform?: string }): Promise<EnhancedZKProof> {
    try {
      const platform = request.platform || request.requirements.platform || 'propertyfy'
      
      console.log('🔄 开始从VC生成ZK证明...', {
        vcId: request.vc.id,
        platform: platform,
        walletAddress: request.walletAddress
      })

      // 1. 验证VC有效性
      const isVCValid = await this.verifyVCValidity(request.vc)
      if (!isVCValid) {
        throw new Error('VC无效或已过期，请重新验证身份')
      }

      // 2. 准备ZK证明输入（不进行合规性检查，让ZK电路来验证）
      // ⚠️ 注意：我们不在这里检查用户是否满足要求
      // 这是零知识证明的核心：用户的实际数据不会被暴露
      // 只有电路会验证并输出 isCompliant (0或1)
      const { publicInputs, privateInputs } = this.prepareVCInputs(
        request.vc,
        request.requirements,
        request.walletAddress,
        request.nonce
      )

      // 4. 调用ZK证明API (传递平台参数)
      const apiResult = await this.callZKProofAPI(publicInputs, privateInputs, platform)
      const { proof, publicSignals } = apiResult

      // 5. 生成证明哈希和承诺
      const proofHash = this.generateProofHash(proof, publicSignals)
      // 优先使用API返回的commitment，如果没有则生成
      const commitment = (apiResult as any).commitment || this.generateCommitment(proof, request.walletAddress, Date.now())

      const enhancedProof: EnhancedZKProof = {
        proof,
        publicSignals,
        commitment,
        timestamp: Date.now(),
        proofHash,
        requirements: request.requirements,
        platform: request.requirements.platform,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24小时有效期
      }

      console.log('ZK proof generated:', {
        commitment: commitment.slice(0, 20) + '...',
        proofHash: proofHash.slice(0, 20) + '...'
      })

      return enhancedProof

    } catch (error) {
      console.error('❌ ZK证明生成失败:', error)
      throw error
    }
  }

  // 验证VC有效性
  private async verifyVCValidity(vc: W3CVerifiableCredential): Promise<boolean> {
    try {
      // 检查VC是否过期
      if (vc.expirationDate && new Date(vc.expirationDate) < new Date()) {
        return false
      }
      
      // 检查VC基本结构
      return !!(vc.id && vc.credentialSubject && vc.issuer && vc.proof)
    } catch (error) {
      console.error('VC验证失败:', error)
      return false
    }
  }

  // ❌ 已禁用：不应该在生成证明前检查合规性
  // 这违背了零知识证明的原理！
  // 零知识证明的意义：
  // - 用户实际数据（年龄、国籍、资产）不暴露
  // - 只有ZK电路验证并输出 isCompliant (0或1)
  // - 前端/后端不应该提前检查用户是否满足要求
  //
  // 正确流程：
  // 1. 用户输入实际数据到电路
  // 2. 电路验证是否满足要求
  // 3. 电路输出 isCompliant = 1（满足）或 0（不满足）
  // 4. 区块链只看到 isCompliant，看不到实际年龄、国籍等
  //
  // 如果用户不满足要求：
  // - 电路会输出 isCompliant = 0
  // - 证明仍然生成，但 isCompliant = 0
  // - 链上注册时会被拒绝（因为 require(isCompliant == 1)）
  //
  // private async checkVCCompliance(...) {
  //   // 此方法已废弃，不再使用
  // }

  // 准备VC输入数据
  private prepareVCInputs(
    vc: W3CVerifiableCredential, 
    requirements: RWARequirements, 
    walletAddress: string,
    nonce: string
  ) {
    const subject = vc.credentialSubject

    console.log('[Debug] VC data structure:', {
      vcId: vc.id,
      subjectId: subject.id,
      hasAge: 'age' in subject,
      hasDateOfBirth: 'dateOfBirth' in subject,
      ageValue: subject.age,
      dateOfBirthValue: subject.dateOfBirth,
      nationality: subject.nationality,
      netWorth: subject.netWorth,
      kycLevel: subject.kycLevel
    })

    // 计算实际年龄
    const actualAge = subject.age || (subject.dateOfBirth ? this.calculateAge(subject.dateOfBirth) : 0)
    
    console.log('[Debug] Age calculation:', {
      'subject.age': subject.age,
      'subject.dateOfBirth': subject.dateOfBirth,
      'calculatedAge': subject.dateOfBirth ? this.calculateAge(subject.dateOfBirth) : null,
      'finalActualAge': actualAge,
      'requiredMinAge': requirements.minAge,
      'shouldBeCompliant': actualAge >= requirements.minAge
    })

    // 公共输入（在证明中可见）
    const publicInputs = {
      minAge: requirements.minAge,
      allowedCountry: this.nationalityToNumber(requirements.allowedCountries[0] || 'CN'),
      minAssets: requirements.minAssets,
      walletAddress: this.addressToNumber(walletAddress),
      timestamp: Math.floor(Date.now() / 1000),
      nonce: this.hashString(nonce)
    }

    // 私有输入（在证明中隐藏）
    const privateInputs = {
      actualAge,
      actualNationality: this.nationalityToNumber(subject.nationality || 'CN'),
      actualKycLevel: this.kycLevelToNumber(subject.kycLevel || 'basic'),
      isAccredited: subject.accreditedInvestor ? 1 : 0,
      actualNetWorth: subject.netWorth || 0,
      vcSignature: this.hashString(vc.proof.proofValue),
      vcIssuer: this.hashString(vc.issuer.id)
    }

    console.log('[Debug] Input data prepared:', {
      publicInputs: {
        minAge: publicInputs.minAge,
        allowedCountry: publicInputs.allowedCountry,
        minAssets: publicInputs.minAssets,
        walletAddress: publicInputs.walletAddress.toString().substring(0, 10) + '...',
        timestamp: publicInputs.timestamp
      },
      privateInputs: {
        actualAge: privateInputs.actualAge,
        actualNationality: privateInputs.actualNationality,
        actualKycLevel: privateInputs.actualKycLevel,
        isAccredited: privateInputs.isAccredited,
        actualNetWorth: privateInputs.actualNetWorth
      },
      complianceCheck: {
        ageCompliant: privateInputs.actualAge >= publicInputs.minAge,
        nationalityCompliant: privateInputs.actualNationality === publicInputs.allowedCountry,
        assetsCompliant: privateInputs.actualNetWorth >= publicInputs.minAssets
      }
    })

    return { publicInputs, privateInputs }
  }

  // 调用ZK证明API
  private async callZKProofAPI(publicInputs: any, privateInputs: any, platform: string = 'propertyfy'): Promise<{ proof: any; publicSignals: any[]; commitment?: string }> {
    console.log('[Debug] Calling ZK proof API...')
    console.log('[Debug] Target platform:', platform)
    console.log('[Debug] API request data:', {
      address: publicInputs.walletAddress.toString().substring(0, 10) + '...',
      credentialDataKeys: Object.keys({ ...publicInputs, ...privateInputs }),
      actualAge: privateInputs.actualAge,
      minAge: publicInputs.minAge,
      expectedCompliance: privateInputs.actualAge >= publicInputs.minAge,
      platform: platform
    })
    
    try {
      const requestBody = {
        address: publicInputs.walletAddress,
        credentialData: {
          ...publicInputs,
          ...privateInputs
        },
        platform: platform  // ← 添加平台参数
      }
      
      console.log('[Debug] Full API request:', {
        address: requestBody.address.toString().substring(0, 10) + '...',
        credentialData: {
          ...requestBody.credentialData,
          walletAddress: requestBody.credentialData.walletAddress.toString().substring(0, 10) + '...'
        }
      })
      
      const response = await fetch('/api/proof/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('[Debug] API response status:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [调试] API响应错误:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        
        throw new Error(`ZK证明API调用失败 (${response.status}): ${errorData.error || errorText}`)
      }

      const result = await response.json()
      
      console.log('[Debug] API result:', {
        success: result.success,
        hasProof: !!result.proof,
        proofKeys: result.proof ? Object.keys(result.proof) : [],
        hasPublicSignals: !!(result.proof && result.proof.publicSignals),
        publicSignalsLength: result.proof && result.proof.publicSignals ? result.proof.publicSignals.length : 0,
        commitment: result.proof && result.proof.commitment ? result.proof.commitment.substring(0, 20) + '...' : 'N/A'
      })
      
      if (!result.success) {
        console.error('❌ [调试] API返回失败:', result)
        throw new Error(`ZK证明生成失败: ${result.error || '未知错误'}`)
      }

      // 检查返回的公共信号中的合规性
      if (result.proof && result.proof.publicSignals) {
        const isCompliantSignal = result.proof.publicSignals[2] // 假设合规性在索引2
        console.log('[Debug] Compliance signal:', {
          publicSignals: result.proof.publicSignals,
          isCompliantSignal,
          isCompliantValue: isCompliantSignal === '1' || isCompliantSignal === 1
        })
      }

      // API返回的数据结构：{ success: true, proof: { zkProof, commitment, publicSignals } }
      const apiResult = {
        proof: result.proof.zkProof,
        publicSignals: result.proof.publicSignals,
        commitment: result.proof.commitment // 直接使用API返回的commitment
      }
      
      console.log('[Debug] ZK proof API call successful')
      return apiResult

    } catch (error) {
      console.error('❌ [调试] ZK证明API调用失败:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      })
      
      // 不再降级到模拟证明，直接抛出错误
      throw new Error(`ZK证明API调用失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

 

  // 工具函数
  private calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  private nationalityToNumber(nationality: string): number {
    const countryMap: { [key: string]: number } = {
      'CN': 156, 'US': 840, 'UK': 826, 'JP': 392, 'DE': 276, 'FR': 250
    }
    return countryMap[nationality] || 156
  }

  private kycLevelToNumber(level: string): number {
    const levelMap: { [key: string]: number } = {
      'basic': 1, 'enhanced': 2, 'full': 3
    }
    return levelMap[level] || 1
  }

  private addressToNumber(address: string): string {
    return BigInt(address).toString()
  }

  private hashString(input: string): string {
    // 使用更好的哈希函数生成64位十六进制字符串
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    
    // 生成有效的64位十六进制字符串
    const baseHash = Math.abs(hash).toString(16).padStart(8, '0')
    const timestamp = Date.now().toString(16).padStart(12, '0')
    const randomSuffix = Math.random().toString(16).substring(2, 18).padStart(16, '0')
    const inputLengthHex = input.length.toString(16).padStart(4, '0')
    
    // 组合生成64字符的十六进制哈希
    const combinedHash = (baseHash + timestamp + randomSuffix + inputLengthHex).repeat(2)
    const result = combinedHash.substring(0, 64)
    
    console.log('[Debug] Hash string generated:', {
      input: input.substring(0, 20) + '...',
      inputLength: input.length,
      hash: result,
      isValidHex: /^[0-9a-f]{64}$/i.test(result)
    })
    
    return result
  }

  private generateProofHash(proof: any, publicSignals: any[]): string {
    const proofString = JSON.stringify(proof) + JSON.stringify(publicSignals)
    return this.hashString(proofString)
  }

  private generateCommitment(proof: any, walletAddress: string, timestamp: number): string {
    const commitmentString = `${JSON.stringify(proof)}_${walletAddress}_${timestamp}`
    return `0x${this.hashString(commitmentString).padStart(64, '0')}`
  }
}