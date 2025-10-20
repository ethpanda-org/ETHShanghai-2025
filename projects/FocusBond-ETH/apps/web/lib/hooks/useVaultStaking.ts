"use client"

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { anvil, CONTRACTS } from '../chain'
import { logClientError } from '../logClientError'

// FocusVault ABI - only the functions we need
const FOCUS_VAULT_ABI = [
  {
    inputs: [],
    name: 'depositETH',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'withdrawETH',
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserStake',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getStakingBoost',
    outputs: [{ name: 'multiplier', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function useVaultStaking() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync, data: hash, isPending } = useWriteContract()
  const [error, setError] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // 读取用户的质押金额
  const { data: userStake, refetch: refetchStake } = useReadContract({
    address: CONTRACTS[anvil.id].focusVault,
    abi: FOCUS_VAULT_ABI,
    functionName: 'getUserStake',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 30000,
    },
  })

  // 读取用户的质押加成
  const { data: stakingBoost, refetch: refetchBoost } = useReadContract({
    address: CONTRACTS[anvil.id].focusVault,
    abi: FOCUS_VAULT_ABI,
    functionName: 'getStakingBoost',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 30000,
    },
  })

  // 读取用户的份额
  const { data: vaultShares, refetch: refetchShares } = useReadContract({
    address: CONTRACTS[anvil.id].focusVault,
    abi: FOCUS_VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 30000,
    },
  })

  // 质押ETH到金库
  const depositETH = useCallback(async (amount: string) => {
    if (!isConnected || !address) {
      await logClientError('useVaultStaking:depositETH', new Error('Wallet not connected'), {
        isConnected,
        hasAddress: Boolean(address),
      })
      throw new Error('Wallet not connected')
    }

    setError(null)
    setTransactionHash(null)

    try {
      const ethAmount = parseEther(amount)

      console.log('质押ETH到金库:', {
        amount,
        ethAmount: ethAmount.toString()
      })

      const hash = await writeContractAsync({
        address: CONTRACTS[anvil.id].focusVault,
        abi: FOCUS_VAULT_ABI,
        functionName: 'depositETH',
        value: ethAmount,
        chain: anvil,
        account: address,
      })

      setTransactionHash(hash)
      console.log('✅ 质押交易已提交:', hash)
      
      // 刷新状态
      await Promise.all([refetchStake(), refetchBoost(), refetchShares()])
      
      return hash

    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to deposit ETH'
      await logClientError('useVaultStaking:depositETH', e, { address, amount })
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [isConnected, address, writeContractAsync, refetchStake, refetchBoost, refetchShares])

  // 从金库提取ETH
  const withdrawETH = useCallback(async (shares: string) => {
    if (!isConnected || !address) {
      await logClientError('useVaultStaking:withdrawETH', new Error('Wallet not connected'), {
        isConnected,
        hasAddress: Boolean(address),
      })
      throw new Error('Wallet not connected')
    }

    setError(null)
    setTransactionHash(null)

    try {
      const sharesAmount = parseEther(shares)

      console.log('从金库提取ETH:', {
        shares,
        sharesAmount: sharesAmount.toString()
      })

      const hash = await writeContractAsync({
        address: CONTRACTS[anvil.id].focusVault,
        abi: FOCUS_VAULT_ABI,
        functionName: 'withdrawETH',
        args: [sharesAmount],
        chain: anvil,
        account: address,
      })

      setTransactionHash(hash)
      console.log('✅ 提取交易已提交:', hash)
      
      // 刷新状态
      await Promise.all([refetchStake(), refetchBoost(), refetchShares()])
      
      return hash

    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to withdraw ETH'
      await logClientError('useVaultStaking:withdrawETH', e, { address, shares })
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [isConnected, address, writeContractAsync, refetchStake, refetchBoost, refetchShares])

  return {
    depositETH,
    withdrawETH,
    userStake: userStake as bigint | undefined,
    stakingBoost: stakingBoost as bigint | undefined,
    vaultShares: vaultShares as bigint | undefined,
    loading: isPending || isConfirming,
    success: isSuccess,
    error,
    transactionHash,
    refetch: async () => {
      await Promise.all([refetchStake(), refetchBoost(), refetchShares()])
    },
  }
}

