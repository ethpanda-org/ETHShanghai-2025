/**
 * CrediNet Mock数据统一导出
 * 
 * ⚠️ 重要：所有组件必须从此文件导入数据，不要直接从data.ts导入
 * 这样可以确保数据的一致性和可追踪性
 */

// 导出所有数据
export {
  // 核心数据
  mockUser,
  mockCreditScore,
  mockCRNBalance,
  mockDataSources,
  mockUsageRecords,
  mockSBTBadges,
  mockEcoApps,
  mockDataAuthorizations,
  
  // 配置数据
  creditDimensions,
  appCategories,
  
  // 统计数据
  dataStats,
  
  // 工具函数
  getFormattedCRNBalance,
  getFormattedCreditScore,
} from './data'

// 导出类型
export type {
  User,
  CreditScore,
  CRNBalance,
  DataSource,
  UsageRecord,
  SBTBadge,
  EcoApp,
  DataAuthorization
} from '@/types'

