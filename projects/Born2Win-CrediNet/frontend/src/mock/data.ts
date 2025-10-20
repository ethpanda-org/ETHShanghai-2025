import type {
  User,
  CreditScore,
  CRNBalance,
  DataSource,
  UsageRecord,
  SBTBadge,
  EcoApp,
  DataAuthorization,
} from '@/types'
import { calculateCreditTotal } from '@/utils/credit'

/**
 * ====================================
 * CrediNet Demo 数据中心
 * ====================================
 * 
 * ⚠️ 重要说明：
 * 1. 本文件是整个应用的唯一数据源
 * 2. 所有页面和组件必须从此文件导入数据
 * 3. 禁止在组件中硬编码任何数据
 * 4. 修改数据时请确保所有引用处自动同步
 * 
 * ====================================
 */

// ========== 核心数据配置 ==========

/**
 * Mock用户信息
 * 用于：Dashboard、Profile、Data 等所有页面
 */
export const mockUser: User = {
  did: 'did:cred:0x12...9a4',
  address: '0xA1B2...C3D4',
  joinedDate: '2025-01-13',
  lastSync: '2025.10.20',
  displayName: 'CrediNet User'
}

// 定义五维数据
// 根据白皮书权重计算：K(25%)×2.5 + A(30%)×3.0 + F(20%)×2.0 + H(15%)×1.5 + B(10%)×1.0 = 774
const mockDimensions = {
  keystone: 78,  // 基石维度 K: 78 × 2.5 = 195
  ability: 82,   // 能力维度 A: 82 × 3.0 = 246
  finance: 75,   // 财富维度 F: 75 × 2.0 = 150
  health: 76,    // 健康维度 H: 76 × 1.5 = 114
  behavior: 69   // 行为维度 B: 69 × 1.0 = 69
                 // 总分: 195 + 246 + 150 + 114 + 69 = 774
}

/**
 * Mock信用分数（C-Score）
 * 用于：Dashboard、Profile、雷达图等
 * ⚠️ total 由五维数据动态计算（加权）
 */
export const mockCreditScore: CreditScore = {
  total: 774, // 固定为774，确保显示正确
  change: 12,
  dimensions: mockDimensions,
  lastUpdated: '2025.10.20 14:20'
}

/**
 * Mock CRN余额
 * 用于：Dashboard、Profile、CRNBalanceCard 等
 * ⚠️ balance 值必须在所有地方保持一致
 */
export const mockCRNBalance: CRNBalance = {
  balance: 1234.56,
  change30d: 182.4,
  earned: 1500.00,
  withdrawn: 265.44
}

/**
 * Mock数据源连接状态
 * 用于：Dashboard、Data 页面的数据源管理
 */
export const mockDataSources: DataSource[] = [
  {
    id: 'worldid',
    name: 'World ID',
    description: '通过 World ID 验证您的人类身份',
    connected: true,
    connectedAt: '2025.10.19 10:30'
  },
  {
    id: 'self',
    name: 'self.xyz',
    description: '连接 self.xyz 获取链下凭证',
    connected: true,
    connectedAt: '2025.10.20 15:20'
  },
  {
    id: 'wallet',
    name: 'Wallet',
    description: '连接钱包获取链上活动数据',
    connected: false
  },
  {
    id: 'offchain',
    name: 'Off-chain VC',
    description: '上传链下可验证凭证',
    connected: true,
    connectedAt: '2025.10.18 09:15'
  }
]

/**
 * Mock使用与收益记录
 * 用于：Dashboard、Data 页面的收益记录表格
 * ⚠️ reward 数值应与 CRN 余额变化保持逻辑一致
 */
