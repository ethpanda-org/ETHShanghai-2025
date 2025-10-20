import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { readContract } from 'wagmi/actions'
import { zeroAddress } from 'viem'
import { getContractAddresses } from '../contracts/addresses'
import { DataMarketplaceABI } from '../contracts/abis'
import { config as wagmiConfig } from '../config/wagmi'

/**
 * Data Marketplace 合约交互 Hook
 * 用于管理数据授权和使用记录
 */
export function useDataMarketplace() {
  const { address, chainId } = useAccount()
  const [contractAddress, setContractAddress] = useState<string>('')

  useEffect(() => {
    if (!chainId) {
      setContractAddress('')
      return
    }

    const addresses = getContractAddresses(chainId)
    const candidate = addresses.DataMarketplace

    if (!candidate || candidate === zeroAddress) {
      setContractAddress('')
      return
    }

    setContractAddress(candidate)
  }, [chainId])

  // 查询授权的应用列表
  const { data: authorizedApps, refetch: refetchAuthorizedApps } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: DataMarketplaceABI,
    functionName: 'getAuthorizedApps',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  })

  // 授权应用
  const { writeContract: authorize, data: authorizeHash } = useWriteContract()
  const { isLoading: isAuthorizing, isSuccess: isAuthorizeSuccess } = useWaitForTransactionReceipt({
    hash: authorizeHash,
  })

  // 撤销授权
  const { writeContract: revoke, data: revokeHash } = useWriteContract()
  const { isLoading: isRevoking, isSuccess: isRevokeSuccess } = useWaitForTransactionReceipt({
    hash: revokeHash,
  })

  // 授权应用访问数据
  const handleAuthorizeApp = async (
    appAddress: string,
    dimensionIds: number[],
    duration: number = 365 * 24 * 60 * 60 // 默认 1 年
  ) => {
    if (!contractAddress || !address || !appAddress || appAddress === zeroAddress) return

    authorize({
      address: contractAddress as `0x${string}`,
      abi: DataMarketplaceABI,
      functionName: 'authorizeApp',
      args: [appAddress as `0x${string}`, dimensionIds.map(id => BigInt(id)), BigInt(duration)],
    })
  }

  // 撤销应用授权
  const handleRevokeAuthorization = async (appAddress: string) => {
    if (!contractAddress || !address || !appAddress || appAddress === zeroAddress) return

    revoke({
      address: contractAddress as `0x${string}`,
      abi: DataMarketplaceABI,
      functionName: 'revokeAuthorization',
      args: [appAddress as `0x${string}`],
    })
  }

  // 检查应用是否已授权
  const checkAuthorization = async (appAddress: string): Promise<boolean> => {
    if (!contractAddress || !address || !appAddress || appAddress === zeroAddress) return false

    try {
      return await readContract(wagmiConfig, {
        address: contractAddress as `0x${string}`,
        abi: DataMarketplaceABI,
        functionName: 'isAuthorized',
        args: [address as `0x${string}`, appAddress as `0x${string}`],
      })
    } catch (error) {
      console.error('Failed to check authorization', error)
      return false
    }
  }

  return {
    // 数据
    authorizedApps: authorizedApps as string[] | undefined,
    
    // 操作
    authorizeApp: handleAuthorizeApp,
    revokeAuthorization: handleRevokeAuthorization,
    checkAuthorization,
    isAuthorizing,
    isAuthorizeSuccess,
    isRevoking,
    isRevokeSuccess,
    
    // 刷新
    refetchAuthorizedApps,
  }
}

