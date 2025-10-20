"use client"

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { logClientError } from '../logClientError'
import { CONTRACTS, FOCUSBOND_ABI, anvil } from '../chain'

const CONTRACT_ADDRESS = CONTRACTS[anvil.id].focusBond

export function useHeartbeat() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  const sendHeartbeat = useCallback(async () => {
    if (!isConnected || !address) {
      await logClientError('useHeartbeat:precheck', new Error('Wallet not connected'), {
        isConnected,
        hasAddress: Boolean(address),
      })
      throw new Error('Wallet not connected')
    }

    setError(null)
    setTransactionHash(null)

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: FOCUSBOND_ABI,
        functionName: 'updateHeartbeat',
        args: [],
        gas: BigInt(100000),
        chain: anvil,
        account: address,
      })

      setTransactionHash(hash)
      return hash
    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to send heartbeat'
      await logClientError('useHeartbeat', e, { address })
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [isConnected, address, writeContractAsync])

  return { 
    sendHeartbeat, 
    loading: isPending, 
    error, 
    transactionHash 
  }
}
