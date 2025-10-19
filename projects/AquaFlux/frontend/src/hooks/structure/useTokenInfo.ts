import { useReadContract, useAccount } from 'wagmi'

// Standard ERC20 ABI for name(), symbol(), decimals(), and balanceOf()
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export interface TokenInfo {
  name: string
  symbol: string
  decimals: number
  balance: string
  balanceRaw: bigint
}

export function useTokenInfo(tokenAddress: `0x${string}` | undefined) {
  // Get user account
  const { address } = useAccount()

  // Query token name
  const { data: name, isLoading: nameLoading, error: nameError, refetch: refetchName } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'name',
    query: {
      enabled: Boolean(tokenAddress)
    }
  })

  // Query token symbol
  const { data: symbol, isLoading: symbolLoading, error: symbolError, refetch: refetchSymbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      enabled: Boolean(tokenAddress)
    }
  })

  // Query token decimals
  const { data: decimals, isLoading: decimalsLoading, error: decimalsError, refetch: refetchDecimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: Boolean(tokenAddress)
    }
  })

  // Query token balance
  const { data: balanceRaw, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(tokenAddress && address)
    }
  })

  // Convert balance to readable format with 2 decimal places
  const formatBalance = (balance: bigint, decimals: number) => {
    if (!balance || !decimals) return '0.00'
    const divisor = BigInt(10 ** decimals)
    const quotient = balance / divisor
    const remainder = balance % divisor
    const decimalValue = Number(remainder) / (10 ** decimals)
    const formattedBalance = Number(quotient) + decimalValue
    return formattedBalance.toFixed(2)
  }

  const isLoading = nameLoading || symbolLoading || decimalsLoading || balanceLoading
  const error = nameError || symbolError || decimalsError || balanceError

  const tokenInfo: TokenInfo | null = (name && symbol && decimals !== undefined) ? {
    name: name as string,
    symbol: symbol as string,
    decimals: decimals as number,
    balance: formatBalance(balanceRaw || BigInt(0), decimals as number),
    balanceRaw: balanceRaw || BigInt(0)
  } : null

  // Create a combined refetch function that refreshes all token data
  const refetchAll = async () => {
    const results = await Promise.all([
      refetchName(),
      refetchSymbol(),
      refetchDecimals(),
      refetchBalance()
    ])
    return results
  }

  return {
    tokenInfo,
    isLoading,
    error,
    refetch: refetchAll
  }
}