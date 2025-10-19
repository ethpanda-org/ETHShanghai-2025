import { useBalance } from 'wagmi'
import { useAccount } from 'wagmi'

// Interface for asset object
interface Asset {
  aqToken?: string
  ptoken?: string
  ctoken?: string 
  stoken?: string
  [key: string]: any // Allow other asset properties
}

// Interface for token balances
interface TokenBalances {
  AQ: number
  P: number
  C: number
  S: number
}

// Interface for the hook return value
interface UseTokenBalancesReturn {
  balances: TokenBalances
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to get ERC20 token balances for P, C, S tokens
 * @param asset - The asset object containing ptoken, ctoken, stoken addresses
 * @returns Object containing balances for P, C, S tokens
 */
export const useTokenBalances = (asset?: Asset): UseTokenBalancesReturn => {
  const { address } = useAccount()

  // Get AQ token balance
  const { 
    data: aqBalance, 
    isLoading: aqLoading, 
    error: aqError,
    refetch: refetchAQ
  } = useBalance({
    address: address,
    token: asset?.aqToken as `0x${string}` | undefined,
    enabled: Boolean(address && asset?.aqToken)
  })

  // Get P token balance
  const { 
    data: pBalance, 
    isLoading: pLoading, 
    error: pError,
    refetch: refetchP
  } = useBalance({
    address: address,
    token: asset?.ptoken as `0x${string}` | undefined,
    enabled: Boolean(address && asset?.ptoken)
  })

  // Get C token balance
  const { 
    data: cBalance, 
    isLoading: cLoading, 
    error: cError,
    refetch: refetchC
  } = useBalance({
    address: address,
    token: asset?.ctoken as `0x${string}` | undefined,
    enabled: Boolean(address && asset?.ctoken)
  })

  // Get S token balance
  const { 
    data: sBalance, 
    isLoading: sLoading, 
    error: sError,
    refetch: refetchS
  } = useBalance({
    address: address,
    token: asset?.stoken as `0x${string}` | undefined,
    enabled: Boolean(address && asset?.stoken)
  })

  // Convert balances from wei to readable format
  const formatBalance = (balance: any): number => {
    if (!balance) return 0
    return parseFloat(balance.formatted) || 0
  }

  return {
    balances: {
      AQ: formatBalance(aqBalance),
      P: formatBalance(pBalance),
      C: formatBalance(cBalance),
      S: formatBalance(sBalance)
    },
    isLoading: aqLoading || pLoading || cLoading || sLoading,
    error: aqError || pError || cError || sError,
    refetch: () => {
      refetchAQ()
      refetchP()
      refetchC()
      refetchS()
    }
  }
}