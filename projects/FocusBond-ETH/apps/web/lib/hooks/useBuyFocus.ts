"use client"

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { anvil, CONTRACTS, FOCUSBOND_ABI } from '../chain'
import { logClientError } from '../logClientError'

export function useBuyFocus() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync, data: hash, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const buyFocus = useCallback(async (focusAmount: number) => {
    if (!isConnected || !address) {
      await logClientError('useBuyFocus:precheck', new Error('Wallet not connected'), {
        isConnected,
        hasAddress: Boolean(address),
      })
      throw new Error('Wallet not connected')
    }

    setError(null)
    setTransactionHash(null)

    try {
      // 计算需要的ETH数量
      // 根据市场比例: 100 FOCUS = 0.0001 ETH (从市场界面获取)
      // 所以 1 FOCUS = 0.000001 ETH
      const ethAmount = focusAmount * 0.000001
      const ethAmountWei = parseEther(ethAmount.toString())

      console.log('购买FOCUS:', {
        focusAmount,
        ethAmount,
        ethAmountWei: ethAmountWei.toString()
      })

      // 调用合约的buyFocusCredits函数
      const hash = await writeContractAsync({
        address: CONTRACTS[anvil.id].focusBond,
        abi: FOCUSBOND_ABI,
        functionName: 'buyFocusCredits',
        value: ethAmountWei,
        gas: BigInt(200000),
        chain: anvil,
        account: address,
      })

      setTransactionHash(hash)
      console.log('✅ 购买交易已提交:', hash)
      return hash

    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to buy FOCUS'
      await logClientError('useBuyFocus', e, { address, focusAmount })
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [isConnected, address, writeContractAsync])

  return {
    buyFocus,
    loading: isPending || isConfirming,
    success: isSuccess,
    error,
    transactionHash,
  }
}

