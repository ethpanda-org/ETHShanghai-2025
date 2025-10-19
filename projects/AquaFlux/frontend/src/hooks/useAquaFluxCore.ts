import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import AquaFluxCoreContract from '../abis/AquaFluxCore.json'
import { getContractAddresses } from '../lib/contracts'

const AquaFluxCoreABI = AquaFluxCoreContract.abi

export interface WrapParams {
  assetId: `0x${string}`
  amount: bigint
}

export interface UnwrapParams {
  assetId: `0x${string}`
  amount: bigint
}

export interface SplitParams {
  assetId: `0x${string}`
  amount: bigint
}

export interface MergeParams {
  assetId: `0x${string}`
  amount: bigint
}

export interface AssetInfo {
  issuer: `0x${string}`
  rwaToken: `0x${string}`
  maturity: bigint
  operationDeadline: bigint
  couponRate: bigint
  couponAllocationC: bigint
  couponAllocationS: bigint
  sTokenFeeAllocation: bigint
  name: string
  metadataURI: string
  verified: boolean
  paused: boolean
  aqToken: `0x${string}`
  pTokenAddress: `0x${string}`
  cTokenAddress: `0x${string}`
  sTokenAddress: `0x${string}`
}

export function useAquaFluxCore() {
  const { address, chainId } = useAccount()
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>()
  
  const contractAddresses = getContractAddresses(chainId || 97)
  const aquaFluxCoreAddress = contractAddresses?.AquaFluxCore

  const { writeContract: wrapAsset, isPending: isWrapping } = useWriteContract()
  const { writeContract: unwrapAsset, isPending: isUnwrapping } = useWriteContract()
  const { writeContract: splitAsset, isPending: isSplitting } = useWriteContract()
  const { writeContract: mergeAsset, isPending: isMerging } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, error } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  })

  const executeWrap = async (params: WrapParams) => {
    if (!aquaFluxCoreAddress || !address) {
      const errorMsg = !address ? 'Wallet not connected' : 'AquaFlux Core contract not available on this network'
      console.error('executeWrap failed:', errorMsg)
      throw new Error(errorMsg)
    }

    return new Promise((resolve, reject) => {
      wrapAsset(
        {
          address: aquaFluxCoreAddress,
          abi: AquaFluxCoreABI,
          functionName: 'wrap',
          args: [
            params.assetId,
            params.amount
          ],
        },
        {
          onSuccess: (hash) => {
            setLastTxHash(hash)
            resolve({ 
              hash, 
              isLoading: true, 
              isSuccess: false, 
              error: null 
            })
          },
          onError: (error) => {
            reject({ 
              hash: undefined,
              isLoading: false, 
              isSuccess: false, 
              error 
            })
          },
        }
      )
    })
  }

  const executeUnwrap = async (params: UnwrapParams) => {
    if (!aquaFluxCoreAddress || !address) {
      const errorMsg = !address ? 'Wallet not connected' : 'AquaFlux Core contract not available on this network'
      console.error('executeUnwrap failed:', errorMsg)
      throw new Error(errorMsg)
    }

    return new Promise((resolve, reject) => {
      unwrapAsset(
        {
          address: aquaFluxCoreAddress,
          abi: AquaFluxCoreABI,
          functionName: 'unwrap',
          args: [
            params.assetId,
            params.amount
          ],
        },
        {
          onSuccess: (hash) => {
            setLastTxHash(hash)
            resolve({ 
              hash, 
              isLoading: true, 
              isSuccess: false, 
              error: null 
            })
          },
          onError: (error) => {
            reject({ 
              hash: undefined,
              isLoading: false, 
              isSuccess: false, 
              error 
            })
          },
        }
      )
    })
  }

  const executeSplit = async (params: SplitParams) => {
    if (!aquaFluxCoreAddress || !address) {
      const errorMsg = !address ? 'Wallet not connected' : 'AquaFlux Core contract not available on this network'
      console.error('executeSplit failed:', errorMsg)
      throw new Error(errorMsg)
    }

    return new Promise((resolve, reject) => {
      splitAsset(
        {
          address: aquaFluxCoreAddress,
          abi: AquaFluxCoreABI,
          functionName: 'split',
          args: [
            params.assetId,
            params.amount
          ],
        },
        {
          onSuccess: (hash) => {
            setLastTxHash(hash)
            resolve({ 
              hash, 
              isLoading: true, 
              isSuccess: false, 
              error: null 
            })
          },
          onError: (error) => {
            reject({ 
              hash: undefined,
              isLoading: false, 
              isSuccess: false, 
              error 
            })
          },
        }
      )
    })
  }

  const executeMerge = async (params: MergeParams) => {
    if (!aquaFluxCoreAddress || !address) {
      const errorMsg = !address ? 'Wallet not connected' : 'AquaFlux Core contract not available on this network'
      console.error('executeMerge failed:', errorMsg)
      throw new Error(errorMsg)
    }

    return new Promise((resolve, reject) => {
      mergeAsset(
        {
          address: aquaFluxCoreAddress,
          abi: AquaFluxCoreABI,
          functionName: 'merge',
          args: [
            params.assetId,
            params.amount
          ],
        },
        {
          onSuccess: (hash) => {
            setLastTxHash(hash)
            resolve({ 
              hash, 
              isLoading: true, 
              isSuccess: false, 
              error: null 
            })
          },
          onError: (error) => {
            reject({ 
              hash: undefined,
              isLoading: false, 
              isSuccess: false, 
              error 
            })
          },
        }
      )
    })
  }

  return {
    executeWrap,
    executeUnwrap,
    executeSplit,
    executeMerge,
    isWrapping,
    isUnwrapping,
    isSplitting,
    isMerging,
    isConfirming,
    isSuccess,
    error,
    isLoading: isConfirming,
    aquaFluxCoreAddress,
    lastTxHash
  }
}

// Hook for getting asset info
export function useAssetInfo(assetId: `0x${string}` | undefined) {
  const { chainId } = useAccount()
  const contractAddresses = getContractAddresses(chainId || 97)
  const aquaFluxCoreAddress = contractAddresses?.AquaFluxCore

  const { data: assetInfo, isLoading, error, refetch } = useReadContract({
    address: aquaFluxCoreAddress,
    abi: AquaFluxCoreABI,
    functionName: 'getAssetInfo',
    args: assetId ? [assetId] : undefined,
    query: {
      enabled: Boolean(aquaFluxCoreAddress && assetId)
    }
  }) as {
    data: any | undefined,
    isLoading: boolean,
    error: any,
    refetch: () => void
  }

  console.log('assetInfo11111', assetInfo)
  // Convert the tuple result to typed AssetInfo object
  const asset: AssetInfo | null = assetInfo ? {
    issuer: assetInfo.issuer,
    rwaToken: assetInfo.rwaToken,
    maturity: assetInfo.maturity,
    operationDeadline: assetInfo.operationDeadline,
    couponRate: assetInfo.couponRate,
    couponAllocationC: assetInfo.couponAllocationC,
    couponAllocationS: assetInfo.couponAllocationS,
    sTokenFeeAllocation: assetInfo.sTokenFeeAllocation,
    name: assetInfo.name,
    metadataURI: assetInfo.metadataURI,
    verified: assetInfo.verified,
    paused: assetInfo.paused,
    aqToken: assetInfo.aqToken,
    pTokenAddress: assetInfo.pTokenAddress,
    cTokenAddress: assetInfo.cTokenAddress,
    sTokenAddress: assetInfo.sTokenAddress
  } : null

  return {
    asset,
    isLoading,
    error,
    refetch
  }
}