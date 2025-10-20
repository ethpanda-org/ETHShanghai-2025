/**
 * API 相关类型定义
 * 与后端 API 响应格式对应
 */

// ==================== 认证模块 ====================

export interface LoginRequest {
  contact: string
  code: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user_id: string
  expires_in: number
}

export interface SendCodeRequest {
  contact: string
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
}

// ==================== DID 模块 ====================

export interface DIDDocument {
  '@context': string[]
  id: string
  authentication: any[]
  verificationMethod: any[]
  service: any[]
}

export interface DIDInfo {
  did: string
  document: DIDDocument
  created_at: string
  updated_at: string
}

// ==================== 用户模块 ====================

export interface UserProfile {
  user_id: string
  email?: string
  phone?: string
  username?: string
  avatar?: string
  did?: string
  created_at: string
  updated_at: string
}

export interface WalletInfo {
  address: string
  chain_type: 'ethereum' | 'polygon' | 'bsc' | 'solana'
  is_primary: boolean
  connected_at: string
}

export interface SocialBinding {
  provider: 'github' | 'twitter' | 'facebook' | 'wechat'
  provider_user_id: string
  username: string
  avatar?: string
  connected_at: string
}

export interface UserBindings {
  wallets: WalletInfo[]
  social_accounts: SocialBinding[]
  worldcoin_verified: boolean
}

// ==================== 信用评分模块 ====================

export interface CreditScoreBreakdown {
  score: number
  weight: number
  contribution: number
}

export interface CreditScoreDetail {
  total_score: number
  level: 'S' | 'A' | 'B' | 'C' | 'D'
  breakdown: {
    technical: CreditScoreBreakdown
    financial: CreditScoreBreakdown
    social: CreditScoreBreakdown
    identity: CreditScoreBreakdown
  }
  labels: string[]
  version: string
  calculated_at: string
}

export interface CreditScoreHistory {
  score: number
  level: string
  calculated_at: string
}

export interface CreditProfile {
  user_id: string
  did: string
  score: CreditScoreDetail
  data_sources: {
    github?: any
    wallet?: any
    twitter?: any
    worldcoin?: any
  }
  last_updated: string
}

export interface DataSourceStatus {
  source: string
  status: 'active' | 'inactive' | 'fetching' | 'error'
  last_fetch: string | null
  next_fetch: string | null
  error_message: string | null
}

// ==================== SBT 模块 ====================

export interface SBTInfo {
  id: string
  user_id: string
  wallet_address: string
  sbt_type: string
  token_id: string
  tx_hash: string
  status: 'pending' | 'confirmed' | 'failed'
  metadata: {
    name: string
    description: string
    image: string
    attributes: Array<{
      trait_type: string
      value: string | number
    }>
  }
  issued_at: string
  confirmed_at?: string
}

export interface EligibleSBT {
  sbt_type: string
  name: string
  description: string
  requirements: string[]
  is_eligible: boolean
}

export interface SBTStatistics {
  total_issued: number
  confirmed: number
  pending: number
  failed: number
  by_type: Record<string, number>
}

// ==================== 授权模块 ====================

export interface AuthorizationStatus {
  data_source: string
  authorized: boolean
  authorized_at: string | null
  expires_at: string | null
}

export interface AuthorizationLog {
  id: string
  action: 'grant' | 'revoke'
  data_source: string
  timestamp: string
  ip_address?: string
}

// ==================== 请求参数类型 ====================

export interface CalculateCreditScoreRequest {
  force_refresh?: boolean
}

export interface GrantAuthorizationRequest {
  data_sources: string[]
}

export interface RevokeAuthorizationRequest {
  data_source: string
}

export interface ConnectWalletRequest {
  address: string
  chain_type: 'ethereum' | 'polygon' | 'bsc' | 'solana'
  signature?: string
  message?: string
}

export interface SetPrimaryWalletRequest {
  address: string
}

export interface VerifyWorldcoinRequest {
  proof: string
  merkle_root: string
  nullifier_hash: string
}

export interface BindSocialRequest {
  provider: 'github' | 'twitter' | 'facebook' | 'wechat'
  code: string
  redirect_uri: string
}

export interface IssueSBTRequest {
  sbt_type: string
  wallet_address?: string
}

