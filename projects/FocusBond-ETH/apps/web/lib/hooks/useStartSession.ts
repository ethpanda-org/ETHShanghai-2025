"use client"

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { logClientError } from '../logClientError'
import { CONTRACTS, FOCUSBOND_ABI, anvil } from '../chain'

const CONTRACT_ADDRESS = CONTRACTS[anvil.id].focusBond

export function useStartSession() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  const startSession = useCallback(
    async (targetMinutes: number, depositWei: bigint) => {
      if (!isConnected || !address) {
        const error = new Error('请先连接钱包')
        setError(error.message)
        throw error
      }

      // 验证参数
      if (isNaN(targetMinutes) || targetMinutes <= 0 || targetMinutes > 65535) {
        const error = new Error('持续时间必须是1-65535分钟之间的有效数字')
        setError(error.message)
        throw error
      }

      if (depositWei <= 0n) {
        const error = new Error('质押金额必须大于0')
        setError(error.message)
        throw error
      }

      setError(null)
      setTransactionHash(null)

      try {
        console.log('🚀 开始创建专注会话:', {
          address: CONTRACT_ADDRESS,
          targetMinutes,
          depositWei: depositWei.toString(),
        })

        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: FOCUSBOND_ABI,
          functionName: 'startSession',
          args: [targetMinutes],
          value: depositWei,
          // 增加gas limit，避免gas不足
          gas: BigInt(1000000),
        })

        console.log('✅ 会话创建交易已发送:', hash)
        setTransactionHash(hash)
        return hash
      } catch (e: any) {
        console.error('❌ 创建会话失败:', e)
        const errorMessage = e?.shortMessage || e?.message || '创建会话失败'
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [isConnected, address, writeContractAsync]
  )

  return { 
    startSession, 
    loading: isPending, 
    error, 
    transactionHash 
  }
}
