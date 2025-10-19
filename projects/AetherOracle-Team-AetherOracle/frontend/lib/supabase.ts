// lib/supabase.ts - Supabase 客户端配置
import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mrmltmfxwtryntdmorod.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybWx0bWZ4d3RyeW50ZG1vcm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNDgwNjcsImV4cCI6MjA3NTgyNDA2N30.UVx6qo7ZUgcnqbEjPxKl0IMEfuFZjb9TF3ZCDnQrSi4';

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试连接
export async function testConnection() {
  try {
    // 尝试获取数据库中的表列表
    const { data, error } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 表示表不存在，这是正常的
      console.error('Supabase connection error:', error);
      return false;
    }

    console.log('✅ Successfully connected to Supabase!');
    return true;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    return false;
  }
}

// 订单表接口
export interface PaymentOrder {
  id?: number;
  order_id: string;
  order_id_bytes32: string;
  payer_address: string;
  merchant_address: string;
  amount: number;
  token_symbol: string;
  token_address: string;
  settlement_token?: string;
  status: number;
  transaction_hash?: string;
  block_number?: number;
  metadata_uri?: string;
  description?: string;
  buyer_email?: string;
  created_at?: string;
  paid_at?: string;
}

// 创建订单表（如果不存在）
export async function createOrdersTable() {
  // 注意：Supabase 不支持直接通过客户端创建表
  // 需要在 Supabase Dashboard 中创建表
  // 或使用 SQL Editor 执行以下 SQL：

  const tableSQL = `
    CREATE TABLE IF NOT EXISTS payment_orders (
      id SERIAL PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      order_id_bytes32 TEXT NOT NULL,
      payer_address TEXT NOT NULL,
      merchant_address TEXT NOT NULL,
      amount DECIMAL(20,6) NOT NULL,
      token_symbol VARCHAR(20) NOT NULL,
      token_address TEXT NOT NULL,
      settlement_token TEXT,
      status INTEGER NOT NULL DEFAULT 1,
      transaction_hash TEXT,
      block_number BIGINT,
      metadata_uri TEXT,
      description TEXT,
      buyer_email TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      paid_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS idx_payer_address ON payment_orders(payer_address);
    CREATE INDEX IF NOT EXISTS idx_merchant_address ON payment_orders(merchant_address);
    CREATE INDEX IF NOT EXISTS idx_order_id ON payment_orders(order_id);
  `;

  console.log('请在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL 来创建表：\n', tableSQL);
}

// 保存支付订单
export async function savePaymentOrder(order: PaymentOrder) {
  const { data, error } = await supabase
    .from('payment_orders')
    .upsert({
      ...order,
      payer_address: order.payer_address.toLowerCase(),
      merchant_address: order.merchant_address.toLowerCase(),
      token_address: order.token_address.toLowerCase(),
      settlement_token: order.settlement_token?.toLowerCase(),
      paid_at: order.paid_at || new Date().toISOString(),
    }, {
      onConflict: 'order_id'
    });

  if (error) {
    console.error('Error saving order:', error);
    throw error;
  }

  return data;
}

// 获取用户的支付订单
export async function getUserPaymentOrders(userAddress: string, limit = 100, offset = 0) {
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('payer_address', userAddress.toLowerCase())
    .order('paid_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }

  return data || [];
}

// 获取用户支付订单数量
export async function getUserPaymentCount(userAddress: string) {
  const { count, error } = await supabase
    .from('payment_orders')
    .select('*', { count: 'exact', head: true })
    .eq('payer_address', userAddress.toLowerCase());

  if (error) {
    console.error('Error fetching user order count:', error);
    throw error;
  }

  return count || 0;
}

// 获取用户总消费金额（按币种）
export async function getUserTotalSpent(userAddress: string) {
  const { data, error } = await supabase
    .from('payment_orders')
    .select('token_symbol, amount')
    .eq('payer_address', userAddress.toLowerCase());

  if (error) {
    console.error('Error fetching user total spent:', error);
    throw error;
  }

  // 聚合数据
  const totals: { [key: string]: number } = {};
  (data || []).forEach(order => {
    totals[order.token_symbol] = (totals[order.token_symbol] || 0) + Number(order.amount);
  });

  return Object.entries(totals).map(([tokenSymbol, totalAmount]) => ({
    tokenSymbol,
    totalAmount
  }));
}

// 获取商家的订单
export async function getMerchantOrders(merchantAddress: string, limit = 100, offset = 0) {
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('merchant_address', merchantAddress.toLowerCase())
    .order('paid_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching merchant orders:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get user ranking based on total payment amount
 * Returns rank and percentile
 */
export async function getUserRanking(userAddress: string): Promise<{
  rank: number;
  totalUsers: number;
  percentile: number;
  totalSpent: number;
} | null> {
  try {
    // Get all users with their total spending
    const { data: rankings, error } = await supabase
      .from('payment_orders')
      .select('payer_address, amount')
      .eq('status', 2); // Only count completed payments

    if (error) throw error;
    if (!rankings || rankings.length === 0) return null;

    // Aggregate spending by user
    const userSpending = new Map<string, number>();
    rankings.forEach(order => {
      const address = order.payer_address.toLowerCase();
      const current = userSpending.get(address) || 0;
      userSpending.set(address, current + Number(order.amount));
    });

    // Sort users by spending (descending)
    const sortedUsers = Array.from(userSpending.entries())
      .sort((a, b) => b[1] - a[1]);

    // Find user's rank
    const userIndex = sortedUsers.findIndex(
      ([address]) => address === userAddress.toLowerCase()
    );

    if (userIndex === -1) return null;

    const rank = userIndex + 1;
    const totalUsers = sortedUsers.length;
    const percentile = Math.round(((totalUsers - rank + 1) / totalUsers) * 100);
    const totalSpent = sortedUsers[userIndex][1];

    return {
      rank,
      totalUsers,
      percentile,
      totalSpent
    };
  } catch (error) {
    console.error('Error getting user ranking:', error);
    return null;
  }
}

/**
 * Get top contributors for leaderboard
 */
export async function getTopContributors(limit: number = 10): Promise<{
  address: string;
  totalSpent: number;
  orderCount: number;
}[]> {
  try {
    const { data: orders, error } = await supabase
      .from('payment_orders')
      .select('payer_address, amount')
      .eq('status', 2);

    if (error) throw error;
    if (!orders || orders.length === 0) return [];

    // Aggregate by user
    const userStats = new Map<string, { total: number; count: number }>();
    orders.forEach(order => {
      const address = order.payer_address.toLowerCase();
      const current = userStats.get(address) || { total: 0, count: 0 };
      userStats.set(address, {
        total: current.total + Number(order.amount),
        count: current.count + 1
      });
    });

    // Sort and return top contributors
    return Array.from(userStats.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit)
      .map(([address, stats]) => ({
        address,
        totalSpent: stats.total,
        orderCount: stats.count
      }));
  } catch (error) {
    console.error('Error getting top contributors:', error);
    return [];
  }
}