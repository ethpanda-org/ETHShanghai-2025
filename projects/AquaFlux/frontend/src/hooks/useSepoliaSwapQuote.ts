import { useState, useEffect, useMemo } from 'react'
import { useChainId, useReadContract } from 'wagmi'
import { formatTokenAmount, SEPOLIA_CHAIN_ID } from '../constants/tokens'
import { Address, parseUnits, encodePacked } from 'viem'
import { getQuoterAddress } from '../constants/addresses'
import { QUOTER_ABI } from '../contracts/abis/QUOTER_ABI'
import { showQuoteErrorToast } from '../utils/toastHelpers'

// Types
interface Token {
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

interface SwapQuote {
  inputAmount: number
  outputAmount: number
  rate: number
  priceImpact: number
  feeAmount: number
  minimumReceived: number
  route: Token[]
  gasEstimate: string
  outputAmountFormatted?: string
  minimumReceivedFormatted?: string
  feeAmountFormatted?: string
  timestamp?: number
  isReal?: boolean
}

interface SwapQuotePair {
  fromToken: Token
  toToken: Token
  inputAmount: string
  key?: string
}


export enum SwapQuoteState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  NO_ROUTE = 'no_route'
}

// Uniswap V3 默认费率层级
const POOL_FEES = {
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.3%
  HIGH: 10000,   // 1%
} as const

/**
 * 获取真实的链上报价
 */
function useRealSwapQuote(
  fromToken: Token | null,
  toToken: Token | null,
  inputAmount: string,
  chainId: number
) {
  const quoterAddress = getQuoterAddress(chainId)

  // 准备 Quoter 调用参数
  const quoterParams = useMemo(() => {
    if (!fromToken || !toToken || !inputAmount || !quoterAddress) {
      return null
    }

    const amount = parseFloat(inputAmount)
    if (isNaN(amount) || amount <= 0) {
      return null
    }

    // 处理 ETH 地址（使用 WETH 地址）
    const tokenInAddress = fromToken.address === '0x0000000000000000000000000000000000000000'
      ? '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' // Sepolia WETH
      : fromToken.address

    const tokenOutAddress = toToken.address === '0x0000000000000000000000000000000000000000'
      ? '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' // Sepolia WETH
      : toToken.address

    try {
      const amountIn = parseUnits(inputAmount, fromToken.decimals)

      // 编码路径：tokenIn + fee + tokenOut
      const encodedPath = encodePacked(
        ['address', 'uint24', 'address'],
        [tokenInAddress as Address, POOL_FEES.MEDIUM, tokenOutAddress as Address]
      )

      return {
        encodedPath,
        amountIn
      }
    } catch (error) {
      console.error('Error preparing quoter params:', error)
      return null
    }
  }, [fromToken, toToken, inputAmount, quoterAddress])

  // 调用 Quoter 合约获取报价 - 使用 quoteExactInput 而不是 quoteExactInputSingle
  const { data: quoteData, isError, isLoading, error } = useReadContract({
    address: quoterAddress as Address,
    abi: QUOTER_ABI,
    functionName: 'quoteExactInput',
    args: quoterParams ? [
      quoterParams.encodedPath,
      quoterParams.amountIn
    ] : undefined,
    query: {
      enabled: !!quoterParams,
      // 每30秒刷新一次报价
      refetchInterval: 30000
    }
  })

  return {
    quoteData,
    isError,
    isLoading,
    error
  }
}

/**
 * Sepolia 网络真实链上 swap 报价 hook
 * 使用 Uniswap V3 Quoter 合约获取真实报价
 */
