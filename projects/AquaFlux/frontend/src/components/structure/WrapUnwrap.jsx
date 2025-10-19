import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import PreviewBox from './PreviewBox'
import { cx } from '../../utils/helpers'
import { useAquaFluxCore } from '../../hooks/useAquaFluxCore'
import { useTokenInfo, useTokenApproval } from '../../hooks/structure'
import { useChainId } from 'wagmi'
import { getNetworkName, getExplorerUrl } from '../../utils/networkHelpers'

function WrapUnwrap({ asset }) {
  const [mode, setMode] = useState("wrap")
  const [amount, setAmount] = useState("")
  const amt = parseFloat(amount) || 0

  // Get current chain ID
  const chainId = useChainId()

  // Use blockchain asset ID from asset object
  const blockchainAssetId = asset.assetId

  // Check if asset has matured
  const isMatured = () => {
    if (!asset.maturity) return false

    const now = new Date()
    const maturityDate = new Date(asset.maturity)

    // If maturity format includes time (YYYY-MM-DD HH:MM:SS), parse it
    // If it's just date (YYYY-MM-DD), it will default to 00:00:00
    return now > maturityDate
  }

  // Use AquaFluxCore hook
  const {
    executeWrap,
    executeUnwrap,
    isWrapping,
    isUnwrapping,
    isConfirming,
    isSuccess,
    error,
    isLoading,
    lastTxHash
  } = useAquaFluxCore()

  // Get rwaToken token info (name, symbol, decimals, balance) using mock data
  const { tokenInfo, isLoading: tokenInfoLoading, error: tokenInfoError, refetch: refetchTokenInfo } = useTokenInfo(asset.rwaToken)

  // Get aqToken token info for unwrap mode
  const { tokenInfo: aqTokenInfo, isLoading: aqTokenInfoLoading, error: aqTokenInfoError, refetch: refetchAqTokenInfo } = useTokenInfo(asset.aqToken)


  // Check token approval for rwaToken to AquaFluxCore contract
  const {
    needsApproval,
    executeApproveMax,
    isApproving,
    isConfirmingApprove,
    isApproveSuccess,
    approveError,
    refetchAllowance
  } = useTokenApproval({
    tokenAddress: asset.rwaToken,
    amount: amount
  })

  // Handle approve execution
  const handleExecuteApprove = async () => {
    if (!asset.rwaToken || !amount) return

    try {
      const result = await executeApproveMax()

      // Show transaction submitted notification after wallet confirmation
      if (result) {
        toast.success('Transaction submitted, please wait for confirmation...')
      }
    } catch (err) {
      if (err?.code === 4001 || err?.message?.includes('rejected')) {
        toast.error('Approval cancelled by user')
      } else {
        toast.error(`Approval failed: ${err?.message || 'Unknown error'}`)
      }
    }
  }

  // Handle unwrap execution (using unwrap method)
  const handleExecuteUnwrap = async () => {
    if (!amt || amt <= 0) return

    // Check if asset has matured
    if (isMatured()) {
      toast.error('Operation time has expired')
      return
    }

    try {
      // Convert RWA amount to wei (assuming 18 decimals)
      const amountInWei = BigInt(Math.floor(amt * 10**18))

      const result = await executeUnwrap({
        assetId: blockchainAssetId,
        amount: amountInWei
      })

      // Show transaction submitted notification after wallet confirmation
      if (result) {
        toast.success('Transaction submitted, please wait for confirmation...')
      }
    } catch (err) {
      if (err?.code === 4001 || err?.message?.includes('rejected')) {
        toast.error('Transaction cancelled by user')
      } else {
        toast.error(`Unwrap transaction failed: ${err?.message || 'Unknown error'}`)
      }
    }
  }

  // Handle wrap execution
  const handleExecuteWrap = async () => {
    if (!amt || amt <= 0) return

    // Check if asset has matured
    if (isMatured()) {
      toast.error('Operation time has expired')
      return
    }

    try {
      // Convert USD amount to wei (assuming 18 decimals)
      const amountInWei = BigInt(Math.floor(amt * 10**18))

      const result = await executeWrap({
        assetId: blockchainAssetId,
        amount: amountInWei
      })

      // Show transaction submitted notification after wallet confirmation
      if (result) {
        toast.success('Transaction submitted, please wait for confirmation...')
      }
    } catch (err) {
      if (err?.code === 4001 || err?.message?.includes('rejected')) {
        toast.error('Transaction cancelled by user')
      } else {
        toast.error(`Wrap transaction failed: ${err?.message || 'Unknown error'}`)
      }
    }
  }

  // Handle approve status changes with toast notifications
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success('Token approved successfully! You can now execute wrap.')
      setTimeout(async () => {
        try {
          if (refetchAllowance) {
            await refetchAllowance()
          }
          // Also refresh token info to show updated balance
          if (refetchTokenInfo) {
            await refetchTokenInfo()
          }
        } catch (error) {
          // Silently handle refresh errors
        }
      }, 2000)
    }
  }, [isApproveSuccess])

  useEffect(() => {
    if (approveError) {
      toast.error(`Approval failed: ${approveError?.message || 'Unknown error'}`)
    }
  }, [approveError])

  // Handle wrap/unwrap status changes with toast notifications
  useEffect(() => {
    if (isSuccess && lastTxHash) {
      toast.success(
        <div>
          <div>Transaction successful!</div>
          <a
            href={`${getExplorerUrl(chainId)}${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline text-blue-600"
          >
            View on {getNetworkName(chainId)}
          </a>
        </div>,
        {
          autoClose: 10000
        }
      )

      // Refresh token balances after successful transaction
      setTimeout(async () => {
        try {
          if (refetchTokenInfo) {
            await refetchTokenInfo()
          }
          if (refetchAqTokenInfo) {
            await refetchAqTokenInfo()
          }
          // Also refetch allowance if needed
          if (refetchAllowance) {
            await refetchAllowance()
          }
        } catch (error) {
          // Silently handle refresh errors
        }
      }, 2000)
    }
  }, [isSuccess, lastTxHash, chainId])

  useEffect(() => {
    if (error && !error?.message?.includes('rejected') && error?.code !== 4001) {
      toast.error(`Transaction failed: ${error?.message || 'Unknown error'}`)
    }
  }, [error])

  return (
    <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-white-50 rounded-3xl border border-purple-200/50 p-6 shadow-lg shadow-purple-100/20">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Operation & Amount
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                    {mode === "wrap" ? (
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    )}
                  </div>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="appearance-none bg-white hover:bg-slate-50 rounded-2xl border border-slate-300 hover:border-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 pl-10 pr-10 py-3 text-base font-medium transition-all duration-300 cursor-pointer min-w-[200px] sm:min-w-[180px] w-full sm:w-auto transform hover:scale-[1.02]"
                  >
                    <option value="wrap">Wrap (Mint RWA)</option>
                    <option value="unwrap">Unwrap (Redeem RWA)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full rounded-2xl border border-slate-300 hover:border-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 px-4 py-3 text-base font-medium transition-all duration-300 bg-white/80 backdrop-blur-sm transform hover:scale-[1.01] focus:scale-[1.01]"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <span className="text-sm font-medium text-slate-500 transition-all duration-300">
                      {mode === "wrap"
                        ? tokenInfoLoading
                          ? "Loading..."
                          : tokenInfo?.symbol
                            ? `${tokenInfo.symbol} (${tokenInfo.balance || "0.00"})`
                            : "USD (0.00)"
                        : aqTokenInfoLoading
                          ? "Loading..."
                          : aqTokenInfo?.symbol
                            ? `${aqTokenInfo.symbol} (${aqTokenInfo.balance || "0.00"})`
                            : "RWA (0.00)"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="wait">
                {mode === "wrap" ? (
                  <motion.div
                    key="wrap-preview"
                    className="contents"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <PreviewBox title={`Will mint RWA (using ${tokenInfo?.name || "USD"})`} value={`${amt} RWA`} />
                    <PreviewBox title="Network" value={`Testnet simulation · Est. gas`} subtle />
                  </motion.div>
                ) : (
                  <motion.div
                    key="unwrap-preview"
                    className="contents"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <PreviewBox title={`Will redeem ${aqTokenInfo?.name || "underlying token"}`} value={`${amt} ${aqTokenInfo?.symbol || "tokens"}`} />
                    <PreviewBox title="Network" value={`Testnet simulation · Est. gas`} subtle />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-2">
              {/* Conditional button based on wrap mode and approval status */}
              {mode === "wrap" && needsApproval && amt > 0 ? (
                // Show approve button when approval is needed
                <motion.button
                  className={cx(
                    "w-full px-8 py-3 rounded-2xl text-base font-semibold transition-all duration-300 shadow-lg",
                    "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 hover:shadow-blue-300"
                  )}
                  disabled={isApproving || isConfirmingApprove}
                  onClick={handleExecuteApprove}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <motion.div
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isApproving || isConfirmingApprove ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isApproving ? "Approving..." : "Confirming Approval..."}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Approve Token
                      </>
                    )}
                  </motion.div>
                </motion.button>
              ) : (
                // Show wrap/unwrap button
                <motion.button
                  className={cx(
                    "w-full px-8 py-3 rounded-2xl text-base font-semibold transition-all duration-300 shadow-lg",
                    amt > 0
                      ? mode === "wrap"
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-purple-200 hover:shadow-purple-300"
                        : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-orange-200 hover:shadow-orange-300"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  )}
                  disabled={amt <= 0 || (mode === "wrap" && (isWrapping || isConfirming)) || (mode === "unwrap" && (isUnwrapping || isConfirming))}
                  onClick={mode === "wrap" ? handleExecuteWrap : handleExecuteUnwrap}
                  whileHover={amt > 0 ? { scale: 1.05 } : {}}
                  whileTap={amt > 0 ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <motion.div
                    className="flex items-center justify-center gap-2"
                    key={mode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {mode === "wrap" ? (
                      isWrapping || isConfirming ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {isWrapping ? "Wrapping..." : "Confirming..."}
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Execute Wrap
                        </>
                      )
                    ) : (
                      (isUnwrapping || isConfirming) ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {isUnwrapping ? "Unwrapping..." : "Confirming..."}
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                          Execute Unwrap
                        </>
                      )
                    )}
                  </motion.div>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-3xl border border-amber-200/50 p-6 shadow-lg shadow-amber-100/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Important Notice</h3>
          </div>
          <div className="text-sm text-slate-700 space-y-2">
            <p className="font-medium">Current MVP Demo Status</p>
            <p className="text-sm leading-relaxed">
              Before mainnet launch, real custody and compliance processes for Wrap/Unwrap operations
              will be fully documented and implemented according to regulatory requirements.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-3xl border border-slate-200/50 p-6 shadow-lg shadow-slate-100/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-gray-700 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Asset Info</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
              <span className="text-slate-600 font-medium">Asset</span>
              <span className="font-bold text-slate-800">{asset.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
              <span className="text-slate-600 font-medium">Type</span>
              <span className="font-bold text-slate-800">{asset.type}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 font-medium">Rating</span>
              <span className="font-bold text-slate-800">{asset.rating}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WrapUnwrap