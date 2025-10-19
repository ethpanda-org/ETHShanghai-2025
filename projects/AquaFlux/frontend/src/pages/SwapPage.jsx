import { useState, useMemo } from 'react'
import { getAsset, ASSETS } from '../data/mockData'
import AssetMiniCard from '../components/AssetMiniCard'
import TokenSelect from '../components/TokenSelect'
import { buildTokenUniverse, quoteMock, displayToken } from '../utils/tokenHelpers'
import { cx } from '../utils/helpers'

const SLIPPAGE_DEFAULT = 0.005 // 0.5%
const FEE_BPS = 20 // 0.20%

function ReceiptModal({ receipt, onClose, onBackToAsset, onGoBuild }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200 p-6 shadow-2xl shadow-slate-300/20 transform scale-100 animate-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Transaction Complete
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/50 p-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Trade Details</span>
            </div>
            <div className="text-lg font-bold text-slate-800">
              {receipt.amountIn} {displayToken(receipt.from)} → {receipt.amountOut.toFixed(6)} {displayToken(receipt.to)}
            </div>
            <div className="text-sm text-slate-600">
              Execution Price: 1 {displayToken(receipt.from)} ≈ {receipt.price.toFixed(4)} {displayToken(receipt.to)}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-slate-300 hover:border-blue-400 text-sm font-medium hover:bg-blue-50 transition-all duration-300" 
            onClick={onBackToAsset}
          >
            Back to Markets
          </button>
          <button 
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-slate-300 hover:border-violet-400 text-sm font-medium hover:bg-violet-50 transition-all duration-300" 
            onClick={onGoBuild}
          >
            Structure
          </button>
          <button 
            className="w-full sm:flex-1 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all duration-300 transform hover:scale-105" 
            onClick={onClose}
          >
            Continue Trading
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SwapPage({ params, push }) {
  const asset = getAsset(params.assetId) || ASSETS[0]
  const universe = useMemo(() => buildTokenUniverse(asset), [asset])

  const [from, setFrom] = useState(params.from || "USDC")
  const [to, setTo] = useState(params.to || (params.leg ? `${asset.id}:${params.leg}` : `${asset.id}:P`))
  const [amountIn, setAmountIn] = useState("")
  const [slippage, setSlippage] = useState(SLIPPAGE_DEFAULT)
  const [showAdv, setShowAdv] = useState(false)
  const [showTradingDetails, setShowTradingDetails] = useState(false)
  const [approved, setApproved] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const amt = parseFloat(amountIn) || 0
  const q = quoteMock({ from, to, amountIn: amt })
  const minReceived = q.amountOut * (1 - slippage)
  const canSwap = amt > 0 && from !== to
  const switchFT = () => { const f = from; setFrom(to); setTo(f) }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8 border border-emerald-200/30">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 to-teal-100/20"></div>
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Swap
                </h1>
                <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                  Trade {asset?.name} P/C/S tokens with stablecoins
                  <span className="ml-1 text-[11px] text-slate-500">(Demo pricing)</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <AssetMiniCard a={asset} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-white-50 rounded-3xl border border-blue-200/50 p-6 shadow-lg shadow-blue-100/20">
          {/* From */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">From Token</label>
              <div className="flex items-center gap-3">
                <TokenSelect value={from} onChange={setFrom} universe={universe} />
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    min="0" 
                    value={amountIn} 
                    onChange={(e) => setAmountIn(e.target.value)} 
                                         placeholder="Enter amount" 
                    className="w-full rounded-2xl border border-slate-300 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 px-4 py-3 text-base font-medium transition-all duration-300 bg-white/80 backdrop-blur-sm transform hover:scale-[1.01] focus:scale-[1.01]" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium transition-all duration-200">25%</button>
                <button className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium transition-all duration-200">50%</button>
                <button className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium transition-all duration-200">75%</button>
                <button className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium transition-all duration-200">Max</button>
              </div>
            </div>

            {/* Switch Button */}
            <div className="flex justify-center">
              <button 
                onClick={switchFT} 
                className="flex items-center justify-center w-12 h-12 rounded-2xl border-2 border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-110"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">To Token</label>
              <div className="flex items-center gap-3">
                <TokenSelect value={to} onChange={setTo} universe={universe} />
                <div className="relative flex-1">
                  <input 
                    readOnly 
                    value={q.amountOut ? q.amountOut.toFixed(6) : ""} 
                                         placeholder="Estimated receive" 
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-medium bg-slate-50/80 backdrop-blur-sm text-slate-700" 
                  />
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
          {showTradingDetails && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl border border-slate-200/50 p-4 shadow-sm">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Price</span>
                  <span className="font-medium">1 {displayToken(from)} ≈ {q.price ? q.price.toFixed(4) : "-"} {displayToken(to)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Min. received (w/ slippage)</span>
                  <span className="font-medium">{minReceived > 0 ? minReceived.toFixed(6) : "-"} {displayToken(to)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Protocol fee</span>
                  <span className="font-medium">{q.feeOut ? q.feeOut.toFixed(6) : "-"} {displayToken(to)} <span className="text-xs text-slate-500">({(FEE_BPS / 100).toFixed(2)}bps)</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Price impact</span>
                  <span className={cx("font-medium", q.impact > 0.01 ? "text-amber-700" : "text-slate-700")}>{(q.impact * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="pt-2">
            <button 
              onClick={() => setShowAdv(!showAdv)} 
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors duration-200"
            >
              <svg className={cx("w-4 h-4 transition-transform duration-200", showAdv ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showAdv ? "Hide Advanced Settings" : "Show Advanced Settings"}
            </button>
          </div>
          {showAdv && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="text-sm font-medium text-slate-700 mb-2">Slippage Tolerance</div>
                <input 
                  type="number" 
                  step="0.001" 
                  value={slippage} 
                  onChange={(e) => setSlippage(Number(e.target.value))} 
                  className="w-full rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 px-3 py-2 text-sm transition-all duration-200" 
                />
                <div className="text-xs text-slate-500 mt-2">Default 0.5% (=0.005)</div>
              </div>
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="text-sm font-medium text-slate-700 mb-2">Router</div>
                <div className="text-xs text-slate-500 leading-relaxed">Demo: Pharos Router</div>
              </div>
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="text-sm font-medium text-slate-700 mb-2">TTL</div>
                <div className="text-xs text-slate-500 leading-relaxed">Demo: 5 minutes</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            {!approved && (
              <button 
                className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-300 hover:border-emerald-400 text-sm font-medium hover:bg-emerald-50 transition-all duration-300 transform hover:scale-105" 
                onClick={() => setApproved(true)}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve {displayToken(from)}
                </div>
              </button>
            )}
            <button 
              disabled={!canSwap || !approved} 
              className={cx(
                "w-full sm:flex-1 px-8 py-3 rounded-2xl text-base font-semibold transition-all duration-300 shadow-lg", 
                (!canSwap || !approved) 
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200 hover:shadow-emerald-300 transform hover:scale-105"
              )} 
              onClick={() => setReceipt({ from, to, amountIn: amt, amountOut: q.amountOut, price: q.price })}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Execute Swap
              </div>
            </button>
            <button 
              className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-300 hover:border-violet-400 text-sm font-medium hover:bg-violet-50 transition-all duration-300" 
              onClick={() => push("structure", { assetId: asset.id, tab: "split-merge" })}
            >
              Structure: Split/Merge
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

      {receipt && (
        <ReceiptModal 
          receipt={receipt} 
          onClose={() => setReceipt(null)} 
          onBackToAsset={() => push("markets", {})} 
                      onGoBuild={() => push("structure", { assetId: asset.id, tab: "split-merge" })} 
        />
      )}
    </div>
  )
}
