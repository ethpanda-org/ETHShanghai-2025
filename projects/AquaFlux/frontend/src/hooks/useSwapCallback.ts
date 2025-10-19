import { useCallback, useMemo } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseUnits, Address } from 'viem'
import { ApprovalState } from './useApproveCallback'
import { getSwapRouterAddress } from '../constants/addresses'
import { SWAP_ROUTER } from '../contracts/abis/SWAP_ROUTER'

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

interface SwapParams {
  tokenIn: string
  tokenOut: string
  fee: number
  recipient: string
  deadline: bigint
  amountIn: bigint
  amountOutMinimum: bigint
  sqrtPriceLimitX96: bigint
}

export enum SwapCallbackState {
  INVALID = 'INVALID',
  LOADING = 'LOADING',
  VALID = 'VALID'
}


/**
 * 错误消息转换为用户可读格式
 */
function swapErrorToUserReadableMessage(error: any): string {
  let reason: string | undefined = error?.reason || error?.message

  if (reason?.includes('execution reverted:')) {
    reason = reason.replace('execution reverted: ', '')
  }

  switch (reason) {
    case 'Too little received':
    case 'Too much requested':
    case 'STF':
      return '由于价格变动，此交易不会成功。请尝试增加滑点容忍度。'
    case 'TF':
      return '输出代币无法转移。输出代币可能存在问题。'
    default:
      if (reason?.includes('undefined is not an object')) {
        console.error(error, reason)
        return '执行此交换时发生错误。您可能需要增加滑点容忍度。'
      }
      return `未知错误${reason ? `: "${reason}"` : ''}。请尝试增加滑点容忍度。`
  }
}

/**
 * 交换回调 hook (真实链上版本，适配 wagmi v2)
 */
export function useSwapCallback(
  fromToken: Token | null,
  toToken: Token | null,
  fromAmount: string,
  quote: SwapQuote | null,
  slippage: number = 0.005,
  recipient?: string | null,
  approvalState?: ApprovalState,
  deadline: number = 20
): {
  state: SwapCallbackState
  callback: (() => Promise<string | undefined>) | null
  error: string | null
  lastTxHash: string | undefined
} {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  // 等待交易确认
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // 获取SwapRouter合约地址
  const swapRouterAddress = getSwapRouterAddress(chainId)

  // 计算交换参数
  const swapParams = useMemo((): SwapParams | null => {
    if (!fromToken || !toToken || !fromAmount || !quote || !account) {
      return null
    }

    try {
      // 确保 fromAmount 是字符串
      const inputAmountStr = String(fromAmount)

      const inputAmount = parseUnits(inputAmountStr, fromToken.decimals)
      // quote.outputAmount 可能是 number 或 string，需要特殊处理
      const outputAmountBigInt = typeof quote.outputAmount === 'string'
        ? parseUnits(quote.outputAmount, toToken.decimals)
        : parseUnits(quote.outputAmount.toString(), toToken.decimals)

      const slippagePercent = Math.floor(slippage * 10000) // 转换为基点 (0.005 = 50)
      const recipientAddress = recipient || account
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + (deadline * 60) // deadline in minutes

      // 计算最小输出量（考虑滑点）- 修复计算方式
      const minOutputAmount = outputAmountBigInt * BigInt(10000 - slippagePercent) / 10000n

      // 处理ETH地址 - ETH需要转换为WETH地址用于Uniswap V3
      const tokenInAddress = fromToken.symbol === 'ETH' && fromToken.address === '0x0000000000000000000000000000000000000000'
        ? '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' // Sepolia WETH
        : fromToken.address

      const tokenOutAddress = toToken.symbol === 'ETH' && toToken.address === '0x0000000000000000000000000000000000000000'
        ? '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' // Sepolia WETH
        : toToken.address

      return {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        fee: 3000, // 0.3% 费率
        recipient: recipientAddress,
        deadline: BigInt(deadlineTimestamp),
        amountIn: inputAmount,
        amountOutMinimum: minOutputAmount,
        sqrtPriceLimitX96: 0n // 不设置价格限制
      }
    } catch (error) {
      console.error('Failed to calculate swap params:', error)
      return null
    }
  }, [fromToken, toToken, fromAmount, quote, account, slippage, recipient, deadline])

  // 计算交换状态
  const state = useMemo((): SwapCallbackState => {
    if (!fromToken || !toToken || !fromAmount || !quote || !account) {
      return SwapCallbackState.INVALID
    }

    if (!swapRouterAddress) {
      return SwapCallbackState.INVALID
    }

    if (!swapParams) {
      return SwapCallbackState.INVALID
    }

    // 检查授权状态（ETH不需要授权）
    if (approvalState !== ApprovalState.APPROVED && fromToken.symbol !== 'ETH') {
      return SwapCallbackState.INVALID
    }

    if (isPending || isConfirming) {
      return SwapCallbackState.LOADING
    }

    return SwapCallbackState.VALID
  }, [fromToken, toToken, fromAmount, quote, account, swapRouterAddress, swapParams, approvalState, isPending, isConfirming])

  // 真实交换函数
  const swapCallback = useCallback(async (): Promise<string | undefined> => {
    if (!fromToken || !toToken || !fromAmount || !quote || !account) {
      throw new Error('缺少交换参数')
    }

    if (!swapRouterAddress) {
      throw new Error('找不到交换路由器合约地址')
    }

    if (!swapParams) {
      throw new Error('无效的交换参数')
    }

    // 检查授权状态（ETH不需要授权）
    if (approvalState !== ApprovalState.APPROVED && fromToken.symbol !== 'ETH') {
      throw new Error('代币未授权')
    }

    try {
      console.log('🔄 执行链上交换:', {
        from: `${fromAmount} ${fromToken.symbol}`,
        to: `${quote.outputAmount} ${toToken.symbol}`,
        minOutput: (Number(swapParams.amountOutMinimum) / (10 ** toToken.decimals)).toFixed(6),
        slippage: `${(slippage * 100).toFixed(2)}%`,
        route: 'Uniswap V3 Sepolia',
        router: swapRouterAddress
      })

      // 调用Uniswap V3 SwapRouter合约
      const txConfig: any = {
        address: swapRouterAddress as Address,
        abi: SWAP_ROUTER,
        functionName: 'exactInputSingle',
        args: [swapParams]
      }

      // 如果是ETH交换，需要发送ETH value
      if (fromToken.symbol === 'ETH') {
        txConfig.value = swapParams.amountIn
      }

      await writeContract(txConfig)

      return hash
    } catch (error: any) {
      console.error('交换失败:', error)

      // 处理用户取消交易
      if (error?.code === 4001) {
        throw new Error('交易被用户取消')
      }

      // 转换错误消息
      const userReadableError = swapErrorToUserReadableMessage(error)
      throw new Error(userReadableError)
    }
  }, [
    fromToken,
    toToken,
    fromAmount,
    quote,
    slippage,
    account,
    approvalState,
    swapRouterAddress,
    swapParams,
    writeContract,
    hash
  ])

  return {
    state,
    callback: swapCallback,
    error: error ? swapErrorToUserReadableMessage(error) : null,
    lastTxHash: hash
  }
}