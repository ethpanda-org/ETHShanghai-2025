// KYC提供商工厂 - 使用百度智能云

import { KYCUserData, KYCProviderConfig } from './base-kyc-provider'
import { BaiduAIKYCProvider } from './baidu-ai-provider'

export type KYCProviderType = 'baidu'

export interface KYCProviderSelection {
  provider: KYCProviderType
  reason: string
  score: number
  alternatives: Array<{
    provider: KYCProviderType
    score: number
    reason: string
  }>
}

export class KYCProviderFactory {
  private providers: Map<KYCProviderType, KYCProviderConfig> = new Map()
  private instances: Map<KYCProviderType, IKYCProvider> = new Map()

  constructor() {
    this.initializeDefaultConfigs()
  }

  // 注册KYC提供商配置
  registerProvider(type: KYCProviderType, config: KYCProviderConfig): void {
    this.providers.set(type, config)
    // 清除已缓存的实例
    this.instances.delete(type)
  }

  // 获取KYC提供商实例
  getProvider(type: KYCProviderType = 'baidu'): BaiduAIKYCProvider {
    if (this.instances.has(type)) {
      return this.instances.get(type)!
    }

    const config = this.providers.get(type)
    if (!config || !config.enabled) {
      throw new Error(`百度AI未配置。请在.env.local中设置BAIDU_AI_API_KEY和BAIDU_AI_SECRET_KEY`)
    }

    const baiduConfig = {
      apiKey: process.env.BAIDU_AI_API_KEY || '',
      secretKey: process.env.BAIDU_AI_SECRET_KEY || ''
    }
    
    const provider = new BaiduAIKYCProvider(baiduConfig)

    this.instances.set(type, provider as any)
    return provider
  }

  // 选择KYC提供商（目前只有百度）
  selectBestProvider(
    userData: KYCUserData,
    requirements: {
      urgency?: 'low' | 'medium' | 'high'
      budget?: 'low' | 'medium' | 'high'
      features?: string[]
      region?: string
    } = {}
  ): KYCProviderSelection {
    // 直接返回百度AI
    return {
      provider: 'baidu',
      reason: '使用百度智能云进行身份验证 - 个人可用，完全免费',
      score: 100,
      alternatives: []
    }
  }

  // 获取所有可用提供商
  getAvailableProviders(): KYCProviderType[] {
    return Array.from(this.providers.entries())
      .filter(([_, config]) => config.enabled)
      .map(([type, _]) => type)
  }

  // 获取提供商配置
  getProviderConfig(type: KYCProviderType): KYCProviderConfig | undefined {
    return this.providers.get(type)
  }

  // 初始化默认配置
  private initializeDefaultConfigs(): void {
    // 百度智能云配置（唯一的KYC提供商）
    const baiduApiKey = process.env.BAIDU_AI_API_KEY || ''
    const baiduSecretKey = process.env.BAIDU_AI_SECRET_KEY || ''
    const isBaiduEnabled = baiduApiKey && baiduSecretKey && 
                          baiduApiKey !== 'demo' && baiduSecretKey !== 'demo' &&
                          baiduApiKey.length > 10 && baiduSecretKey.length > 10

    this.providers.set('baidu', {
      name: 'baidu',
      displayName: '百度智能云人脸识别',
      enabled: isBaiduEnabled,
      supportedRegions: ['CN'], // 中国
      supportedDocuments: ['id_card'], // 身份证
      features: ['document_verification', 'face_detection', 'face_quality'],
      averageProcessingTime: 10, // 10秒（含延迟）
      successRate: 0.95,
      costPerVerification: 0, // 完全免费！
      priority: 10
    })
  }

  // 健康检查
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {}
    
    for (const [type, config] of this.providers.entries()) {
      if (config.enabled) {
        try {
          const provider = this.getProvider(type)
          if ('healthCheck' in provider && typeof provider.healthCheck === 'function') {
            results[type] = await provider.healthCheck()
          } else {
            results[type] = true
          }
        } catch (error) {
          results[type] = false
        }
      }
    }
    
    return results
  }
}

// 单例实例
export const kycProviderFactory = new KYCProviderFactory()





