export function useSepoliaSwapQuote(
  fromToken: Token | null,
  toToken: Token | null,
  inputAmount: string,
  enabled: boolean = true
) {
  const chainId = useChainId()

  // 检查是否在 Sepolia 网络
  const isSepoliaNetwork = useMemo(() => {
    return chainId === SEPOLIA_CHAIN_ID
  }, [chainId])

  // 检查输入参数有效性
  const isValidInput = useMemo(() => {
    if (!enabled || !isSepoliaNetwork || !fromToken || !toToken || !inputAmount) {
      return false
    }

    const amount = parseFloat(inputAmount)
    if (isNaN(amount) || amount <= 0) {
      return false
    }

    // 检查是否是相同代币
    if (fromToken.address.toLowerCase() === toToken.address.toLowerCase()) {
      return false
    }

    return true
  }, [enabled, isSepoliaNetwork, fromToken, toToken, inputAmount])

  // 使用真实的 Quoter 合约获取报价
  const { quoteData, isError, isLoading, error } = useRealSwapQuote(
    isValidInput ? fromToken : null,
    isValidInput ? toToken : null,
    isValidInput ? inputAmount : '',
    chainId
  )

  // 处理报价数据
  const quote = useMemo((): SwapQuote | null => {
    if (!quoteData || !fromToken || !toToken || !inputAmount) {
      return null
    }

    try {
      const inputValue = parseFloat(inputAmount)
      const outputAmount = Number(quoteData) / (10 ** toToken.decimals)
      const rate = outputAmount / inputValue

      // 计算费用和滑点（基于 Uniswap V3 0.3% 费率）
      const feeAmount = inputValue * 0.003
      const priceImpact = Math.max(0, (rate * inputValue - outputAmount) / (rate * inputValue))
      const minimumReceived = outputAmount * 0.98 // 2% 滑点容忍度

      return {
        inputAmount: inputValue,
        outputAmount,
        rate,
        priceImpact,
        feeAmount,
        minimumReceived,
        route: [fromToken, toToken],
        gasEstimate: '180000', // 估算的 gas 限制
        outputAmountFormatted: formatTokenAmount(outputAmount.toString(), toToken.decimals),
        minimumReceivedFormatted: formatTokenAmount(minimumReceived.toString(), toToken.decimals),
        feeAmountFormatted: formatTokenAmount(feeAmount.toString(), fromToken.decimals),
        timestamp: Date.now(),
        isReal: true
      }
    } catch (err) {
      console.error('处理报价数据失败:', err)
      return null
    }
  }, [quoteData, fromToken, toToken, inputAmount])

  // 计算状态
  const state = useMemo(() => {
    if (!isValidInput) {
      return SwapQuoteState.IDLE
    }

    if (isLoading) {
      return SwapQuoteState.LOADING
    }

    if (isError || !quoteData) {
      // 只在有错误且之前状态不是错误时显示 toast
      if (isError && error) {
        showQuoteErrorToast(error)
      }
      return SwapQuoteState.ERROR
    }

    return SwapQuoteState.SUCCESS
  }, [isValidInput, isLoading, isError, quoteData, error])

  // 刷新函数
  const refresh = () => {
    // wagmi 会自动处理重新获取
    console.log('刷新报价...')
  }

  // 重置函数
  const reset = () => {
    // 状态由 wagmi 管理，无需手动重置
    console.log('重置报价状态...')
  }

  return {
    // 状态
    state,
    isLoading: state === SwapQuoteState.LOADING,
    isSuccess: state === SwapQuoteState.SUCCESS,
    isError: state === SwapQuoteState.ERROR,
    isIdle: state === SwapQuoteState.IDLE,

    // 数据
    quote,

    // 网络状态
    isSepoliaNetwork,
    currentChainId: chainId,

    // 操作
    refresh,
    reset
  }
}

/**
 * 用于获取多个交易对报价的 hook（暂不支持，建议单独调用）
 */
export function useMultipleSwapQuotes(pairs: SwapQuotePair[], enabled: boolean = true) {
  const chainId = useChainId()
  const [quotes] = useState<{ [key: string]: SwapQuote }>({})
  const [loading] = useState(false)

  // 多个报价暂不支持真实链上查询，建议使用单个报价 hook
  // 未来可以考虑批量查询优化

  return {
    quotes,
    loading,
    isSepoliaNetwork: chainId === SEPOLIA_CHAIN_ID
  }
}