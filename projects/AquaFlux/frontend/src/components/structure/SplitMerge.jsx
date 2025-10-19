import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import PreviewBox from './PreviewBox'
import { cx } from '../../utils/helpers'
import { useAquaFluxCore } from '../../hooks/useAquaFluxCore'
import { useTokenBalances } from '../../hooks/useTokenBalances'
import { useTokenInfo } from '../../hooks/structure'
import { useChainId } from 'wagmi'
import { getNetworkName, getExplorerUrl } from '../../utils/networkHelpers'

function SplitMerge({ asset, push }) {
  const [mode, setMode] = useState("split") // split | merge
  const [amount, setAmount] = useState("") // RWA or sets
  const amt = parseFloat(amount) || 0

  // Get current chain ID
  const chainId = useChainId()

  // Get token balances for P, C, S tokens
  const { balances, isLoading: balancesLoading, error: balancesError, refetch: refetchBalances } = useTokenBalances(asset)

  // Get rwaToken token info (name, symbol, decimals, balance)
  const { tokenInfo, isLoading: tokenInfoLoading, error: tokenInfoError, refetch: refetchTokenInfo } = useTokenInfo(asset.aqToken)

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

  const {
    executeSplit,
    executeMerge,
    isSplitting,
    isMerging,
    isConfirming,
    isSuccess,
    error,
    isLoading,
    lastTxHash
  } = useAquaFluxCore()

  // Handle transaction success with explorer link for SplitMerge
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
          if (refetchBalances) {
            await refetchBalances()
          }
          if (refetchTokenInfo) {
            await refetchTokenInfo()
          }
        } catch (error) {
          // Silently handle refresh errors
        }
      }, 2000)
    }
  }, [isSuccess, lastTxHash, chainId])

  // Handle split execution
  const handleExecuteSplit = async () => {
    if (!amt || amt <= 0) return

    // Check if asset has matured
    if (isMatured()) {
      toast.error('Operation time has expired')
      return
    }

    try {
      // Convert USD amount to wei (assuming 18 decimals)
      const amountInWei = BigInt(Math.floor(amt * 10**18))

      const result = await executeSplit({
        assetId: blockchainAssetId,
        amount: amountInWei
      })

      // Show transaction submitted notification after wallet confirmation
      if (result) {
        toast.info('Transaction submitted, please wait for confirmation...')
      }
    } catch (err) {
      if (err?.code === 4001 || err?.message?.includes('rejected')) {
        toast.error('Transaction cancelled by user')
      } else {
        toast.error(`Split transaction failed: ${err?.message || 'Unknown error'}`)
      }
    }
  }

  // Handle merge execution
  const handleExecuteMerge = async () => {
    if (!amt || amt <= 0) return

    // Check if asset has matured
    if (isMatured()) {
      toast.error('Operation time has expired')
      return
    }

    try {
      // Convert set amount to wei (assuming 18 decimals)
      const amountInWei = BigInt(Math.floor(amt * 10**18))

      const result = await executeMerge({
        assetId: blockchainAssetId,
        amount: amountInWei
      })

      // Show transaction submitted notification after wallet confirmation
      if (result) {
        toast.info('Transaction submitted, please wait for confirmation...')
      }
    } catch (err) {
      if (err?.code === 4001 || err?.message?.includes('rejected')) {
        toast.error('Transaction cancelled by user')
      } else {
        toast.error(`Merge transaction failed: ${err?.message || 'Unknown error'}`)
      }
    }
  }

  // Split result: 1 RWA → 1 P + 1 C + 1 S
  const outPCS = { P: amt, C: amt, S: amt }

  // Merge needs equal legs; compute deficits based on actual token balances
  const need = {
    P: Math.max(0, amt - (balances?.P || 0)),
    C: Math.max(0, amt - (balances?.C || 0)),
    S: Math.max(0, amt - (balances?.S || 0))
  }
  const canMerge = need.P === 0 && need.C === 0 && need.S === 0 && amt > 0

  // Check if user has enough AQ tokens for Split operation
  const canSplit = amt <= (balances?.AQ || 0)

  return (
    <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-white-50 rounded-3xl border border-cyan-200/50 p-6 shadow-lg shadow-cyan-100/20">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Operation & Amount
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                    {mode === "split" ? (
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )}
                  </div>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="appearance-none bg-white hover:bg-slate-50 rounded-2xl border border-slate-300 hover:border-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 pl-10 pr-10 py-3 text-base font-medium transition-all duration-300 cursor-pointer min-w-[200px] sm:min-w-[180px] w-full sm:w-auto transform hover:scale-[1.02]"
                  >
                    <option value="split">Split (RWA → P+C+S)</option>
                    <option value="merge">Merge (P+C+S → RWA)</option>
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
                    className="w-full rounded-2xl border border-slate-300 hover:border-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 px-4 py-3 text-base font-medium transition-all duration-300 bg-white/80 backdrop-blur-sm transform hover:scale-[1.01] focus:scale-[1.01]"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <span className="text-sm font-medium text-slate-500 transition-all duration-300">
                      {mode === "split"
                        ? tokenInfoLoading
                          ? "Loading..."
                          : tokenInfo?.symbol
                            ? `${tokenInfo.symbol} (${tokenInfo.balance || "0.00"})`
                            : "RWA (0.00)"
                        : "Sets"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

          <AnimatePresence mode="wait">
            {mode === "split" ? (
              <motion.div
                key="split-mode"
                className="mt-3 grid grid-cols-3 gap-3 text-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <PreviewBox title="Will get P" value={`${amt} P`} tokenType="P" />
                <PreviewBox title="Will get C" value={`${amt} C`} tokenType="C" />
                <PreviewBox title="Will get S" value={`${amt} S`} tokenType="S" />

                <motion.div
                  className="col-span-3 text-[11px] text-slate-500 text-center mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Protocol Fees 0%, gas subject to actual network.
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="merge-mode"
                className="mt-3 grid grid-cols-3 gap-3 text-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <PreviewBox title="Need P" value={`${need.P.toFixed(2)} P`} warn={need.P > 0} tokenType="P" />
                <PreviewBox title="Need C" value={`${need.C.toFixed(2)} C`} warn={need.C > 0} tokenType="C" />
                <PreviewBox title="Need S" value={`${need.S.toFixed(2)} S`} warn={need.S > 0} tokenType="S" />

                {/* Current Token Balances */}
                <motion.div
                  className="col-span-3 grid grid-cols-3 gap-2 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-center p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-xs text-emerald-600 font-medium">Your P Balance</div>
                    <div className="text-sm font-bold text-emerald-800">
                      {balancesLoading ? '...' : `${(balances?.P || 0).toFixed(2)} P`}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium">Your C Balance</div>
                    <div className="text-sm font-bold text-blue-800">
                      {balancesLoading ? '...' : `${(balances?.C || 0).toFixed(2)} C`}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-xs text-amber-600 font-medium">Your S Balance</div>
                    <div className="text-sm font-bold text-amber-800">
                      {balancesLoading ? '...' : `${(balances?.S || 0).toFixed(2)} S`}
                    </div>
                  </div>
                </motion.div>
                {(need.P > 0 || need.C > 0 || need.S > 0) && (
                  <motion.div
                    className="col-span-3 text-[11px] text-amber-700"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Three legs must be equal. Shortage can be
                    <button
                      className="underline"
                      onClick={() => push("swap", {
                        assetId: asset.id,
                        from: "USDC",
                        to: `${asset.id}:${need.P > 0 ? "P" : need.C > 0 ? "C" : "S"}`,
                        action: "buy"
                      })}
                    >
                      filled via Swap
                    </button>.
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              <motion.button
                className={cx(
                  "px-8 py-3 rounded-2xl text-base font-semibold transition-all duration-300 shadow-lg",
                  amt > 0 && ((mode === "split" && canSplit) || (mode === "merge" && canMerge))
                    ? mode === "split"
                      ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-emerald-200 hover:shadow-emerald-300"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 hover:shadow-blue-300"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                )}
                disabled={
                  amt <= 0 ||
                  (mode === "split" && (isSplitting || isConfirming || !canSplit)) ||
                  (mode === "merge" && (isMerging || isConfirming || !canMerge))
                }
                onClick={mode === "split" ? handleExecuteSplit : handleExecuteMerge}
                whileHover={amt > 0 && ((mode === "split" && canSplit) || (mode === "merge" && canMerge)) ? { scale: 1.05 } : {}}
                whileTap={amt > 0 && ((mode === "split" && canSplit) || (mode === "merge" && canMerge)) ? { scale: 0.95 } : {}}
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
                  {mode === "split" ? (
                    (isSplitting || isConfirming) ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isSplitting ? "Splitting..." : "Confirming..."}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Execute Split
                      </>
                    )
                  ) : (
                    (isMerging || isConfirming) ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isMerging ? "Merging..." : "Confirming..."}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        Execute Merge
                      </>
                    )
                  )}
                </motion.div>
              </motion.button>
              <AnimatePresence>
                {mode === "merge" && (
                  <motion.div
                    className={cx(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
                      canMerge
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    )}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className={cx("w-2 h-2 rounded-full", canMerge ? "bg-emerald-500" : "bg-amber-500")}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                    />
                    {canMerge ? "Equal amounts satisfied" : "Need to fill P/C/S to equal amounts"}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-3xl border border-blue-200/50 p-6 shadow-lg shadow-blue-100/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Instructions</h3>
          </div>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
              <span><strong>Split:</strong> 1 RWA → 1 P + 1 C + 1 S</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <span><strong>Merge:</strong> Three legs must be equal; fill shortage via Swap first</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
              <span><strong>Shield (S):</strong> High and uncertain returns; may decrease due to claims</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-3xl border border-slate-200/50 p-6 shadow-lg shadow-slate-100/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-gray-700 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Asset Details</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
              <span className="text-slate-600 font-medium">NAV</span>
              <span className="font-bold text-slate-800">${asset.nav}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
              <span className="text-slate-600 font-medium">LCR</span>
              <span className="font-bold text-slate-800">{asset.lcr}×</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 font-medium">Maturity</span>
              <span className="font-bold text-slate-800">{asset.maturity}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SplitMerge