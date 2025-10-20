import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { getContractAddresses } from '../contracts/addresses'
import { CRNTokenABI } from '../contracts/abis'
import { useState, useEffect } from 'react'
import { formatUnits, zeroAddress } from 'viem'

/**
 * CRN Token 合约交互 Hook
 * 用于查询余额、领取奖励等
 */
export function useCRNToken() {
  const { address, chainId } = useAccount()
  const [contractAddress, setContractAddress] = useState<string>('')

  useEffect(() => {
    if (!chainId) {
      setContractAddress('')
      return
    }

    const addresses = getContractAddresses(chainId)
    const candidate = addresses.CRNToken

    if (!candidate || candidate === zeroAddress) {
      setContractAddress('')
      return
    }

    setContractAddress(candidate)
  }, [chainId])

  // 查询 CRN 余额
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CRNTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  })

  // 查询待领取奖励
  const { data: pendingRewards, refetch: refetchPendingRewards } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CRNTokenABI,
    functionName: 'pendingRewards',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  })

  // 领取奖励
  const { writeContract: claimRewards, data: claimHash } = useWriteContract()
  const { isLoading: isClaiming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  // 领取奖励操作
  const handleClaimRewards = async () => {
    if (!contractAddress) return

    claimRewards({
      address: contractAddress as `0x${string}`,
      abi: CRNTokenABI,
      functionName: 'claimRewards',
    })
  }

  // 格式化余额（假设 18 位小数）
  const formattedBalance = balance ? parseFloat(formatUnits(balance as bigint, 18)) : 0
  const formattedPendingRewards = pendingRewards
    ? parseFloat(formatUnits(pendingRewards as bigint, 18))
    : 0

  return {
    // 数据
    balance: formattedBalance,
    pendingRewards: formattedPendingRewards,
    
    // 操作
    claimRewards: handleClaimRewards,
    isClaiming,
    isClaimSuccess,
    
    // 刷新
    refetchBalance,
    refetchPendingRewards,
  }
}

