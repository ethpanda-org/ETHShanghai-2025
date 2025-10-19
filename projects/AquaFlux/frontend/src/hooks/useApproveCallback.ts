import { useCallback, useMemo } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, Address } from 'viem'
import { useTokenAllowance } from './useTokenAllowance'
import { isValidTokenAddress } from '../constants/tokens'
import { ERC20_ABI } from '../contracts/abis/erc20'

// Types
interface Token {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}


export enum ApprovalState {
  UNKNOWN = 'UNKNOWN',
  NOT_APPROVED = 'NOT_APPROVED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED'
}

// 最大授权数量 (2^256 - 1)
const MAX_ALLOWANCE = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn

/**
 * 授权回调 hook (适配 wagmi v2)
 */
export function useApproveCallback(
  amountToApprove: string,
  token: Token | null,
  spender: string | null
): [ApprovalState, () => Promise<void>] {
  const { address: account } = useAccount()
  const currentAllowance = useTokenAllowance(token, account, spender)

  const { writeContract, data: hash, isPending, error } = useWriteContract()

  // 等待交易确认
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // 检查当前授权状态
  const approvalState = useMemo((): ApprovalState => {
    if (!amountToApprove || !spender || !token || !isValidTokenAddress(token.address)) {
      return ApprovalState.UNKNOWN
    }

    // 如果 currentAllowance 是 undefined，说明还在加载中
    if (currentAllowance === undefined) {
      return ApprovalState.UNKNOWN
    }

    // 如果有待处理的授权交易
    if (isPending || isConfirming) {
      return ApprovalState.PENDING
    }

    try {
      const amountBN = parseUnits(amountToApprove, token.decimals)
      const allowanceBN = BigInt(currentAllowance || '0')

      return allowanceBN < amountBN ? ApprovalState.NOT_APPROVED : ApprovalState.APPROVED
    } catch (error) {
      console.error('Error checking approval state:', error)
      return ApprovalState.UNKNOWN
    }
  }, [amountToApprove, currentAllowance, spender, token, isPending, isConfirming])

  const approve = useCallback(async (): Promise<void> => {
    if (approvalState !== ApprovalState.NOT_APPROVED) {
      console.error('approve was called unnecessarily')
      return
    }

    if (!token || !spender || !account) {
      console.error('Missing required parameters for approval')
      return
    }

    try {
      await writeContract({
        address: token.address as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender as Address, MAX_ALLOWANCE] // 授权最大数量
      })
    } catch (error) {
      console.error('Failed to approve token:', error)
      throw error
    }
  }, [approvalState, token, spender, account, writeContract])

  return [approvalState, approve]
}

/**
 * 为交易包装的授权回调
 */
export function useApproveCallbackFromTrade(
  amountToApprove: string,
  token: Token | null,
  spender: string | null
): [ApprovalState, () => Promise<void>] {
  return useApproveCallback(amountToApprove, token, spender)
}