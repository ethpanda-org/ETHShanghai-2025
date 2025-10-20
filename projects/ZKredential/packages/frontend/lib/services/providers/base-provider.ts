// Base Identity Provider - 身份提供商基类

import type {
  IIdentityProvider,
  IdentityProviderConfig,
  VerificationRequest,
  VerificationResponse,
  VerificationSession,
  ProviderError,
  VerificationStatus
} from "../../types/identity-provider"

export abstract class BaseIdentityProvider implements IIdentityProvider {
  abstract config: IdentityProviderConfig
  
  protected sessions: Map<string, VerificationSession> = new Map()
  protected initialized = false

  // 抽象方法 - 子类必须实现
  abstract initialize(): Promise<void>
  abstract startVerification(request: VerificationRequest): Promise<VerificationResponse>
  abstract parseCredential(rawData: any): Promise<any>

  // 通用方法实现
  validateRequest(request: VerificationRequest): boolean {
    if (!request.provider || request.provider !== this.config.id) {
      return false
    }

    // 根据验证方法验证必要字段
    switch (this.config.verificationMethod) {
      case 'upload':
        return !!request.data?.file
      case 'api':
        return !!request.data?.apiKey || !!request.data?.personalInfo
      case 'qrcode':
        return true // QR码验证通常不需要额外数据
      case 'signature':
        return true // 签名验证通常不需要额外数据
      default:
        return false
    }
  }

  async checkStatus(sessionId: string): Promise<VerificationResponse> {
    const session = this.sessions.get(sessionId)
    
    if (!session) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Verification session not found'
        }
      }
    }

    // 检查会话是否过期
    if (Date.now() > session.expiresAt) {
      session.status = 'expired'
      return {
        success: false,
        status: 'expired',
        sessionId,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Verification session has expired'
        }
      }
    }

    // 返回当前状态
    return session.result || {
      success: true,
      status: session.status,
      sessionId,
      progress: this.getProgress(session)
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // 基础健康检查 - 子类可以重写
      return this.initialized
    } catch (error) {
      console.error(`[${this.config.name}] Health check failed:`, error)
      return false
    }
  }

  async cleanup(): Promise<void> {
    // 清理过期会话
    const now = Date.now()
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId)
      }
    }
  }

  // 受保护的辅助方法
  protected generateSessionId(): string {
    return `${this.config.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  protected createSession(
    request: VerificationRequest,
    expirationMinutes = 30
  ): VerificationSession {
    const sessionId = this.generateSessionId()
    const now = Date.now()
    
    const session: VerificationSession = {
      id: sessionId,
      provider: this.config.id,
      userId: request.userId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: now + (expirationMinutes * 60 * 1000),
      data: request.data
    }

    this.sessions.set(sessionId, session)
    return session
  }

  protected updateSession(
    sessionId: string,
    updates: Partial<VerificationSession>
  ): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      Object.assign(session, updates, { updatedAt: Date.now() })
    }
  }

  protected createError(
    code: string,
    message: string,
    retryable = false,
    details?: any
  ): ProviderError {
    return {
      code,
      message,
      provider: this.config.id,
      retryable,
      details
    }
  }

  protected createSuccessResponse(
    sessionId: string,
    credential?: any,
    progress?: any
  ): VerificationResponse {
    return {
      success: true,
      status: 'completed',
      sessionId,
      credential,
      progress
    }
  }

  protected createErrorResponse(
    error: ProviderError,
    sessionId?: string,
    status: VerificationStatus = 'failed'
  ): VerificationResponse {
    return {
      success: false,
      status,
      sessionId,
      error
    }
  }

  protected getProgress(session: VerificationSession): any {
    // 基础进度计算 - 子类可以重写
    switch (session.status) {
      case 'pending':
        return { current: 0, total: 100, stage: 'Initializing' }
      case 'in_progress':
        return { current: 50, total: 100, stage: 'Processing' }
      case 'completed':
        return { current: 100, total: 100, stage: 'Completed' }
      case 'failed':
        return { current: 0, total: 100, stage: 'Failed' }
      case 'expired':
        return { current: 0, total: 100, stage: 'Expired' }
      default:
        return { current: 0, total: 100, stage: 'Unknown' }
    }
  }

  // 文件处理辅助方法
  protected async processFile(file: File): Promise<{
    buffer: ArrayBuffer
    mimeType: string
    size: number
    name: string
  }> {
    if (!file) {
      throw this.createError('INVALID_FILE', 'No file provided')
    }

    // 检查文件大小 (10MB 限制)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw this.createError(
        'FILE_TOO_LARGE',
        `File size exceeds ${maxSize / 1024 / 1024}MB limit`
      )
    }

    // 检查文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      throw this.createError(
        'INVALID_FILE_TYPE',
        'File type not supported. Please upload JPEG, PNG, WebP, or PDF files.'
      )
    }

    try {
      const buffer = await file.arrayBuffer()
      return {
        buffer,
        mimeType: file.type,
        size: file.size,
        name: file.name
      }
    } catch (error) {
      throw this.createError(
        'FILE_PROCESSING_ERROR',
        'Failed to process file',
        true,
        error
      )
    }
  }

  // 数据验证辅助方法
  protected validatePersonalInfo(info: any): boolean {
    if (!info) return false

    const requiredFields = ['firstName', 'lastName', 'dateOfBirth']
    return requiredFields.every(field => info[field] && info[field].trim())
  }

  protected validateDocumentNumber(number: string, type: string): boolean {
    if (!number || !number.trim()) return false

    // 基础格式验证 - 子类可以实现更具体的验证
    switch (type) {
      case 'passport':
        return /^[A-Z0-9]{6,12}$/.test(number.toUpperCase())
      case 'national_id':
        return /^[A-Z0-9]{5,20}$/.test(number.toUpperCase())
      case 'drivers_license':
        return /^[A-Z0-9]{5,15}$/.test(number.toUpperCase())
      default:
        return number.length >= 5 && number.length <= 20
    }
  }

  // 日志记录
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${this.config.name}] ${message}`
    
    switch (level) {
      case 'info':
        console.log(logMessage, data || '')
        break
      case 'warn':
        console.warn(logMessage, data || '')
        break
      case 'error':
        console.error(logMessage, data || '')
        break
    }
  }
}