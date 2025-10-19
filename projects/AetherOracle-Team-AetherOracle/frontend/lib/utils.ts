import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAddress, isAddress } from "viem"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化以太坊地址为 checksummed 格式（EIP-55）
 * 这确保地址的大小写一致性，避免授权检查失败
 */
export function toChecksumAddress(address: string): string {
  if (!isAddress(address)) {
    throw new Error('Invalid Ethereum address')
  }
  return getAddress(address)
}

/**
 * 比较两个以太坊地址是否相同（忽略大小写）
 */
export function isSameAddress(address1: string, address2: string): boolean {
  if (!address1 || !address2) return false

  try {
    return toChecksumAddress(address1).toLowerCase() === toChecksumAddress(address2).toLowerCase()
  } catch {
    return false
  }
}

/**
 * 格式化地址显示（缩略形式）
 */
export function formatAddress(address: string): string {
  if (!address) return ''
  const checksummed = toChecksumAddress(address)
  return `${checksummed.slice(0, 6)}...${checksummed.slice(-4)}`
}

/**
 * 确保所有合约地址使用一致的格式
 */
export function normalizeContractAddresses<T extends Record<string, any>>(contracts: T): T {
  const normalized = {} as T

  for (const [key, value] of Object.entries(contracts)) {
    if (typeof value === 'string' && isAddress(value)) {
      normalized[key as keyof T] = toChecksumAddress(value) as any
    } else {
      normalized[key as keyof T] = value
    }
  }

  return normalized
}