/**
 * 合约连接测试工具
 * 用于验证前端与智能合约的连接是否正常
 */

import { getContractAddresses } from '../contracts/addresses'

export interface ContractTestResult {
  contract: string
  address: string
  isValid: boolean
  error?: string
}

/**
 * 测试所有合约地址配置
 */
export function testContractAddresses(chainId: number): ContractTestResult[] {
  const addresses = getContractAddresses(chainId)
  const results: ContractTestResult[] = []

  // 测试 CrediNetCore (DynamicSBTAgent)
  results.push({
    contract: 'CrediNetCore (DynamicSBTAgent)',
    address: addresses.CrediNetCore,
    isValid: isValidAddress(addresses.CrediNetCore),
    error: !isValidAddress(addresses.CrediNetCore) ? '地址格式无效' : undefined
  })

  // 测试 SBTRegistry
  results.push({
    contract: 'SBTRegistry',
    address: addresses.SBTRegistry,
    isValid: isValidAddress(addresses.SBTRegistry),
    error: !isValidAddress(addresses.SBTRegistry) ? '地址格式无效' : undefined
  })

  // 测试 DynamicSBTAgent
  results.push({
    contract: 'DynamicSBTAgent',
    address: addresses.DynamicSBTAgent,
    isValid: isValidAddress(addresses.DynamicSBTAgent),
    error: !isValidAddress(addresses.DynamicSBTAgent) ? '地址格式无效' : undefined
  })

  // 测试 CRNToken (可选)
  results.push({
    contract: 'CRNToken',
    address: addresses.CRNToken,
    isValid: addresses.CRNToken === '0x0000000000000000000000000000000000000000' || isValidAddress(addresses.CRNToken),
    error: addresses.CRNToken !== '0x0000000000000000000000000000000000000000' && !isValidAddress(addresses.CRNToken) ? '地址格式无效' : undefined
  })

  // 测试 DataMarketplace (可选)
  results.push({
    contract: 'DataMarketplace',
    address: addresses.DataMarketplace,
    isValid: addresses.DataMarketplace === '0x0000000000000000000000000000000000000000' || isValidAddress(addresses.DataMarketplace),
    error: addresses.DataMarketplace !== '0x0000000000000000000000000000000000000000' && !isValidAddress(addresses.DataMarketplace) ? '地址格式无效' : undefined
  })

  return results
}

/**
 * 验证以太坊地址格式
 */
function isValidAddress(address: string): boolean {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return false
  }
  
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * 获取合约连接状态摘要
 */
export function getConnectionSummary(chainId: number): {
  total: number
  connected: number
  disconnected: number
  summary: string
} {
  const results = testContractAddresses(chainId)
  const connected = results.filter(r => r.isValid).length
  const disconnected = results.length - connected
  
  let summary = ''
  if (connected === results.length) {
    summary = '✅ 所有合约地址配置正确'
  } else if (connected > 0) {
    summary = `⚠️ ${connected}/${results.length} 个合约地址配置正确`
  } else {
    summary = '❌ 没有有效的合约地址配置'
  }

  return {
    total: results.length,
    connected,
    disconnected,
    summary
  }
}

/**
 * 打印合约连接测试结果
 */
export function logContractTestResults(chainId: number): void {
  const results = testContractAddresses(chainId)
  
  console.log(`\n🔍 合约连接测试结果 (Chain ID: ${chainId})`)
  console.log('=' .repeat(50))
  
  results.forEach(result => {
    const status = result.isValid ? '✅' : '❌'
    console.log(`${status} ${result.contract}: ${result.address}`)
    if (result.error) {
      console.log(`   错误: ${result.error}`)
    }
  })
  
  const summary = getConnectionSummary(chainId)
  console.log(`\n📊 总结: ${summary.summary}`)
}
