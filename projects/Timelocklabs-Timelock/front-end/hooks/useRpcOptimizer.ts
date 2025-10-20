/**
 * RPC 请求优化器
 * 实现请求去重、批量查询、速率限制等功能
 */

'use client';

import { useCallback, useRef } from 'react';

interface PendingRequest<T = any> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface BatchRequestConfig {
  maxBatchSize?: number;
  batchTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class RpcOptimizer {
  private pendingRequests = new Map<string, PendingRequest>();
  private batchQueue: Array<{ key: string; request: () => Promise<any> }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private rateLimiter = new Map<string, number>();
  
  constructor(private config: BatchRequestConfig = {}) {
    this.config = {
      maxBatchSize: 10,
      batchTimeout: 100,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * 请求去重 - 相同的请求只执行一次
   */
  deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // 检查是否已有相同的请求在进行中
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    // 创建新的请求
    let resolve: (value: T) => void;
    let reject: (error: any) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const pendingRequest: PendingRequest<T> = {
      promise,
      resolve: resolve!,
      reject: reject!,
      timestamp: Date.now(),
    };

    this.pendingRequests.set(key, pendingRequest);

    // 执行请求
    requestFn()
      .then((result) => {
        pendingRequest.resolve(result);
        this.pendingRequests.delete(key);
      })
      .catch((error) => {
        pendingRequest.reject(error);
        this.pendingRequests.delete(key);
      });

    return promise;
  }

  /**
   * 批量请求处理
   */
  batch<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // 添加到批量队列
      this.batchQueue.push({
        key,
        request: async () => {
          try {
            const result = await requestFn();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
      });

      // 如果队列达到最大批次大小，立即处理
      if (this.batchQueue.length >= this.config.maxBatchSize!) {
        this.processBatch();
      } else {
        // 否则设置定时器
        if (this.batchTimer) {
          clearTimeout(this.batchTimer);
        }
        
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.config.batchTimeout);
      }
    });
  }

  private async processBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) {
      return;
    }

    const batch = this.batchQueue.splice(0);
    
    // 并发执行批次中的请求，但限制并发数
    const concurrencyLimit = 5;
    for (let i = 0; i < batch.length; i += concurrencyLimit) {
      const chunk = batch.slice(i, i + concurrencyLimit);
      await Promise.allSettled(
        chunk.map(item => item.request())
      );
    }
  }

  /**
   * 速率限制 - 防止过于频繁的请求
   */
  rateLimit(key: string, limitMs: number = 1000): boolean {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(key);
    
    if (lastRequest && now - lastRequest < limitMs) {
      return false; // 被速率限制
    }
    
    this.rateLimiter.set(key, now);
    return true;
  }

  /**
   * 重试机制
   */
  async withRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries!,
    delay: number = this.config.retryDelay!
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // 检查是否是 429 错误
        const is429Error = error?.status === 429 || 
                          error?.code === 429 || 
                          error?.message?.includes('429') ||
                          error?.message?.includes('rate limit');
        
        if (is429Error && attempt < maxRetries) {
          // 对于 429 错误，使用指数退避
          const backoffDelay = delay * Math.pow(2, attempt) + Math.random() * 1000;
          await this.sleep(backoffDelay);
          continue;
        }
        
        if (attempt < maxRetries) {
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }
    
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理过期的请求
   */
  cleanup(maxAge: number = 5 * 60 * 1000) {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        request.reject(new Error('Request timeout'));
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      batchQueueSize: this.batchQueue.length,
      rateLimiterEntries: this.rateLimiter.size,
    };
  }
}

// 全局 RPC 优化器实例
const globalRpcOptimizer = new RpcOptimizer({
  maxBatchSize: 8,
  batchTimeout: 200,
  maxRetries: 3,
  retryDelay: 1000,
});

export function useRpcOptimizer() {
  const optimizerRef = useRef(globalRpcOptimizer);

  const optimizedRequest = useCallback(
    <T>(
      key: string,
      requestFn: () => Promise<T>,
      options: {
        enableDeduplication?: boolean;
        enableBatching?: boolean;
        enableRateLimit?: boolean;
        enableRetry?: boolean;
        rateLimitMs?: number;
      } = {}
    ): Promise<T> => {
      const {
        enableDeduplication = true,
        enableBatching = false,
        enableRateLimit = true,
        enableRetry = true,
        rateLimitMs = 1000,
      } = options;

      const optimizer = optimizerRef.current;

      // 创建包装的请求函数
      let wrappedRequest = requestFn;

      // 应用速率限制
      if (enableRateLimit && !optimizer.rateLimit(key, rateLimitMs)) {
        return Promise.reject(new Error('Rate limit exceeded'));
      }

      // 应用重试机制
      if (enableRetry) {
        wrappedRequest = () => optimizer.withRetry(requestFn);
      }

      // 应用批量处理
      if (enableBatching) {
        return optimizer.batch(key, wrappedRequest);
      }

      // 应用请求去重
      if (enableDeduplication) {
        return optimizer.deduplicate(key, wrappedRequest);
      }

      return wrappedRequest();
    },
    []
  );

  const getOptimizerStats = useCallback(() => {
    return optimizerRef.current.getStats();
  }, []);

  const cleanupOptimizer = useCallback((maxAge?: number) => {
    optimizerRef.current.cleanup(maxAge);
  }, []);

  return {
    optimizedRequest,
    getOptimizerStats,
    cleanupOptimizer,
  };
}

export { RpcOptimizer };