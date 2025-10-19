import { supabase } from './supabase'
import type { Database } from './types/supabase'

// 使用 Supabase 生成的类型
export type Contract = Database['public']['Tables']['contracts']['Row']
export type ContractInsert = Database['public']['Tables']['contracts']['Insert']
export type ContractUpdate = Database['public']['Tables']['contracts']['Update']

// 自定义类型（与应用层更友好的命名）
export interface ContractWithCamelCase {
  id: string
  orderId: string
  senderAddress: string
  receiverAddress: string
  amount: string
  tokenAddress: string
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  verificationMethod: string
  verificationEmail?: string | null
  transactionHash?: string | null
  createdAt: string | null
  updatedAt: string | null
}

/**
 * 将数据库字段映射到 camelCase
 */
function mapDbToContract(dbData: Contract): ContractWithCamelCase {
  return {
    id: dbData.id,
    orderId: dbData.order_id,
    senderAddress: dbData.sender_address,
    receiverAddress: dbData.receiver_address,
    amount: dbData.amount,
    tokenAddress: dbData.token_address,
    status: dbData.status as 'PENDING' | 'PAID' | 'CANCELLED',
    verificationMethod: dbData.verification_method,
    verificationEmail: dbData.verification_email,
    transactionHash: dbData.transaction_hash,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  }
}

/**
 * 保存合约信息到数据库
 */
export async function saveContract(params: {
  orderId: string
  senderAddress: string
  receiverAddress: string
  amount: string
  tokenAddress: string
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  verificationMethod: string
  verificationEmail?: string
  transactionHash?: string
}) {
  const insertData: ContractInsert = {
    order_id: params.orderId,
    sender_address: params.senderAddress,
    receiver_address: params.receiverAddress,
    amount: params.amount,
    token_address: params.tokenAddress,
    status: params.status,
    verification_method: params.verificationMethod,
    verification_email: params.verificationEmail,
    transaction_hash: params.transactionHash,
  }

  const { data, error } = await supabase
    .from('contracts')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error saving contract:', error)
    throw new Error(`保存合约失败: ${error.message}`)
  }

  return mapDbToContract(data)
}

/**
 * 根据订单ID查询合约
 */
export async function getContractByOrderId(orderId: string): Promise<ContractWithCamelCase | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // 未找到
    }
    console.error('Error fetching contract:', error)
    throw new Error(`查询合约失败: ${error.message}`)
  }

  return data ? mapDbToContract(data) : null
}

/**
 * 查询用户相关的所有合约
 */
export async function getContractsByAddress(address: string): Promise<ContractWithCamelCase[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .or(`sender_address.eq.${address},receiver_address.eq.${address}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching contracts:', error)
    throw new Error(`查询合约列表失败: ${error.message}`)
  }

  return data ? data.map(mapDbToContract) : []
}

/**
 * 更新合约状态
 */
export async function updateContractStatus(
  orderId: string,
  status: 'PENDING' | 'PAID' | 'CANCELLED'
) {
  const updateData: ContractUpdate = {
    status,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('contracts')
    .update(updateData)
    .eq('order_id', orderId)
    .select()
    .single()

  if (error) {
    console.error('Error updating contract status:', error)
    throw new Error(`更新合约状态失败: ${error.message}`)
  }

  return mapDbToContract(data)
}

/**
 * 查询用户作为付款方的合约数量
 */
export async function getContractsCountAsSender(address: string): Promise<number> {
  const { count, error } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('sender_address', address)

  if (error) {
    console.error('Error counting sender contracts:', error)
    return 0
  }

  return count || 0
}

/**
 * 查询用户作为收款方的合约数量
 */
export async function getContractsCountAsReceiver(address: string): Promise<number> {
  const { count, error } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_address', address)

  if (error) {
    console.error('Error counting receiver contracts:', error)
    return 0
  }

  return count || 0
}

/**
 * 计算用户的总交易金额
 */
export async function getTotalTransactionAmount(address: string): Promise<number> {
  const { data, error } = await supabase
    .from('contracts')
    .select('amount')
    .or(`sender_address.eq.${address},receiver_address.eq.${address}`)
    .eq('status', 'PAID')

  if (error) {
    console.error('Error calculating total amount:', error)
    return 0
  }

  return data
    ? data.reduce((sum, contract) => sum + parseFloat(contract.amount || '0'), 0)
    : 0
}

/**
 * 使用类型安全的方式查询用户合约（使用视图）
 */
export async function getUserContractsWithRole(userAddress: string) {
  // 设置用户地址到会话变量
  // 注意：这需要在实际的认证流程中设置
  
  const { data, error } = await supabase
    .from('user_contracts')
    .select('*')
    .or(`sender_address.eq.${userAddress},receiver_address.eq.${userAddress}`)

  if (error) {
    console.error('Error fetching user contracts:', error)
    throw new Error(`查询用户合约失败: ${error.message}`)
  }

  return data || []
}
