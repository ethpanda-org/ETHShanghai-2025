// Retry mechanism and error handling utilities

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number // 基础延迟时间（毫秒）
  maxDelay: number // 最大延迟时间（毫秒）
  backoffMultiplier: number // 退避倍数
  jitter: boolean // 是否添加随机抖动
}

export interface ErrorClassification {
  category: 'network' | 'authentication' | 'validation' | 'rate_limit' | 'server_error' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  retryable: boolean
  userMessage: string
}

// 错误分类器
export class ErrorClassifier {
  static classify(error: any): ErrorClassification {
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorCode = error?.code || error?.status || 0

    // 网络错误
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorCode === 'NETWORK_ERROR') {
      return {
        category: 'network',
        severity: 'medium',
        retryable: true,
        userMessage: '网络连接异常，请检查网络后重试'
      }
    }

    // 认证错误
    if (errorCode === 401 || errorCode === 403 || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return {
        category: 'authentication',
        severity: 'high',
        retryable: false,
        userMessage: '身份验证失败，请检查凭据'
      }
    }

    // 验证错误
    if (errorCode === 400 || errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        category: 'validation',
        severity: 'medium',
        retryable: false,
        userMessage: '请求数据格式错误，请检查输入'
      }
    }

    // 限流错误
    if (errorCode === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return {
        category: 'rate_limit',
        severity: 'medium',
        retryable: true,
        userMessage: '请求过于频繁，请稍后重试'
      }
    }

    // 服务器错误
    if (errorCode >= 500 || errorMessage.includes('server error') || errorMessage.includes('internal error')) {
      return {
        category: 'server_error',
        severity: 'high',
        retryable: true,
        userMessage: '服务暂时不可用，请稍后重试'
      }
    }

    // 未知错误
    return {
      category: 'unknown',
      severity: 'medium',
      retryable: false,
      userMessage: '操作失败，请重试或联系支持'
    }
  }
}

// 重试策略
export class RetryStrategy {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: any
    let attempt = 0

    while (attempt < this.config.maxAttempts) {
      try {
        const result = await operation()
        if (attempt > 0) {
          console.log(`[RetryStrategy] Operation succeeded on attempt ${attempt + 1}${context ? ` (${context})` : ''}`)
        }
        return result
      } catch (error) {
        lastError = error
        attempt++

        const classification = ErrorClassifier.classify(error)
        
        // 如果错误不可重试，直接抛出
        if (!classification.retryable) {
          console.error(`[RetryStrategy] Non-retryable error${context ? ` (${context})` : ''}:`, error)
          throw error
        }

        // 如果已达到最大重试次数，抛出最后的错误
        if (attempt >= this.config.maxAttempts) {
          console.error(`[RetryStrategy] Max attempts reached${context ? ` (${context})` : ''}:`, error)
          throw error
        }

        // 计算延迟时间
        const delay = this.calculateDelay(attempt)
        console.warn(`[RetryStrategy] Attempt ${attempt} failed${context ? ` (${context})` : ''}, retrying in ${delay}ms:`, error.message)
        
        // 等待后重试
        await this.sleep(delay)
      }
    }

    throw lastError
  }

  private calculateDelay(attempt: number): number {
    // 指数退避算法
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1)
    
    // 限制最大延迟
    delay = Math.min(delay, this.config.maxDelay)
    
    // 添加随机抖动以避免雷群效应
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }
    
    return Math.floor(delay)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 断路器模式
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private successCount = 0

  constructor(
    private failureThreshold: number,
    private recoveryTimeout: number,
    private successThreshold: number = 1
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        throw new Error('Circuit breaker is OPEN')
      } else {
        this.state = 'HALF_OPEN'
        this.successCount = 0
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED'
      }
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getState(): string {
    return this.state
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    }
  }
}

// 预定义的重试策略
export const RETRY_STRATEGIES = {
  // 网络请求重试策略
  NETWORK: new RetryStrategy({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  }),

  // 身份验证重试策略
  IDENTITY_VERIFICATION: new RetryStrategy({
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true
  }),

  // 文件上传重试策略
  FILE_UPLOAD: new RetryStrategy({
    maxAttempts: 3,
    baseDelay: 1500,
    maxDelay: 8000,
    backoffMultiplier: 2,
    jitter: true
  }),

  // API调用重试策略
  API_CALL: new RetryStrategy({
    maxAttempts: 4,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true
  })
}

// 工具函数
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ])
}

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}