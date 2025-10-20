import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { getContractAddresses } from '../contracts/addresses'
import { DynamicSBTAgentABI } from '../contracts/abis'
import { useState, useEffect } from 'react'
import { zeroAddress } from 'viem'
import type { CreditScore } from '../types'
import { calculateCreditTotal } from '@/utils/credit'

/**
 * CrediNet 核心合约交互 Hook
 * 用于查询和更新用户信用数据
 */
export function useCrediNet() {
  const { address, chainId } = useAccount()
  const [contractAddress, setContractAddress] = useState<string>('')

  useEffect(() => {
    console.log('🔍 useCrediNet - 链ID变化:', chainId)
    
    if (!chainId) {
      console.log('❌ 没有链ID，清空合约地址')
      setContractAddress('')
      return
    }

    const addresses = getContractAddresses(chainId)
    const candidate = addresses.CrediNetCore

    console.log('📋 获取到的地址配置:', addresses)
    console.log('🎯 使用的合约地址:', candidate)

    if (!candidate || candidate === zeroAddress) {
      console.log('❌ 合约地址无效，清空地址')
      setContractAddress('')
      return
    }

    console.log('✅ 设置合约地址:', candidate)
    setContractAddress(candidate)
  }, [chainId])

  // 查询用户完整信用信息（使用 DynamicSBTAgent）
  const { data: creditInfo, refetch: refetchCreditInfo, error: creditInfoError, isLoading: creditInfoLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DynamicSBTAgentABI,
    functionName: 'getUserCreditInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
      refetchInterval: 30000, // 每30秒自动刷新
    },
  })

  // 添加调试日志
  useEffect(() => {
    console.log('📊 信用信息查询状态:')
    console.log('  - 用户地址:', address)
    console.log('  - 合约地址:', contractAddress)
    console.log('  - 查询启用:', !!address && !!contractAddress)
    console.log('  - 加载状态:', creditInfoLoading)
    console.log('  - 原始数据:', creditInfo)
    console.log('  - 错误信息:', creditInfoError)
  }, [address, contractAddress, creditInfo, creditInfoLoading, creditInfoError])

  // 查询用户 SBT TokenId
  const { data: userTokenId } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DynamicSBTAgentABI,
    functionName: 'userTokenIds',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  })

  // 更新信用评分（需要 Oracle 权限）
  const { writeContract: updateScore, data: updateHash } = useWriteContract()
  const { isLoading: isUpdating, isSuccess: isUpdateSuccess } = useWaitForTransactionReceipt({
    hash: updateHash,
  })

  // 手动更新评分
  const handleUpdateScore = async (
    keystone: number,
    ability: number,
    wealth: number,
    health: number,
    behavior: number
  ) => {
    if (!contractAddress || !address) return

    updateScore({
      address: contractAddress as `0x${string}`,
      abi: DynamicSBTAgentABI,
      functionName: 'updateCreditScore',
      args: [
        address as `0x${string}`,
        keystone,
        ability,
        wealth,
        health,
        behavior,
      ],
    })
  }

  // 格式化信用数据
  const normalizedDimensions = creditInfo
    ? {
        keystone: Number(creditInfo[0].keystone ?? 0),
        ability: Number(creditInfo[0].ability ?? 0),
        finance: Number(creditInfo[0].wealth ?? 0), // wealth 对应 finance
        health: Number(creditInfo[0].health ?? 0),
        behavior: Number(creditInfo[0].behavior ?? 0),
      }
    : null

  const computedTotal = normalizedDimensions
    ? calculateCreditTotal(normalizedDimensions)
    : 0

  const formattedCreditScore: CreditScore | null = normalizedDimensions
    ? {
        total: computedTotal,
        change: 0, // TODO: 等待链上历史数据支持
        dimensions: normalizedDimensions,
        lastUpdated: (() => {
          const timestamp = creditInfo ? Number(creditInfo[0].lastUpdate) : 0
          if (!timestamp) {
            return new Date().toISOString()
          }
          return new Date(timestamp * 1000).toISOString()
        })(),
      }
    : null

  // 归一化错误对象，便于组件安全读取
  const formattedError: Error | null = creditInfoError instanceof Error
    ? creditInfoError
    : creditInfoError
    ? new Error(String(creditInfoError))
    : null

  return {
    // 数据
    address,
    chainId,
    userTokenId,
  creditScore: formattedCreditScore,
  contractAddress,
    
    // 状态信息
    isLoading: creditInfoLoading,
    error: formattedError,
    
    // 评分更新操作
    updateScore: handleUpdateScore,
    isUpdating,
    isUpdateSuccess,
    
    // 刷新数据
    refetchCreditInfo,
  }
}

