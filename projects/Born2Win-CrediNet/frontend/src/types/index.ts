// 用户信息
export interface User {
  did: string
  address: string
  joinedDate: string
  lastSync: string
  displayName?: string
}

// 信用分数
export interface CreditScore {
  total: number
  change: number
  dimensions: {
    keystone: number  // 基石 K
    ability: number   // 能力 A
    finance: number   // 财富 F
    health: number    // 健康 H
    behavior: number  // 行为 B
  }
  lastUpdated: string
}

// CRN余额
export interface CRNBalance {
  balance: number
  change30d: number
  earned: number
  withdrawn: number
}

// 数据源
export interface DataSource {
  id: 'worldid' | 'self' | 'wallet' | 'offchain'
  name: string
  description: string
  connected: boolean
  connectedAt?: string
}

// 使用记录
export interface UsageRecord {
  id: string
  timestamp: string
  appName: string
  queryContent: string
  scope: string
  reward: number
  status?: 'authorized' | 'revoked'
}

// SBT勋章
export interface SBTBadge {
  id: string
  name: string
  description: string
  earnedDate: string
  imageUrl?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
}

// 生态应用
export interface EcoApp {
  id: string
  name: string
  description: string
  category: 'defi' | 'talent' | 'insurance' | 'social' | 'dao' | 'kyc'
  requiredDimensions: string[]
  iconUrl?: string
  status?: 'active' | 'coming-soon'
}

// 数据授权
export interface DataAuthorization {
  appId: string
  appName: string
  authorizedDimensions: string[]
  authorizedAt: string
  status: 'active' | 'revoked'
}

