"use client"

import { useBalance } from 'wagmi'
import { CONTRACTS, anvil } from '../chain'
import { useEffect } from 'react'

export function useTokenBalance(address?: `0x${string}`) {
  const contracts = CONTRACTS[anvil.id]
  
  // Debug: 打印合约地址
  useEffect(() => {
    if (address && typeof window !== 'undefined') {
      console.log('🔍 Token Balance Debug:', {
        address,
        focusTokenAddress: contracts.focus,
        usdcAddress: contracts.usdc
      })
    }
  }, [address, contracts])

  // Read FOCUS token balance using useBalance hook
  const { data: focusBalance, error: focusError, isLoading: focusLoading, refetch: refetchFocus } = useBalance({
    address: address,
    token: contracts.focus,
    query: { 
      enabled: !!address,
      refetchInterval: 60000 // 每1分钟刷新一次
    }
  })

  // Read USDC balance using useBalance hook
  const { data: usdcBalance, error: usdcError, isLoading: usdcLoading, refetch: refetchUsdc } = useBalance({
    address: address,
    token: contracts.usdc,
    query: { 
      enabled: !!address,
      refetchInterval: 60000 // 每1分钟刷新一次
    }
  })

  // Debug: 打印余额读取结果
  useEffect(() => {
    if (address && typeof window !== 'undefined') {
      console.log('💰 Balance Read Result:', {
        focusBalance: focusBalance?.value?.toString(),
        focusDecimals: focusBalance?.decimals,
        focusSymbol: focusBalance?.symbol,
        focusError: focusError?.message,
        focusLoading,
        usdcBalance: usdcBalance?.value?.toString(),
        usdcDecimals: usdcBalance?.decimals,
        usdcSymbol: usdcBalance?.symbol,
        usdcError: usdcError?.message,
        usdcLoading
      })
    }
  }, [address, focusBalance, focusError, focusLoading, usdcBalance, usdcError, usdcLoading])

  // 合并refetch函数
  const refetch = async () => {
    await Promise.all([refetchFocus(), refetchUsdc()])
  }

  return {
    focusBalance: focusBalance?.value as bigint | undefined,
    usdcBalance: usdcBalance?.value as bigint | undefined,
    focusDecimals: focusBalance?.decimals,
    usdcDecimals: usdcBalance?.decimals,
    isLoading: focusLoading || usdcLoading,
    error: focusError || usdcError,
    refetch
  }
}
