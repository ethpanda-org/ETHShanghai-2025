/**
 * Supabase 类型安全助手函数（简化版）
 * 提供更好的错误处理和实用函数
 */

import { supabase } from './supabase'
import type { Database } from './types/supabase'

// 合约类型别名
type Contract = Database['public']['Tables']['contracts']['Row']
type ContractInsert = Database['public']['Tables']['contracts']['Insert']
type ContractUpdate = Database['public']['Tables']['contracts']['Update']

/**
 * 合约查询助手
 */
export const contractQueries = {
  /**
   * 查询所有合约
   */
  async selectAll() {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching contracts:', error)
      throw new Error(`查询合约失败: ${error.message}`)
    }
    
    return data || []
  },

  /**
   * 根据ID查询
   */
  async selectById(id: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching contract:', error)
      throw new Error(`查询合约失败: ${error.message}`)
    }
    
    return data
  },

  /**
   * 根据订单号查询
   */
  async selectByOrderId(orderId: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('order_id', orderId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching contract:', error)
      throw new Error(`查询合约失败: ${error.message}`)
    }
    
    return data
  },

  /**
   * 根据地址查询（付款方或收款方）
   */
  async selectByAddress(address: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .or(`sender_address.eq.${address},receiver_address.eq.${address}`)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching contracts:', error)
      throw new Error(`查询合约失败: ${error.message}`)
    }
    
    return data || []
  },

  /**
   * 插入合约
   */
  async insert(data: ContractInsert) {
    const { data: inserted, error } = await supabase
      .from('contracts')
      .insert(data)
      .select()
      .single()
    
    if (error) {
      console.error('Error inserting contract:', error)
      throw new Error(`插入合约失败: ${error.message}`)
    }
    
    return inserted
  },

  /**
   * 更新合约
   */
  async updateById(id: string, data: ContractUpdate) {
    const { data: updated, error } = await supabase
      .from('contracts')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating contract:', error)
      throw new Error(`更新合约失败: ${error.message}`)
    }
    
    return updated
  },

  /**
   * 更新合约状态
   */
  async updateStatus(orderId: string, status: string) {
    return this.updateByOrderId(orderId, {
      status,
      updated_at: new Date().toISOString(),
    })
  },

  /**
   * 根据订单号更新
   */
  async updateByOrderId(orderId: string, data: ContractUpdate) {
    const { data: updated, error } = await supabase
      .from('contracts')
      .update(data)
      .eq('order_id', orderId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating contract:', error)
      throw new Error(`更新合约失败: ${error.message}`)
    }
    
    return updated
  },

  /**
   * 统计用户作为付款方的合约数
   */
  async countAsSender(address: string) {
    const { count, error } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('sender_address', address)
    
    if (error) {
      console.error('Error counting contracts:', error)
      return 0
    }
    
    return count || 0
  },

  /**
   * 统计用户作为收款方的合约数
   */
  async countAsReceiver(address: string) {
    const { count, error } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_address', address)
    
    if (error) {
      console.error('Error counting contracts:', error)
      return 0
    }
    
    return count || 0
  },
}

/**
 * 通用错误处理
 */
export function handleSupabaseError(error: any, operation: string): never {
  console.error(`Supabase ${operation} error:`, error)
  throw new Error(`${operation}: ${error.message || '未知错误'}`)
}

/**
 * 检查是否为 "未找到" 错误
 */
export function isNotFoundError(error: any): boolean {
  return error?.code === 'PGRST116'
}

/**
 * 实时订阅助手
 */
export function subscribeToContracts(callback: (payload: any) => void) {
  return supabase
    .channel('contracts_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contracts' },
      callback
    )
    .subscribe()
}

/**
 * 订阅特定订单的变化
 */
export function subscribeToContract(orderId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`contract_${orderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contracts',
        filter: `order_id=eq.${orderId}`
      },
      callback
    )
    .subscribe()
}
