// Identity Provider Types and Interfaces

export type IdentityProviderType = "zkPass" | "PolygonID" | "LitProtocol" | "CentralizedKYC"

export type VerificationMethod = "upload" | "qrcode" | "signature" | "api"

export type VerificationStatus = "pending" | "in_progress" | "completed" | "failed" | "expired"

// 身份提供商配置
export interface IdentityProviderConfig {
  id: IdentityProviderType
  name: string
  description: string
  recommended: boolean
  verificationMethod: VerificationMethod
  features: string[]
  supportedDocuments?: string[]
  estimatedTime?: string // 预估验证时间
  icon?: string
}

// 验证请求
export interface VerificationRequest {
  provider: IdentityProviderType
  userId?: string
  sessionId?: string
  data?: {
    // 文件上传相关
    file?: File
    documentType?: string
    
    // API相关
    apiKey?: string
    endpoint?: string
    
    // 用户输入数据
    personalInfo?: {
      firstName?: string
      lastName?: string
      dateOfBirth?: string
      nationality?: string
      documentNumber?: string
    }
    
    // 其他自定义数据
    [key: string]: any
  }
  options?: {
    timeout?: number
    retryCount?: number
    webhookUrl?: string
  }
}

// 验证响应
export interface VerificationResponse {
  success: boolean
  status: VerificationStatus
  sessionId?: string
  credential?: {
    id: string
    provider: IdentityProviderType
    publicData: {
      age?: number
      nationality?: string
      idType?: string
      verified: boolean
      accreditedInvestor?: boolean
      netWorth?: number
      kycLevel?: string
      verificationDate?: string
    }
    privateData?: {
      // 加密数据，不暴露
      [key: string]: any
    }
    signature: string
    issuer: string
    issuedAt: number
    expiresAt: number
    metadata?: {
      documentType?: string
      verificationMethod?: string
      confidence?: number
      [key: string]: any
    }
  }
  error?: {
    code: string
    message: string
    details?: any
  }
  progress?: {
    current: number
    total: number
    stage: string
  }
}

// 身份提供商接口
export interface IIdentityProvider {
  config: IdentityProviderConfig
  
  // 初始化提供商
  initialize(): Promise<void>
  
  // 验证请求数据
  validateRequest(request: VerificationRequest): boolean
  
  // 开始验证流程
  startVerification(request: VerificationRequest): Promise<VerificationResponse>
  
  // 检查验证状态
  checkStatus(sessionId: string): Promise<VerificationResponse>
  
  // 解析凭证数据
  parseCredential(rawData: any): Promise<any>
  
  // 健康检查
  healthCheck?(): Promise<boolean>
  
  // 清理资源
  cleanup?(): Promise<void>
}

// 错误类型
export interface ProviderError {
  code: string
  message: string
  provider: IdentityProviderType
  retryable: boolean
  details?: any
}

// 验证会话
export interface VerificationSession {
  id: string
  provider: IdentityProviderType
  userId?: string
  status: VerificationStatus
  createdAt: number
  updatedAt: number
  expiresAt: number
  data?: any
  result?: VerificationResponse
}

// 提供商统计信息
export interface ProviderStats {
  provider: IdentityProviderType
  totalVerifications: number
  successRate: number
  averageTime: number
  lastUsed?: number
  isHealthy: boolean
}

// 文档类型
export type DocumentType = 
  | "passport"
  | "national_id"
  | "drivers_license"
  | "utility_bill"
  | "bank_statement"
  | "other"

// 支持的国家/地区
export interface SupportedRegion {
  code: string // ISO 3166-1 alpha-2
  name: string
  supported: boolean
  restrictions?: string[]
}