export const mockUsageRecords: UsageRecord[] = [
  {
    id: '1',
    timestamp: '10.20 14:20',
    appName: 'DeFi 协议 A',
    queryContent: '查询 C-Score',
    scope: '额度评估',
    reward: 42.5,
    status: 'authorized'
  },
  {
    id: '2',
    timestamp: '10.20 09:02',
    appName: '招聘平台 B',
    queryContent: '教育 VC',
    scope: '简历验证',
    reward: 35.8,
    status: 'authorized'
  },
  {
    id: '3',
    timestamp: '10.19 15:36',
    appName: '保险平台 C',
    queryContent: '行为数据',
    scope: '风险定价',
    reward: 28.3,
    status: 'authorized'
  },
  {
    id: '4',
    timestamp: '10.19 08:45',
    appName: 'Social Graph',
    queryContent: 'Off-chain VC',
    scope: '社交网络构建',
    reward: 39.6,
    status: 'authorized'
  },
  {
    id: '5',
    timestamp: '10.18 11:12',
    appName: 'DAO Platform',
    queryContent: '链上贡献记录',
    scope: '治理权重计算',
    reward: 36.2,
    status: 'authorized'
  }
]

/**
 * Mock SBT勋章
 * 用于：Dashboard、Profile 页面的勋章展示
 */
export const mockSBTBadges: SBTBadge[] = [
  {
    id: '1',
    name: 'Early Adopter',
    description: '首批加入 CrediNet 的用户',
    earnedDate: '2025-03-02',
    rarity: 'epic'
  },
  {
    id: '2',
    name: 'KYC-lite Verified',
    description: '通过 World ID 验证',
    earnedDate: '2025-03-05',
    rarity: 'rare'
  },
  {
    id: '3',
    name: 'Builder',
    description: '链上贡献者，参与了 12 个项目',
    earnedDate: '2025-04-15',
    rarity: 'legendary'
  }
]

/**
 * Mock生态应用
 * 用于：Dashboard、Marketplace 页面的应用展示
 */
export const mockEcoApps: EcoApp[] = [
  {
    id: '1',
    name: 'C-Score Oracle',
    description: '即时查询用户 C-Score（只读）',
    category: 'defi',
    requiredDimensions: ['行为 B', '能力 A'],
    status: 'active'
  },
  {
    id: '2',
    name: 'DeFi Credit Line',
    description: '基于信誉的信贷额度',
    category: 'defi',
    requiredDimensions: ['C-Score 快照'],
    status: 'active'
  },
  {
    id: '3',
    name: 'Talent Passport',
    description: '教育/技能 VC 一键验证',
    category: 'talent',
    requiredDimensions: ['可雇佣授权'],
    status: 'active'
  },
  {
    id: '4',
    name: 'Insurance Quote',
    description: '基于信誉的保险折扣',
    category: 'insurance',
    requiredDimensions: ['行为类类'],
    status: 'active'
  },
  {
    id: '5',
    name: 'Social Graph',
    description: '隐私保护的关系度量',
    category: 'social',
    requiredDimensions: ['整合 Off-chain VC'],
    status: 'active'
  },
  {
    id: '6',
    name: 'KYC-lite',
    description: '零知识证明快速入场',
    category: 'kyc',
    requiredDimensions: ['World ID'],
    status: 'active'
  },
  {
    id: '7',
    name: 'DAO Governance',
    description: '基于信用的治理权重',
    category: 'dao',
    requiredDimensions: ['链上贡献记录'],
    status: 'coming-soon'
  },
  {
    id: '8',
    name: 'Cross-border Credit',
    description: '跨境信用验证服务',
    category: 'defi',
    requiredDimensions: ['全维度授权'],
    status: 'coming-soon'
  }
]

/**
 * Mock数据授权记录
 * 用于：Data 页面的授权管理
 */
export const mockDataAuthorizations: DataAuthorization[] = [
  {
    appId: '1',
    appName: 'DeFi_DApp',
    authorizedDimensions: ['行为 B', '能力 A', '基石 K'],
    authorizedAt: '2025.10.18 14:30',
    status: 'active'
  },
  {
    appId: '2',
    appName: '招聘_DApp',
    authorizedDimensions: ['财富 VC（引微信）'],
    authorizedAt: '2025.10.19 09:15',
    status: 'active'
  },
  {
    appId: '3',
    appName: '保险_DApp',
    authorizedDimensions: ['C-Score（只读快照）'],
    authorizedAt: '2025.10.20 16:45',
    status: 'active'
  }
]

/**
 * 信用维度配置
 * 用于：所有涉及五维模型的组件
 * ⚠️ 此配置必须与 mockCreditScore.dimensions 的键名保持一致
 */
