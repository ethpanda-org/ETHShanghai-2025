/**
 * 合约连接测试工具
 * 用于直接测试合约调用是否正常
 */

import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { DynamicSBTAgentABI } from '../contracts/abis'

const DYNAMIC_SBT_AGENT_ADDRESS = '0x7CE2fbEfDF5dc7E43477816bfD2e89d5b26Cff38'

type SuccessfulResult = {
  success: true
  hasData: boolean
  score?: any
  totalScore?: number
  rarity?: number
  tokenId?: number
  message?: string
}

type FailedResult = {
  success: false
  error: string
}

export type ContractTestResult = SuccessfulResult | FailedResult

export async function testContractConnection(userAddress: string): Promise<ContractTestResult> {
  console.log('🧪 开始测试合约连接...')
  console.log('📍 用户地址:', userAddress)
  console.log('🎯 合约地址:', DYNAMIC_SBT_AGENT_ADDRESS)
  
  try {
    // 创建公共客户端
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http()
    })

    console.log('✅ 公共客户端创建成功')

    // 测试1: 检查合约是否存在
    console.log('\n📋 测试1: 检查合约是否存在')
    try {
      const code = await publicClient.getCode({
        address: DYNAMIC_SBT_AGENT_ADDRESS as `0x${string}`
      })
      
      if (code && code !== '0x') {
        console.log('✅ 合约存在，代码长度:', code.length)
      } else {
        console.log('❌ 合约不存在或未部署')
        return {
          success: false,
          error: '合约不存在或未部署',
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log('❌ 获取合约代码失败:', error)
      return {
        success: false,
        error: message || '获取合约代码失败',
      }
    }

    // 测试2: 调用 getUserCreditInfo
    console.log('\n📋 测试2: 调用 getUserCreditInfo')
    try {
      const result = await publicClient.readContract({
        address: DYNAMIC_SBT_AGENT_ADDRESS as `0x${string}`,
        abi: DynamicSBTAgentABI,
        functionName: 'getUserCreditInfo',
        args: [userAddress as `0x${string}`]
      })

      console.log('✅ 合约调用成功')
      console.log('📊 返回结果:', result)

      if (result && Array.isArray(result) && result.length >= 4) {
        const [score, totalScore, rarity, tokenId] = result
        console.log('📈 解析结果:')
        console.log('  - 评分详情:', score)
        console.log('  - 总分:', totalScore)
        console.log('  - 稀有度:', rarity)
        console.log('  - TokenId:', tokenId)
        
        return {
          success: true,
          hasData: Number(totalScore) > 0,
          score,
          totalScore: Number(totalScore),
          rarity: Number(rarity),
          tokenId: Number(tokenId),
        }
      } else {
        console.log('⚠️ 返回数据格式不正确')
        return {
          success: true,
          hasData: false,
          message: '合约返回数据格式不正确',
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log('❌ 合约调用失败:', error)
      return {
        success: false,
        error: message || '未知错误',
      }
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log('❌ 测试失败:', error)
    return {
      success: false,
      error: message || '连接失败',
    }
  }
}

/**
 * 在浏览器中运行测试
 */
export async function runBrowserTest(userAddress: string) {
  console.log('🌐 在浏览器中运行合约测试...')
  
  const result = await testContractConnection(userAddress)
  
  if (result.success) {
    if (result.hasData) {
      console.log('🎉 测试成功！用户有信用数据')
    } else {
      console.log('⚠️ 测试成功，但用户暂无信用数据')
    }
  } else {
    console.log('❌ 测试失败:', result.error)
  }
  
  return result
}

// 全局函数，方便在浏览器控制台调用
if (typeof window !== 'undefined') {
  (window as any).testContract = runBrowserTest
}
