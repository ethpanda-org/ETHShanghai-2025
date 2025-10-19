import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { Address } from 'viem'
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


/**
 * 查询 token 授权额度的钩子 (适配 wagmi v2)
 */
export function useTokenAllowance(
  token: Token | null,
  owner: string | undefined,
  spender: string | null
): string | undefined {
  const { data: allowance, isError, isLoading } = useReadContract({
    address: token?.address as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner && spender ? [owner as Address, spender as Address] : undefined,
    query: {
      enabled: !!(token && owner && spender && isValidTokenAddress(token.address)),
      // 启用实时监听
      refetchInterval: 3000 // 每3秒刷新一次
    }
  })

  return useMemo(() => {
    if (isLoading) return undefined
    if (isError) return '0' // 如果出错，假设没有授权
    if (!allowance) return '0' // 如果没有数据，假设没有授权
    return allowance.toString()
  }, [allowance, isError, isLoading])
}