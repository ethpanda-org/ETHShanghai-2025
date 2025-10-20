"use client"

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { logClientError } from '../logClientError'
import { CONTRACTS, FOCUSBOND_ABI, anvil } from '../chain'

const CONTRACT_ADDRESS = CONTRACTS[anvil.id].focusBond

export function useBreakSession() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  const breakSession = useCallback(async (maxFee?: bigint) => {
    if (!isConnected || !address) {
      await logClientError('useBreakSession:precheck', new Error('Wallet not connected'), {
        isConnected,
        hasAddress: Boolean(address),
      })
      throw new Error('Wallet not connected')
    }

    setError(null)
    setTransactionHash(null)

    try {
      // 如果没有提供maxFee，使用合理的默认值
      const feeLimit = maxFee || BigInt('10000000000000000000') // 10 tokens默认限制
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: FOCUSBOND_ABI,
        functionName: 'breakSession',
        args: [feeLimit],
        gas: BigInt(300000),
      })

      setTransactionHash(hash)
      return hash
    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to break session'
      await logClientError('useBreakSession', e, { address })
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [isConnected, address, writeContractAsync])

  return { 
    breakSession, 
    loading: isPending, 
    error, 
    transactionHash 
  }
}
