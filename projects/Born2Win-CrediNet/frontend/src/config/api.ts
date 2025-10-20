/**
 * API 配置文件
 * 后端 API 基础配置
 */

// API 基础配置
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080',
  API_PREFIX: '/api',
  TIMEOUT: 30000, // 30秒超时
}

// 完整 API URL
export const API_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`

// API 端点
export const API_ENDPOINTS = {
  // 认证模块
  AUTH: {
    SEND_CODE: '/auth/send_code',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
  },
  
  // DID 管理
  DID: {
    CREATE: '/did/create',
    GET: (did: string) => `/did/${did}`,
    DOCUMENT: (did: string) => `/did/${did}/document`,
    UPDATE_DOCUMENT: (did: string) => `/did/${did}/document`,
    REGISTER: (did: string) => `/did/${did}/register`,
    RESOLVE: '/did/resolve',
  },
  
  // 用户相关
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    BINDINGS: '/user/bindings',
    
    // 钱包连接
    WALLET_CONNECT: '/user/wallet/connect',
    WALLET_PRIMARY: '/user/wallet/primary',
    WALLET_LIST: '/user/wallet/list',
    WALLET_REMOVE: '/user/wallet/remove',
    
    // 身份验证
    VERIFY_WORLDCOIN: '/user/verify/worldcoin',
    BIND_SOCIAL: '/user/bind/social',
  },
  
  // 授权模块
  AUTHORIZATION: {
    GRANT: '/authorization/grant',
    REVOKE: '/authorization/revoke',
    STATUS: '/authorization/status',
    LOGS: '/authorization/logs',
  },
  
  // 信用评分
  CREDIT: {
    CALCULATE: '/credit/calculate',
    GET_SCORE: '/credit/score',
    HISTORY: '/credit/history',
    PROFILE: '/credit/profile',
    DATA_SOURCES_STATUS: '/credit/data_sources',
  },
  
  // SBT
  SBT: {
    AUTO_ISSUE: '/sbt/auto-issue',
    ISSUE: '/sbt/issue',
    MY_SBTS: '/sbt/my-sbts',
    DETAIL: (id: string) => `/sbt/${id}`,
    ELIGIBLE: '/sbt/eligible',
    STATISTICS: '/sbt/statistics',
  },
}

// Token 存储键
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  EXPIRES_IN: 'expires_in',
}

// 数据源类型
export const DATA_SOURCES = {
  GITHUB: 'github',
  WALLET: 'wallet',
  TWITTER: 'twitter',
  WORLDCOIN: 'worldcoin',
  FACEBOOK: 'facebook',
  WECHAT: 'wechat',
} as const

// 信用等级
export const CREDIT_LEVELS = {
  S: { min: 900, max: 1000, label: '卓越' },
  A: { min: 800, max: 899, label: '优秀' },
  B: { min: 700, max: 799, label: '良好' },
  C: { min: 600, max: 699, label: '一般' },
  D: { min: 0, max: 599, label: '较差' },
} as const

// SBT 类型
export const SBT_TYPES = {
  HIGH_CREDIT_USER: 'HighCreditUser',
  TOP_CREDIT_USER: 'TopCreditUser',
  CODE_CONTRIBUTOR: 'CodeContributor',
  ACTIVE_DEVELOPER: 'ActiveDeveloper',
  DEFI_EXPERT: 'DeFiExpert',
  ACTIVE_TRADER: 'ActiveTrader',
  WHALE_USER: 'WhaleUser',
  SOCIAL_INFLUENCER: 'SocialInfluencer',
  VERIFIED_IDENTITY: 'VerifiedIdentity',
  EARLY_ADOPTER: 'EarlyAdopter',
} as const

// SBT 状态
export const SBT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const

