import { ethers } from 'ethers'
import { getContractAddresses } from './addresses'
import ZKRWA_REGISTRY_MULTIPLATFORM_ABI from './abis/ZKRWARegistryMultiPlatform.json'

export interface ZKProofData {
  zkProof?: {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    protocol: string
    curve: string
  }
  proof?: {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    protocol: string
    curve: string
  }
  publicSignals: string[]
  platform?: string
  commitment?: string
}

/**
 * ZKRWARegistryMultiPlatform 合约交互类
 * 支持多平台（PropertyFy, RealT, RealestateIO）
 */
export class ZKRWARegistryMultiPlatformContract {
  private contract: ethers.Contract
  private signer: ethers.Signer
  private provider: ethers.Provider
  public readonly address: string

  constructor(provider: ethers.Provider, signer?: ethers.Signer, chainId: number = 11155111) {
    const addresses = getContractAddresses(chainId)
    this.address = addresses.registry
    this.provider = provider
    
    if (signer) {
      this.signer = signer
      this.contract = new ethers.Contract(this.address, ZKRWA_REGISTRY_MULTIPLATFORM_ABI, signer)
    } else {
      this.signer = provider as any
      this.contract = new ethers.Contract(this.address, ZKRWA_REGISTRY_MULTIPLATFORM_ABI, provider)
    }
    
    console.log('🏗️ ZKRWARegistryMultiPlatform 初始化:', {
      address: this.address,
      chainId,
      hasProvider: !!provider,
      hasSigner: !!signer
    })
  }

  /**
   * 注册用户身份到链上（多平台版本）
   */
  async registerIdentity(
    proof: ZKProofData,
    platform: string = 'propertyfy',
    provider: string = 'zk-kyc',
    expiresAt?: number
  ): Promise<{ hash: string }> {
    try {
      if (!this.signer) {
        throw new Error('需要钱包签名者进行交易')
      }

      const signerAddress = await this.signer.getAddress()
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const finalExpiresAt = expiresAt || (currentTimestamp + 365 * 24 * 60 * 60) // 默认1年

      console.log('📝 准备链上注册参数（多平台）:', {
        signerAddress,
        platform,
        publicSignalsLength: proof.publicSignals?.length,
        provider,
        expiresAt: finalExpiresAt
      })

      // 获取证明数据
      const zkProof = proof.zkProof || proof.proof
      if (!zkProof) {
        throw new Error('证明数据格式错误：缺少zkProof或proof字段')
      }
      
      // 转换证明格式
      const proofA = [
        BigInt(zkProof.pi_a[0]),
        BigInt(zkProof.pi_a[1])
      ]

      const proofB = [
        [BigInt(zkProof.pi_b[0][1]), BigInt(zkProof.pi_b[0][0])],
        [BigInt(zkProof.pi_b[1][1]), BigInt(zkProof.pi_b[1][0])]
      ]

      const proofC = [
        BigInt(zkProof.pi_c[0]),
        BigInt(zkProof.pi_c[1])
      ]

      // 公共信号（支持12或16个）
      const pubSignals = proof.publicSignals.map(s => BigInt(s))

      console.log('🔍 调用参数:', {
        platform,
        proofA: proofA.map(x => x.toString()),
        proofB: proofB.map(arr => arr.map(x => x.toString())),
        proofC: proofC.map(x => x.toString()),
        pubSignalsCount: pubSignals.length,
        pubSignals: pubSignals.slice(0, 3).map(x => x.toString()),
        provider,
        expiresAt: finalExpiresAt
      })

      // 调用新的多平台合约
      // function registerIdentity(string platform, uint256[2] proofA, uint256[2][2] proofB, uint256[2] proofC, uint256[] pubSignals, string provider, uint256 expiresAt)
      const tx = await this.contract.registerIdentity(
        platform,      // ← 新增：平台参数
        proofA,
        proofB,
        proofC,
        pubSignals,    // ← 动态数组
        provider,
        finalExpiresAt
      )

      console.log('⏳ 交易已提交，等待确认...', tx.hash)
      const receipt = await tx.wait()
      
      console.log('✅ 交易已确认！', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      })

      return { hash: receipt.hash }

    } catch (error: any) {
      console.error('❌ 链上注册失败:', error)
      throw error
    }
  }

  /**
   * 检查用户是否有有效身份（多平台版本）
   */
  async hasValidIdentity(userAddress: string, platform?: string): Promise<boolean> {
    try {
      if (platform) {
        // 检查特定平台
        return await this.contract.hasValidIdentity(userAddress, platform)
      } else {
        // 检查任意平台（重载函数）
        return await this.contract['hasValidIdentity(address)'](userAddress)
      }
    } catch (error) {
      console.error('检查身份失败:', error)
      return false
    }
  }

  /**
   * 获取用户在特定平台的身份证明信息
   */
  async getIdentityProof(userAddress: string, platform: string): Promise<any> {
    try {
      return await this.contract.platformIdentityProofs(userAddress, platform)
    } catch (error) {
      console.error('获取身份证明失败:', error)
      return null
    }
  }
}


