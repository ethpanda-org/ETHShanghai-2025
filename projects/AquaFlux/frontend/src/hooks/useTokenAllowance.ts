import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { getContractAddresses } from '../lib/contracts'

// Standard ERC20 ABI for allowance and approve functions
const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export interface UseTokenAllowanceParams {
  tokenAddress: `0x${string}` | undefined
  amount: string | undefined
}

export function useTokenAllowance({ tokenAddress, amount }: UseTokenAllowanceParams) {
  const { address, chainId } = useAccount()
  const [lastApproveTxHash, setLastApproveTxHash] = useState<`0x${string}` | undefined>()
  
  const contractAddresses = getContractAddresses(chainId || 688688)
  const aquaFluxCoreAddress = contractAddresses?.AquaFluxCore
  
  // Get token decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: Boolean(tokenAddress)
    }
  })
  
  // Get current allowance
  const { data: allowance, isLoading: isLoadingAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && aquaFluxCoreAddress ? [address, aquaFluxCoreAddress] : undefined,
    query: {
      enabled: Boolean(tokenAddress && address && aquaFluxCoreAddress)
    }
  })
  
  // Approve transaction
  const { writeContract: approveToken, isPending: isApproving } = useWriteContract()
  
  // Wait for approve transaction confirmation
  const { isLoading: isConfirmingApprove, isSuccess: isApproveSuccess, error: approveError } = useWaitForTransactionReceipt({
    hash: lastApproveTxHash,
  })
  
  // Check if current allowance is sufficient
  const needsApproval = () => {
    if (!amount || !decimals) return false
    if (allowance === undefined || allowance === null) return false
    
    try {
      const amountBigInt = parseUnits(amount, decimals)
      const needs = allowance < amountBigInt
      return needs
    } catch (error) {
      console.error('needsApproval error:', error)
      return false
    }
  }
  
  // Execute approve
  const executeApprove = async () => {
    if (!tokenAddress || !aquaFluxCoreAddress || !address || !amount || !decimals) {
      throw new Error('Missing required parameters for approval')
    }
    
    try {
      const amountBigInt = parseUnits(amount, decimals)
      
      return new Promise((resolve, reject) => {
        approveToken(
          {
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [aquaFluxCoreAddress, amountBigInt],
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
    } catch (err) {
      throw new Error(`Failed to approve token: ${err}`)
    }
  }
  
  // Execute approve with max allowance (for better UX)
  const executeApproveMax = async () => {
    if (!tokenAddress || !aquaFluxCoreAddress || !address) {
      throw new Error('Missing required parameters for approval')
    }
    
    // Use max uint256 value for unlimited approval
    const maxAllowance = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    
    return new Promise((resolve, reject) => {
      approveToken(
        {
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [aquaFluxCoreAddress, maxAllowance],
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
    // Data
    allowance,
    decimals,
    needsApproval: needsApproval(),
    
    // Methods
    executeApprove,
    executeApproveMax,
    refetchAllowance,
    
    // States
    isLoadingAllowance,
    isApproving,
    isConfirmingApprove,
    isApproveSuccess,
    approveError,
    isLoading: isLoadingAllowance || isApproving || isConfirmingApprove,
    
    // Transaction hash
    lastApproveTxHash,
    
    // Contract addresses
    aquaFluxCoreAddress,
    tokenAddress
  }
}