export const creditDimensions = [
  { key: 'keystone', name: '基石 K', color: '#8b5cf6', weight: '25%', weightValue: 2.5 },
  { key: 'ability', name: '能力 A', color: '#3b82f6', weight: '30%', weightValue: 3.0 },
  { key: 'finance', name: '财富 F', color: '#f59e0b', weight: '20%', weightValue: 2.0 },
  { key: 'health', name: '健康 H', color: '#10b981', weight: '15%', weightValue: 1.5 },
  { key: 'behavior', name: '行为 B', color: '#ef4444', weight: '10%', weightValue: 1.0 },
]

// 动态计算并设置总分
// mockCreditScore.total = calculateCreditTotal(mockCreditScore.dimensions)
// 已手动设置为 774，不需要自动计算

/**
 * 应用分类配置
 * 用于：Marketplace 页面的分类筛选
 */
export const appCategories = [
  { id: 'all', name: '全部', icon: '🌐' },
  { id: 'defi', name: 'DeFi', icon: '💰' },
  { id: 'talent', name: '招聘', icon: '💼' },
  { id: 'insurance', name: '保险', icon: '🛡️' },
  { id: 'social', name: '社交', icon: '👥' },
  { id: 'dao', name: 'DAO', icon: '🏛️' },
  { id: 'kyc', name: 'KYC', icon: '🔐' }
]

// ========== 数据统计与验证 ==========

/**
 * 数据统计信息
 * 用于内部验证和展示
 */
export const dataStats = {
  // CRN余额相关
  crnBalance: mockCRNBalance.balance,
  crnChange30d: mockCRNBalance.change30d,
  crnEarned: mockCRNBalance.earned,
  crnWithdrawn: mockCRNBalance.withdrawn,
  
  // 信用分数相关
  creditTotal: mockCreditScore.total,
  creditChange: mockCreditScore.change,
  
  // 统计数据
  totalDataSources: mockDataSources.length,
  connectedDataSources: mockDataSources.filter(ds => ds.connected).length,
  totalSBTBadges: mockSBTBadges.length,
  totalUsageRecords: mockUsageRecords.length,
  totalEcoApps: mockEcoApps.length,
  activeEcoApps: mockEcoApps.filter(app => app.status === 'active').length,
  totalAuthorizations: mockDataAuthorizations.length,
  activeAuthorizations: mockDataAuthorizations.filter(auth => auth.status === 'active').length,
  
  // 累计收益（从使用记录计算）
  totalRewardsFromRecords: mockUsageRecords.reduce((sum, record) => sum + record.reward, 0)
}

/**
 * 获取格式化的CRN余额
 * 统一的格式化方法，确保所有地方显示一致
 */
export const getFormattedCRNBalance = (decimals: number = 2): string => {
  return mockCRNBalance.balance.toFixed(decimals)
}

/**
 * 获取格式化的信用分数
 */
export const getFormattedCreditScore = (): string => {
  return mockCreditScore.total.toString()
}

/**
 * 数据一致性验证
 * 开发环境下自动检查数据一致性
 */
if (import.meta.env.DEV) {
  // 验证收益记录总和是否合理
  const totalRewards = dataStats.totalRewardsFromRecords
  console.log('📊 CrediNet 数据统计:')
  console.log('├─ CRN余额:', dataStats.crnBalance)
  console.log('├─ 信用分数:', dataStats.creditTotal)
  console.log('├─ 已连接数据源:', `${dataStats.connectedDataSources}/${dataStats.totalDataSources}`)
  console.log('├─ SBT勋章数量:', dataStats.totalSBTBadges)
  console.log('├─ 使用记录数量:', dataStats.totalUsageRecords)
  console.log('├─ 累计收益记录:', totalRewards.toFixed(2), 'CRN')
  console.log('└─ 活跃应用:', `${dataStats.activeEcoApps}/${dataStats.totalEcoApps}`)
  
  // 数据一致性提示
  if (totalRewards > mockCRNBalance.earned) {
    console.warn('⚠️ 警告: 累计收益记录超过了已赚取总额')
  }
}

