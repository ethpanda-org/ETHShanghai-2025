import { useState } from 'react'
import { ASSETS, getAsset } from '../data/mockData'
import AssetMiniCard from '../components/AssetMiniCard'
import { cx } from '../utils/helpers'

function PreviewBox({ title, value, warn = false, subtle = false, tokenType = null }) {
  // Extract token type from title if not provided
  const extractedTokenType = tokenType || (title.includes(' P') ? 'P' : title.includes(' C') ? 'C' : title.includes(' S') ? 'S' : null)
  
  const getTokenStyles = (type) => {
    switch (type) {
      case 'P':
        return {
          bg: "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50",
          border: "border-emerald-200",
          shadow: "hover:shadow-emerald-100",
          textColor: "text-emerald-800",
          titleColor: "text-emerald-600",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          ),
          accent: "bg-emerald-500"
        }
      case 'C':
        return {
          bg: "bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50",
          border: "border-blue-200",
          shadow: "hover:shadow-blue-100",
          textColor: "text-blue-800",
          titleColor: "text-blue-600",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          accent: "bg-blue-500"
        }
      case 'S':
        return {
          bg: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50",
          border: "border-amber-200",
          shadow: "hover:shadow-amber-100",
          textColor: "text-amber-800",
          titleColor: "text-amber-600",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          accent: "bg-amber-500"
        }
      default:
        return null
    }
  }

  const tokenStyles = getTokenStyles(extractedTokenType)
  
  if (warn && tokenStyles) {
    return (
      <div className="rounded-2xl border border-red-300 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 hover:shadow-red-100 p-4 transition-all duration-300 hover:shadow-md transform hover:scale-[1.02]"> 
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wide">
            {title}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cx("p-1 rounded-lg bg-red-100 text-red-600")}>
            {tokenStyles.icon}
          </div>
          <div className="text-sm font-semibold text-red-800">{value}</div>
        </div>
      </div>
    )
  }

  if (warn) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-amber-100 p-4 transition-all duration-300 hover:shadow-md transform hover:scale-[1.02]"> 
        <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">{title}</div>
        <div className="mt-2 text-sm font-semibold text-amber-800">{value}</div>
      </div>
    )
  }

  if (subtle) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 hover:shadow-slate-100 p-4 transition-all duration-300 hover:shadow-md"> 
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</div>
        <div className="mt-2 text-sm font-semibold text-slate-800">{value}</div>
      </div>
    )
  }

  if (tokenStyles) {
    return (
      <div className={cx(
        "rounded-2xl border p-4 transition-all duration-300 hover:shadow-md transform hover:scale-[1.02]",
        tokenStyles.bg,
        tokenStyles.border,
        tokenStyles.shadow
      )}> 
        <div className="flex items-center justify-between mb-2">
          <div className={cx("text-xs font-medium uppercase tracking-wide", tokenStyles.titleColor)}>
            {title}
          </div>
          <div className={cx("w-2 h-2 rounded-full", tokenStyles.accent)}></div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cx("p-1 rounded-lg", tokenStyles.bg, tokenStyles.titleColor)}>
            {tokenStyles.icon}
          </div>
          <div className={cx("text-sm font-semibold", tokenStyles.textColor)}>{value}</div>
        </div>
      </div>
    )
  }

  // Default styling
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:shadow-slate-100 p-4 transition-all duration-300 hover:shadow-md"> 
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</div>
      <div className="mt-2 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function SplitMerge({ asset, push }) {
  const [mode, setMode] = useState("split") // split | merge
  const [amount, setAmount] = useState("") // RWA or sets
  const amt = parseFloat(amount) || 0

  // Split result: 1 RWA → 1 P + 1 C + 1 S
  const outPCS = { P: amt, C: amt, S: amt }

  // Merge needs equal legs; compute deficits from a mock balance
  const mockBalance = { P: 0.6 * amt, C: 1.2 * amt, S: 0.7 * amt } // just to show deficit UI
  const need = { 
    P: Math.max(0, amt - mockBalance.P), 
    C: Math.max(0, amt - mockBalance.C), 
    S: Math.max(0, amt - mockBalance.S) 
  }
  const canMerge = need.P === 0 && need.C === 0 && need.S === 0 && amt > 0

  return (
    <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/20">
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
                      {mode === "split" ? "RWA" : "Sets"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          {mode === "split" ? (
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <PreviewBox title="Will get P" value={`${outPCS.P} P`} tokenType="P" />
              <PreviewBox title="Will get C" value={`${outPCS.C} C`} tokenType="C" />
              <PreviewBox title="Will get S" value={`${outPCS.S} S`} tokenType="S" />
              <div className="col-span-3 text-[11px] text-slate-500 text-center mt-2">Fees and gas subject to actual network (demo).</div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <PreviewBox title="Need P" value={`${need.P.toFixed(2)} P`} warn={need.P > 0} tokenType="P" />
              <PreviewBox title="Need C" value={`${need.C.toFixed(2)} C`} warn={need.C > 0} tokenType="C" />
              <PreviewBox title="Need S" value={`${need.S.toFixed(2)} S`} warn={need.S > 0} tokenType="S" />
              {(need.P > 0 || need.C > 0 || need.S > 0) && (
                <div className="col-span-3 text-[11px] text-amber-700">
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
                </div>
              )}
            </div>
          )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              <button 
                className={cx(
                  "px-8 py-3 rounded-2xl text-base font-semibold transition-all duration-300 shadow-lg", 
                  amt > 0 
                    ? mode === "split" 
                      ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-emerald-200 hover:shadow-emerald-300 transform hover:scale-105" 
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 hover:shadow-blue-300 transform hover:scale-105"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                )} 
                disabled={amt <= 0}
              >
                <div className="flex items-center gap-2">
                  {mode === "split" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  )}
                  {mode === "split" ? "Execute Split" : "Execute Merge"}
                </div>
              </button>
              {mode === "merge" && (
                <div className={cx(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
                  canMerge 
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-amber-100 text-amber-700 border border-amber-200"
                )}>
                  <div className={cx("w-2 h-2 rounded-full", canMerge ? "bg-emerald-500" : "bg-amber-500")}></div>
                  {canMerge ? "Equal amounts satisfied" : "Need to fill P/C/S to equal amounts"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl border border-blue-200/50 p-6 shadow-lg shadow-blue-100/20">
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

function WrapUnwrap({ asset }) {
  const [mode, setMode] = useState("wrap")
  const [amount, setAmount] = useState("")
  const amt = parseFloat(amount) || 0
  
  return (
    <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/20">
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
                      {mode === "wrap" ? "USD" : "RWA"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mode === "wrap" ? (
                <>
                  <PreviewBox title="Will mint RWA" value={`${amt} RWA`} />
                  <PreviewBox title="Network" value={`Testnet simulation · Est. gas`} subtle />
                </>
              ) : (
                <>
                  <PreviewBox title="Will redeem" value={`${amt} USD`} />
                  <PreviewBox title="Network" value={`Testnet simulation · Est. gas`} subtle />
                </>
              )}
            </div>
            
            <div className="pt-2">
              <button 
                className={cx(
                  "w-full px-8 py-3 rounded-2xl text-base font-semibold transition-all duration-300 shadow-lg", 
                  amt > 0 
                    ? mode === "wrap" 
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-purple-200 hover:shadow-purple-300 transform hover:scale-105" 
                      : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-orange-200 hover:shadow-orange-300 transform hover:scale-105"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                )} 
                disabled={amt <= 0}
              >
                <div className="flex items-center justify-center gap-2">
                  {mode === "wrap" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  )}
                  {mode === "wrap" ? "Execute Wrap" : "Execute Unwrap"}
                </div>
              </button>
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

export default function StructurePage({ params, push }) {
  const [tab, setTab] = useState(params.tab || "split-merge")
  const [assetId, setAssetId] = useState(params.assetId || ASSETS[0].id)
  const asset = getAsset(assetId)

  return (
    <div className="space-y-6">
      {/* Simplified Header with Core Equation */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-8 border border-violet-200/30">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100/20 to-purple-100/20"></div>
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Structure (P·C·S)
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-gray-800 text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Core Equation</h3>
                  <div className="bg-white rounded-2xl border border-slate-200 px-6 py-3 shadow-lg">
                    <div className="text-xl font-bold text-slate-800 font-mono tracking-wide">
                      <span className="text-emerald-600">1P</span> + <span className="text-blue-600">1C</span> + <span className="text-amber-600">1S</span> = <span className="text-purple-600">1 RWA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tab Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex gap-3">
            <button 
              className={cx(
                "px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 shadow-sm", 
                tab === "split-merge" 
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-violet-200 shadow-lg transform scale-105" 
                  : "bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:shadow-md"
              )} 
              onClick={() => setTab("split-merge")}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Split/Merge
              </div>
            </button>
            <button 
              className={cx(
                "px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 shadow-sm", 
                tab === "wrap-unwrap" 
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-violet-200 shadow-lg transform scale-105" 
                  : "bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:shadow-md"
              )} 
              onClick={() => setTab("wrap-unwrap")}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Wrap/Unwrap
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Select Asset</span>
            <div className="relative">
              <select 
                value={assetId} 
                onChange={(e) => setAssetId(e.target.value)} 
                className="appearance-none bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {ASSETS.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {tab === "split-merge" ? (
          <SplitMerge asset={asset} push={push} />
        ) : (
          <WrapUnwrap asset={asset} />
        )}
      </div>


    </div>
  )
}
