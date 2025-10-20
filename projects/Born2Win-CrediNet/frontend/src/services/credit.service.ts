/**
 * 信用评分服务
 * 处理信用评分计算、查询、历史记录等
 */

import { get, post } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import type {
  CreditScoreDetail,
  CreditScoreHistory,
  CreditProfile,
  DataSourceStatus,
  CalculateCreditScoreRequest,
} from '../types/api'

class CreditService {
  /**
   * 计算信用评分
   */
  async calculateScore(forceRefresh: boolean = false): Promise<CreditScoreDetail> {
    const request: CalculateCreditScoreRequest = { force_refresh: forceRefresh }
    const response = await post<CreditScoreDetail>(
      API_ENDPOINTS.CREDIT.CALCULATE,
      request
    )
    return response.data
  }

  /**
   * 获取当前信用评分（缓存）
   */
  async getScore(): Promise<CreditScoreDetail> {
    const response = await get<CreditScoreDetail>(API_ENDPOINTS.CREDIT.GET_SCORE)
    return response.data
  }

  /**
   * 获取信用评分历史
   */
  async getScoreHistory(limit: number = 10): Promise<CreditScoreHistory[]> {
    const response = await get<CreditScoreHistory[]>(
      `${API_ENDPOINTS.CREDIT.HISTORY}?limit=${limit}`
    )
    return response.data
  }

  /**
   * 获取完整信用画像
   */
  async getCreditProfile(): Promise<CreditProfile> {
    const response = await get<CreditProfile>(API_ENDPOINTS.CREDIT.PROFILE)
    return response.data
  }

  /**
   * 获取数据源状态
   */
  async getDataSourcesStatus(): Promise<DataSourceStatus[]> {
    const response = await get<DataSourceStatus[]>(
      API_ENDPOINTS.CREDIT.DATA_SOURCES_STATUS
    )
    return response.data
  }

  /**
   * 格式化信用等级
   */
  formatLevel(score: number): string {
    if (score >= 900) return 'S'
    if (score >= 800) return 'A'
    if (score >= 700) return 'B'
    if (score >= 600) return 'C'
    return 'D'
  }

  /**
   * 获取等级描述
   */
  getLevelDescription(level: string): string {
    const descriptions: Record<string, string> = {
      S: '卓越',
      A: '优秀',
      B: '良好',
      C: '一般',
      D: '较差',
    }
    return descriptions[level] || '未知'
  }

  /**
   * 计算分数变化百分比
   */
  calculateChange(currentScore: number, previousScore: number): number {
    if (previousScore === 0) return 0
    return ((currentScore - previousScore) / previousScore) * 100
  }
}

export default new CreditService()

