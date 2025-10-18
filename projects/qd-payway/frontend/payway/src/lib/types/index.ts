/**
 * 统一导出所有类型定义
 */

// Supabase 数据库类型
export type { Database } from './supabase'

// 合约相关类型
export type {
  Contract,
  ContractInsert,
  ContractUpdate,
  ContractWithCamelCase,
} from '../db'

// 重新导出常用类型
export type { SupabaseClient } from '../supabase'

// 应用层类型别名
export type ContractStatus = 'PENDING' | 'PAID' | 'CANCELLED'
export type VerificationMethod = 'email' | 'enterprise_sign'

// 表单类型
export interface CreateContractFormData {
  receiver: string
  amount: string
  currency: 'USDT'
  verificationMethod: VerificationMethod
  email: string
  orderId: string
}

// 交易步骤枚举
export enum TransactionStep {
  IDLE = 'idle',
  APPROVING = 'approving',
  APPROVED = 'approved',
  DEPOSITING = 'depositing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

