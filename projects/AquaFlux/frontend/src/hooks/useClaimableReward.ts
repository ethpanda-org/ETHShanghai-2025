import { useState, useEffect } from 'react'
import { useReadContract, useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { getContractAddresses } from '../lib/contracts'
import AquaFluxCoreContract from '../abis/AquaFluxCore.json'
import {
  showTransactionErrorToast,
  showTransactionSuccessToast,
  showTransactionSubmittedToast
} from '../utils/toastHelpers'

// 使用真实的ABI文件
const AQUAFLUX_CORE_ABI = AquaFluxCoreContract.abi

// 类型定义
export interface TokenReward {
  amount: number
  isLoading: boolean
  error: any
}

export interface ClaimableRewards {
  P: TokenReward
  C: TokenReward
  S: TokenReward
}

export interface AssetInfo {
  pTokenAddress?: `0x${string}`
  cTokenAddress?: `0x${string}`
  sTokenAddress?: `0x${string}`
}

export interface ClaimableRewardsResult {
  rewards: ClaimableRewards
  totalClaimable: number
  isLoading: boolean
  hasError: any
  pClaimable: number
  cClaimable: number
  sClaimable: number
  // Claim 功能
  claimReward: (tokenType: 'P' | 'C' | 'S') => Promise<void>
  isClaimingP: boolean
  isClaimingC: boolean
  isClaimingS: boolean
  isConfirming: boolean
  lastClaimTxHash: `0x${string}` | undefined
}

export interface ClaimRewardParams {
  assetId: string
  tokenAddress: `0x${string}`
  tokenType: 'P' | 'C' | 'S'
}

// 单个token的可领取奖励 hook
function useTokenClaimableReward(
  assetId: string | undefined,
  tokenAddress: `0x${string}` | undefined,
  enabled: boolean = true
): TokenReward {
  const { address: userAddress } = useAccount()
  const chainId = useChainId()

  // 获取当前网络的合约地址
  const contractAddresses = getContractAddresses(chainId)
  const aquaFluxCoreAddress = contractAddresses?.AquaFluxCore as `0x${string}` | undefined
  
  const { data, error, isLoading } = useReadContract({
    address: aquaFluxCoreAddress,
    abi: AQUAFLUX_CORE_ABI,
    functionName: 'getClaimableReward',
    args: [assetId, userAddress, tokenAddress],
    enabled: enabled && !!userAddress && !!assetId && !!tokenAddress && !!aquaFluxCoreAddress,
    watch: true, // 实时更新
  })
  return {
    amount: data ? Number(data) / Math.pow(10, 18) : 0, // USDC是18位小数
    isLoading,
    error
  }
}

// 主要的 hook：获取P/C/S三个token的可领取奖励
export function useClaimableRewards(
  assetId: string | undefined,
  assetInfo: AssetInfo | undefined,
  enabled: boolean = true,
  onClaimSuccess?: () => void
): ClaimableRewardsResult {
  const { address: userAddress, chainId } = useAccount()
  const [rewards, setRewards] = useState<ClaimableRewards>({
    P: { amount: 0, isLoading: false, error: null },
    C: { amount: 0, isLoading: false, error: null },
    S: { amount: 0, isLoading: false, error: null }
  })
  const [lastClaimTxHash, setLastClaimTxHash] = useState<`0x${string}` | undefined>()
  const [processedTxHashes, setProcessedTxHashes] = useState<Set<string>>(new Set())

  // 获取合约地址
  const contractAddresses = getContractAddresses(chainId || 97)
  const aquaFluxCoreAddress = contractAddresses?.AquaFluxCore as `0x${string}` | undefined

  // Claim 合约调用 hooks
  const { writeContract: claimP, isPending: isClaimingP } = useWriteContract()
  const { writeContract: claimC, isPending: isClaimingC } = useWriteContract()
  const { writeContract: claimS, isPending: isClaimingS } = useWriteContract()

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: lastClaimTxHash,
  })

  // 处理交易成功
  useEffect(() => {
    if (isSuccess && lastClaimTxHash && !processedTxHashes.has(lastClaimTxHash)) {
      // 标记该交易哈希已处理
      setProcessedTxHashes(prev => new Set(prev).add(lastClaimTxHash))

      showTransactionSuccessToast(
        lastClaimTxHash,
        chainId || 11155111, // 默认 Sepolia
        'Reward claimed successfully!'
      )

      // 2秒后刷新数据
      if (onClaimSuccess) {
        setTimeout(() => {
          onClaimSuccess()
        }, 2000)
      }
    }
  }, [isSuccess, lastClaimTxHash, chainId, onClaimSuccess, processedTxHashes])

  // P Token 可领取奖励
  const pReward = useTokenClaimableReward(
    assetId,
    assetInfo?.pTokenAddress,
    enabled && !!assetInfo?.pTokenAddress
  )

  // C Token 可领取奖励
  const cReward = useTokenClaimableReward(
    assetId,
    assetInfo?.cTokenAddress,
    enabled && !!assetInfo?.cTokenAddress
  )

  // S Token 可领取奖励
  const sReward = useTokenClaimableReward(
    assetId,
    assetInfo?.sTokenAddress,
    enabled && !!assetInfo?.sTokenAddress
  )

  // 更新rewards状态
  useEffect(() => {
    setRewards({
      P: {
        amount: pReward.amount,
        isLoading: pReward.isLoading,
        error: pReward.error
      },
      C: {
        amount: cReward.amount,
        isLoading: cReward.isLoading,
        error: cReward.error
      },
      S: {
        amount: sReward.amount,
        isLoading: sReward.isLoading,
        error: sReward.error
      }
    })
  }, [
    pReward.amount, pReward.isLoading, pReward.error,
    cReward.amount, cReward.isLoading, cReward.error,
    sReward.amount, sReward.isLoading, sReward.error
  ])

  // 计算总的可领取奖励
  const totalClaimable = rewards.P.amount + rewards.C.amount + rewards.S.amount

  // 检查是否有任何loading状态
  const isLoading = rewards.P.isLoading || rewards.C.isLoading || rewards.S.isLoading

  // 检查是否有错误
  const hasError = rewards.P.error || rewards.C.error || rewards.S.error

  // Claim 奖励函数
  const claimReward = async (tokenType: 'P' | 'C' | 'S'): Promise<void> => {
    if (!aquaFluxCoreAddress || !userAddress || !assetId || !assetInfo) {
      const errorMsg = !userAddress ? 'Wallet not connected' :
                       !assetId ? 'Asset ID not provided' :
                       !assetInfo ? 'Asset info not available' :
                       'AquaFlux Core contract not available on this network'
      console.error('claimReward failed:', errorMsg)
      throw new Error(errorMsg)
    }

    // 获取对应的token地址
    let tokenAddress: `0x${string}` | undefined
    let writeContract: typeof claimP

    switch (tokenType) {
      case 'P':
        tokenAddress = assetInfo.pTokenAddress
        writeContract = claimP
        break
      case 'C':
        tokenAddress = assetInfo.cTokenAddress
        writeContract = claimC
        break
      case 'S':
        tokenAddress = assetInfo.sTokenAddress
        writeContract = claimS
        break
    }

    if (!tokenAddress) {
      throw new Error(`${tokenType} token address not available`)
    }

    return new Promise((resolve, reject) => {
      writeContract(
        {
          address: aquaFluxCoreAddress,
          abi: AQUAFLUX_CORE_ABI,
          functionName: 'claimMaturityReward',
          args: [assetId, tokenAddress],
        },
        {
          onSuccess: (hash) => {
            setLastClaimTxHash(hash)
            console.log(`${tokenType} reward claim submitted:`, hash)
            // 显示交易提交提示
            showTransactionSubmittedToast(`${tokenType} reward claim submitted, awaiting confirmation...`)
            resolve()
          },
          onError: (error) => {
            console.error(`${tokenType} reward claim failed:`, error)
            showTransactionErrorToast(error, `${tokenType} Reward Claim`)
            reject(error)
          },
        }
      )
    })
  }

  return {
    rewards,
    totalClaimable,
    isLoading,
    hasError,
    // 便捷访问各层奖励
    pClaimable: rewards.P.amount,
    cClaimable: rewards.C.amount,
    sClaimable: rewards.S.amount,
    // Claim 功能
    claimReward,
    isClaimingP,
    isClaimingC,
    isClaimingS,
    isConfirming,
    lastClaimTxHash
  }
}

export default useClaimableRewards