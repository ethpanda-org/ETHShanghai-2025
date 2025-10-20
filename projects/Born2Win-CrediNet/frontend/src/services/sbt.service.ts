/**
 * SBT 服务
 * 处理 SBT 发放、查询等
 */

import { get, post } from './apiClient'
import { API_ENDPOINTS } from '../config/api'
import type {
  SBTInfo,
  EligibleSBT,
  SBTStatistics,
  IssueSBTRequest,
} from '../types/api'

class SBTService {
  /**
   * 自动发放 SBT
   */
  async autoIssue(): Promise<{ issued_sbts: SBTInfo[]; eligible_sbts: EligibleSBT[] }> {
    const response = await post<{ issued_sbts: SBTInfo[]; eligible_sbts: EligibleSBT[] }>(
      API_ENDPOINTS.SBT.AUTO_ISSUE
    )
    return response.data
  }

  /**
   * 手动发放 SBT
   */
  async issue(sbtType: string, walletAddress?: string): Promise<SBTInfo> {
    const request: IssueSBTRequest = {
      sbt_type: sbtType,
      wallet_address: walletAddress,
    }
    const response = await post<SBTInfo>(API_ENDPOINTS.SBT.ISSUE, request)
    return response.data
  }

  /**
   * 获取我的 SBT 列表
   */
  async getMySBTs(status?: 'pending' | 'confirmed' | 'failed'): Promise<SBTInfo[]> {
    const url = status
      ? `${API_ENDPOINTS.SBT.MY_SBTS}?status=${status}`
      : API_ENDPOINTS.SBT.MY_SBTS
    const response = await get<SBTInfo[]>(url)
    return response.data
  }

  /**
   * 获取 SBT 详情
   */
  async getSBTDetail(id: string): Promise<SBTInfo> {
    const response = await get<SBTInfo>(API_ENDPOINTS.SBT.DETAIL(id))
    return response.data
  }

  /**
   * 获取符合条件的 SBT
   */
  async getEligibleSBTs(): Promise<EligibleSBT[]> {
    const response = await get<EligibleSBT[]>(API_ENDPOINTS.SBT.ELIGIBLE)
    return response.data
  }

  /**
   * 获取 SBT 统计信息
   */
  async getStatistics(): Promise<SBTStatistics> {
    const response = await get<SBTStatistics>(API_ENDPOINTS.SBT.STATISTICS)
    return response.data
  }

  /**
   * 格式化 SBT 类型名称
   */
  formatSBTType(type: string): string {
    const names: Record<string, string> = {
      HighCreditUser: '高信用用户',
      TopCreditUser: '顶级信用用户',
      CodeContributor: '代码贡献者',
      ActiveDeveloper: '活跃开发者',
      DeFiExpert: 'DeFi专家',
      ActiveTrader: '活跃交易者',
      WhaleUser: '大户',
      SocialInfluencer: '社交影响者',
      VerifiedIdentity: '已验证身份',
      EarlyAdopter: '早期用户',
    }
    return names[type] || type
  }

  /**
   * 获取 SBT 状态描述
   */
  getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      pending: '待确认',
      confirmed: '已确认',
      failed: '失败',
    }
    return descriptions[status] || '未知'
  }
}

export default new SBTService()

