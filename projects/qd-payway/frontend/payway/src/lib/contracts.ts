import escrowAbi from './abi.json'

// 合约地址配置
export const CONTRACTS = {
  // PayWay托管合约地址（需要部署后更新）
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  
  // Sepolia测试网USDT地址（Mock USDT或真实测试USDT）
  USDT_SEPOLIA: process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
} as const

// 导出合约ABI
export const ESCROW_ABI = escrowAbi

// 订单状态枚举（与合约保持一致）
export enum OrderStatus {
  PENDING = 0,    // 资金托管中
  PAID = 1,       // 已完成/已支付
  CANCELLED = 2,  // 已取消
}

// 订单状态显示文本
export const OrderStatusText: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '资金托管中',
  [OrderStatus.PAID]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
}

// 订单状态颜色
export const OrderStatusColor: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [OrderStatus.PAID]: 'bg-green-100 text-green-800 border-green-200',
  [OrderStatus.CANCELLED]: 'bg-gray-100 text-gray-800 border-gray-200',
}

// 验证方式枚举
export enum VerificationMethod {
  EMAIL = 'email',
  ENTERPRISE_SIGN = 'enterprise_sign', // 预留
}

// 验证方式显示文本
export const VerificationMethodText: Record<VerificationMethod, string> = {
  [VerificationMethod.EMAIL]: '邮箱验证',
  [VerificationMethod.ENTERPRISE_SIGN]: '企业签名（即将推出）',
}

// 生成12位订单ID
export function generateOrderId(): string {
  return Math.random().toString().slice(2, 14)
}

// Sepolia区块浏览器URL
export const BLOCK_EXPLORER_URL = 'https://sepolia.etherscan.io'

// 获取交易链接
export function getTransactionUrl(hash: string): string {
  return `${BLOCK_EXPLORER_URL}/tx/${hash}`
}

// 获取地址链接
export function getAddressUrl(address: string): string {
  return `${BLOCK_EXPLORER_URL}/address/${address}`
}

