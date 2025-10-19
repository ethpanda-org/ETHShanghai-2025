import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { getContractAddresses } from '../../lib/contracts'

// ERC20 ABI for allowance() and approve()
const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export interface UseTokenApprovalParams {
  tokenAddress: `0x${string}` | undefined
  amount: string | number
}

export function useTokenApproval({ tokenAddress, amount }: UseTokenApprovalParams) {
  const { address, chainId } = useAccount()
  const [lastApproveTxHash, setLastApproveTxHash] = useState<`0x${string}` | undefined>()

  // Get AquaFluxCore contract address as spender
  const contractAddresses = getContractAddresses(chainId || 97)
  const aquaFluxCoreAddress = contractAddresses?.AquaFluxCore

  // Query current allowance
  const { data: allowanceRaw, isLoading: allowanceLoading, error: allowanceError, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && aquaFluxCoreAddress ? [address, aquaFluxCoreAddress] : undefined,
    query: {
      enabled: Boolean(tokenAddress && address && aquaFluxCoreAddress),
      refetchInterval: 3000 // 每3秒刷新一次
    }
  })

  // Approve transaction hook
  const { writeContract: executeApprove, isPending: isApproving } = useWriteContract()

  // Wait for approve transaction confirmation
  const { isLoading: isConfirmingApprove, isSuccess: isApproveSuccess, error: approveError } = useWaitForTransactionReceipt({
    hash: lastApproveTxHash,
  })

  // Convert amount to BigInt (assuming 18 decimals)
  const amountInWei = amount ? BigInt(Math.floor(parseFloat(amount.toString()) * 10**18)) : BigInt(0)

  // Convert allowance to readable format
  const currentAllowance = allowanceRaw || BigInt(0)

  // Check if approval is needed
  const needsApproval = amountInWei > currentAllowance

  // Execute approval for maximum amount (type(uint256).max)
  const executeApproveMax = async () => {
    if (!tokenAddress || !aquaFluxCoreAddress || !address) {
      const errorMsg = !address ? 'Wallet not connected' : !tokenAddress ? 'Token address not available' : 'AquaFluxCore contract not available'
      console.error('executeApproveMax failed:', errorMsg)
      throw new Error(errorMsg)
    }

    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

    return new Promise((resolve, reject) => {
      executeApprove(
        {
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [aquaFluxCoreAddress, maxUint256],
        },
        {
          onSuccess: (hash) => {
            setLastApproveTxHash(hash)
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
    // 状态
    needsApproval,
    currentAllowance: currentAllowance.toString(),
    isApproving,
    isConfirmingApprove,
    isApproveSuccess,
    allowanceLoading,

    // 错误
    allowanceError,
    approveError,

    // 方法
    executeApproveMax,
    refetchAllowance,

    // 调试信息
    tokenAddress,
    aquaFluxCoreAddress,
    userAddress: address,
    amountInWei: amountInWei.toString(),
    lastApproveTxHash
  }
}