import { useState, useEffect, useRef } from 'react'
import { useAccount, useChainId } from 'wagmi'
import SwapTokenSelect from './SwapTokenSelect'
import AssetMiniCard from './AssetMiniCard'
import { useSepoliaSwapQuote } from '../hooks/useSepoliaSwapQuote'
import { useApproveCallback, ApprovalState } from '../hooks/useApproveCallback'
import { useSwapCallback, SwapCallbackState } from '../hooks/useSwapCallback'
import { SEPOLIA_TOKENS, SEPOLIA_CHAIN_ID, formatTokenSymbol, formatTokenAmount } from '../constants/tokens'
import { getSwapRouterAddress } from '../constants/addresses'
import { cx } from '../utils/helpers'
import {
  showTransactionErrorToast,
  showApprovalSubmittedToast,
  showApprovalSuccessToast,
  showSwapSubmittedToast,
  showTransactionSuccessToast
} from '../utils/toastHelpers'
import SwapSettings from './common/SwapSettings'

const SLIPPAGE_DEFAULT = 0.005 // 0.5%
const FEE_BPS = 20 // 0.20%
const DEADLINE_DEFAULT = 20 // 20 minutes


export default function SwapTrading({ universe, asset, push, params }) {
  // Wagmi hooks
  const { address: userAddress, isConnected } = useAccount()
  const chainId = useChainId()

  // State management
  const [fromToken, setFromToken] = useState(null)
  const [toToken, setToToken] = useState(null)
  const [amountIn, setAmountIn] = useState("")
  const [slippage, setSlippage] = useState(SLIPPAGE_DEFAULT)
  const [deadline, setDeadline] = useState(DEADLINE_DEFAULT)
  const [showSettings, setShowSettings] = useState(false)
  const [showAdv, setShowAdv] = useState(false)
  const [showTradingDetails, setShowTradingDetails] = useState(false)

  // Track processed transactions to avoid duplicate toasts
  const processedTxHashes = useRef(new Set())

  // Initialize default tokens
  useEffect(() => {
    if (!fromToken) {
      setFromToken(SEPOLIA_TOKENS.ETH)
    }
    if (!toToken) {
      setToToken(SEPOLIA_TOKENS.USDC)
    }
  }, [fromToken, toToken])

  // Swap quote hook
  const {
    quote,
    isLoading: isQuoteLoading,
    isSuccess: isQuoteSuccess,
    isError: isQuoteError,
    isSepoliaNetwork
  } = useSepoliaSwapQuote(fromToken, toToken, amountIn, isConnected && chainId === SEPOLIA_CHAIN_ID)

  // 获取SwapRouter地址作为spender
  const swapRouterAddress = getSwapRouterAddress(chainId)

  // Token approval hook
  const [approvalState, approve] = useApproveCallback(
    amountIn,
    fromToken,
    swapRouterAddress
  )

  // Swap callback hook
  const {
    state: swapState,
    callback: swapCallback,
    error: swapCallbackError,
    lastTxHash: swapTxHash
  } = useSwapCallback(
    fromToken,
    toToken,
    amountIn,
    quote,
    slippage,
    userAddress,
    approvalState,
    deadline
  )

  // Handle successful swap transactions
  useEffect(() => {
    if (swapTxHash && !processedTxHashes.current.has(swapTxHash)) {
      processedTxHashes.current.add(swapTxHash)
      showTransactionSuccessToast(
        swapTxHash,
        chainId || 11155111, // 默认 Sepolia
        `Swap completed successfully!`
      )

      // Clear input after successful swap
      setAmountIn("")
    }
  }, [swapTxHash, chainId])

  // Helper functions
  const amt = parseFloat(amountIn) || 0
  const canSwap = amt > 0 && fromToken && toToken && fromToken.address !== toToken.address

  const switchTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setAmountIn("")
  }

  // Handle approval
  const handleApproval = async () => {
    if (!approve || !fromToken) return

    try {
      showApprovalSubmittedToast(fromToken.symbol)
      await approve()
      showApprovalSuccessToast(fromToken.symbol)
    } catch (error) {
      console.error('Approval failed:', error)
      showTransactionErrorToast(error, 'Approval')
    }
  }

  // Handle swap execution
  const handleSwap = async () => {
    if (!swapCallback || !quote || !fromToken || !toToken) return

    try {
      showSwapSubmittedToast(amountIn, fromToken.symbol, toToken.symbol)
      await swapCallback()
    } catch (error) {
      console.error('Swap failed:', error)
      showTransactionErrorToast(error, 'Swap')
    }
  }

  // Network warning component
  const NetworkWarning = () => {
    if (!isConnected) {
      return (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-2 text-amber-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">Please connect your wallet to use swap</span>
          </div>
        </div>
      )
    }

    if (!isSepoliaNetwork) {
      return (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Please switch to Sepolia Testnet</span>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-white-50 rounded-3xl border border-blue-200/50 p-6 shadow-lg shadow-blue-100/20">

        {/* Swap Header with Settings */}
        <div className="relative flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Swap</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Settings Panel */}
          <SwapSettings
            slippage={slippage}
            onSlippageChange={setSlippage}
            deadline={deadline}
            onDeadlineChange={setDeadline}
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>

        <NetworkWarning />

        {/* From Token */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">From Token</label>
            <div className="flex items-center gap-3">
              <SwapTokenSelect
                token={fromToken}
                onTokenSelect={setFromToken}
                disabled={!isConnected || !isSepoliaNetwork}
              />
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="Enter amount"
                  disabled={!isConnected || !isSepoliaNetwork}
                  className="w-full rounded-2xl border border-slate-300 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 px-4 py-3 text-base font-medium transition-all duration-300 bg-white/80 backdrop-blur-sm transform hover:scale-[1.01] focus:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                disabled={!isConnected || !isSepoliaNetwork}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                25%
              </button>
              <button
                disabled={!isConnected || !isSepoliaNetwork}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                50%
              </button>
              <button
                disabled={!isConnected || !isSepoliaNetwork}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                75%
              </button>
              <button
                disabled={!isConnected || !isSepoliaNetwork}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Max
              </button>
            </div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center">
            <button
              onClick={switchTokens}
              disabled={!isConnected || !isSepoliaNetwork}
              className="flex items-center justify-center w-12 h-12 rounded-2xl border-2 border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">To Token</label>
            <div className="flex items-center gap-3">
              <SwapTokenSelect
                token={toToken}
                onTokenSelect={setToToken}
                disabled={!isConnected || !isSepoliaNetwork}
              />
              <div className="relative flex-1">
                <input
                  readOnly
                  value={
                    isQuoteLoading
                      ? "Calculating..."
                      : isQuoteSuccess && quote
                        ? quote.outputAmountFormatted
                        : ""
                  }
                  placeholder="Estimated receive"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium bg-slate-50/80 backdrop-blur-sm text-slate-700"
                />
                {isQuoteLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trading Details Toggle */}
        <div className="pt-2">
          <button 
            onClick={() => setShowTradingDetails(!showTradingDetails)} 
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200"
          >
            <svg className={cx("w-4 h-4 transition-transform duration-200", showTradingDetails ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showTradingDetails ? "Hide Trading Details" : "Show Trading Details"}
          </button>
        </div>

        {/* Trading Info */}
        {showTradingDetails && quote && isQuoteSuccess && (
          <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl border border-slate-200/50 p-4 shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Exchange Rate</span>
                <span className="font-medium">
                  1 {formatTokenSymbol(fromToken)} ≈ {quote.rate ? quote.rate.toFixed(6) : "-"} {formatTokenSymbol(toToken)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Min. received (w/ slippage)</span>
                <span className="font-medium">
                  {quote.minimumReceivedFormatted || "-"} {formatTokenSymbol(toToken)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Protocol fee</span>
                <span className="font-medium">
                  {quote.feeAmountFormatted || "-"} {formatTokenSymbol(toToken)}
                  <span className="text-xs text-slate-500 ml-1">(0.30%)</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Price impact</span>
                <span className={cx("font-medium", quote.priceImpact > 0.01 ? "text-amber-700" : "text-slate-700")}>
                  {(quote.priceImpact * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Network</span>
                <span className="font-medium text-blue-600">Sepolia Testnet</span>
              </div>
            </div>
          </div>
        )}



        {/* Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
          {/* Swap Button */}
          <button
            disabled={
              !canSwap ||
              !isConnected ||
              !isSepoliaNetwork ||
              !isQuoteSuccess ||
              swapState !== SwapCallbackState.VALID ||
              approvalState === ApprovalState.PENDING ||
              (fromToken?.symbol !== 'ETH' && amt > 0 && approvalState !== ApprovalState.APPROVED)
            }
            className={cx(
              "w-full sm:flex-1 px-8 py-3 rounded-2xl text-base font-semibold transition-all duration-300 shadow-lg",
              (
                !canSwap ||
                !isConnected ||
                !isSepoliaNetwork ||
                !isQuoteSuccess ||
                swapState !== SwapCallbackState.VALID ||
                approvalState === ApprovalState.PENDING ||
                (fromToken?.symbol !== 'ETH' && amt > 0 && approvalState !== ApprovalState.APPROVED)
              )
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200 hover:shadow-emerald-300 transform hover:scale-105"
            )}
            onClick={
              fromToken?.symbol !== 'ETH' && amt > 0 && approvalState !== ApprovalState.APPROVED
                ? handleApproval
                : handleSwap
            }
          >
            <div className="flex items-center justify-center gap-2">
              {approvalState === ApprovalState.PENDING ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Approving...
                </>
              ) : swapState === SwapCallbackState.LOADING ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Swapping...
                </>
              ) : isQuoteLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {!isConnected
                    ? 'Connect Wallet'
                    : !isSepoliaNetwork
                    ? 'Switch to Sepolia'
                    : fromToken?.symbol !== 'ETH' && amt > 0 && approvalState !== ApprovalState.APPROVED
                    ? `Approve ${formatTokenSymbol(fromToken)}`
                    : amt > 0
                    ? 'Execute Swap'
                    : 'Enter Amount'
                  }
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Enhanced Right Side Info */}
      <div className="space-y-4">
        {/* Asset Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl border border-blue-200/50 p-6 shadow-lg shadow-blue-100/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Asset Summary</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
              <span className="text-slate-600 font-medium">NAV</span>
              <span className="font-bold text-slate-800">${asset.nav}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
              <span className="text-slate-600 font-medium">LCR</span>
              <span className="font-bold text-slate-800">{asset.lcr}×</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 font-medium">Maturity</span>
              <span className="font-bold text-slate-800">{asset.maturity}</span>
            </div>
          </div>
        </div>
        
        {/* Core Equation */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl border border-violet-200/50 p-6 shadow-lg shadow-violet-100/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Core Equation</h3>
          </div>
          <div className="bg-white rounded-2xl border border-violet-200 px-4 py-3 shadow-sm mb-4">
            <div className="text-lg font-bold text-slate-800 font-mono tracking-wide text-center">
              <span className="text-emerald-600">1P</span> + <span className="text-blue-600">1C</span> + <span className="text-amber-600">1S</span> = <span className="text-purple-600">1 RWA</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <div><span className="font-medium text-emerald-600">P</span>: Principal (Fixed return)</div>
            <div><span className="font-medium text-blue-600">C</span>: Coupon (Interest payments)</div>
            <div><span className="font-medium text-amber-600">S</span>: Shield (High risk/reward)</div>
          </div>
        </div>
      </div>

    </div>
  )
}