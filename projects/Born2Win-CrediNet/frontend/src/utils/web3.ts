/**
 * Web3 工具函数
 */

/**
 * 缩短地址显示
 * @param address 完整地址
 * @param startLength 开始显示的字符数（默认 6）
 * @param endLength 结束显示的字符数（默认 4）
 * @returns 缩短后的地址，例如：0x1234...5678
 */
export function shortenAddress(
  address: string | undefined,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address) return ''
  if (address.length < startLength + endLength) return address
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

/**
 * 格式化 Token 数量
 * @param amount 数量
 * @param decimals 小数位数（默认 2）
 * @returns 格式化后的数字字符串
 */
export function formatTokenAmount(amount: number | bigint, decimals: number = 2): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 格式化 DID
 * @param address 钱包地址
 * @returns DID 格式，例如：did:cred:0x1234...5678
 */
export function formatDID(address: string | undefined): string {
  if (!address) return ''
  return `did:cred:${shortenAddress(address, 6, 4)}`
}

/**
 * 验证以太坊地址格式
 * @param address 地址
 * @returns 是否为有效地址
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * 格式化区块链时间戳
 * @param timestamp Unix 时间戳（秒）
 * @returns 格式化的日期字符串
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 从错误对象中提取可读的错误信息
 * @param error 错误对象
 * @returns 错误消息
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error
  
  // 处理 wagmi/viem 错误
  if (error?.shortMessage) return error.shortMessage
  if (error?.message) return error.message
  
  // 处理用户拒绝交易
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED') {
    return '用户取消了交易'
  }
  
  return '发生未知错误，请重试'
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}

/**
 * 获取区块链浏览器链接
 * @param chainId 链 ID
 * @param type 类型（'tx' | 'address' | 'token'）
 * @param value 交易哈希或地址
 * @returns 浏览器链接
 */
export function getExplorerLink(
  chainId: number,
  type: 'tx' | 'address' | 'token',
  value: string
): string {
  const baseUrls: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    137: 'https://polygonscan.com',
    80001: 'https://mumbai.polygonscan.com',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io',
  }

  const baseUrl = baseUrls[chainId] || 'https://etherscan.io'
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${value}`
    case 'address':
      return `${baseUrl}/address/${value}`
    case 'token':
      return `${baseUrl}/token/${value}`
    default:
      return baseUrl
  }
}

/**
 * 将维度名称转换为 ID
 * @param dimension 维度名称
 * @returns 维度 ID
 */
export function dimensionToId(dimension: string): number {
  const dimensionMap: Record<string, number> = {
    keystone: 0,
    ability: 1,
    finance: 2,
    health: 3,
    behavior: 4,
  }
  return dimensionMap[dimension] ?? -1
}

/**
 * 将维度 ID 转换为名称
 * @param id 维度 ID
 * @returns 维度名称
 */
export function idToDimension(id: number): string {
  const dimensions = ['keystone', 'ability', 'finance', 'health', 'behavior']
  return dimensions[id] || 'unknown'
}

