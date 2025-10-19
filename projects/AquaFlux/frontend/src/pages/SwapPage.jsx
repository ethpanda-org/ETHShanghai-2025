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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="text-lg font-semibold">Transaction Complete</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="mt-3 text-sm text-slate-700 space-y-1">
          <div>
            {receipt.amountIn} {displayToken(receipt.from)} → {receipt.amountOut.toFixed(6)} {displayToken(receipt.to)}
          </div>
          <div className="text-xs text-slate-500">
            Execution Price: 1 {displayToken(receipt.from)} ≈ {receipt.price.toFixed(4)} {displayToken(receipt.to)}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 rounded-xl border text-sm hover:bg-slate-50" onClick={onBackToAsset}>
            回到市场
          </button>
          <button className="px-3 py-1.5 rounded-xl border text-sm hover:bg-slate-50" onClick={onGoBuild}>
            去 结构
          </button>
          <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-sm hover:bg-slate-800" onClick={onClose}>
            继续交易
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
  const [approved, setApproved] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const amt = parseFloat(amountIn) || 0
  const q = quoteMock({ from, to, amountIn: amt })
  const minReceived = q.amountOut * (1 - slippage)
  const canSwap = amt > 0 && from !== to
  const switchFT = () => { const f = from; setFrom(to); setTo(f) }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Swap 兑换</h2>
          <p className="text-slate-600 mt-1 text-sm">
            快捷把 {asset?.name} 的 P/C/S 与稳定币互换。
            <span className="ml-1 text-[11px] text-slate-500">(报价为演示)</span>
          </p>
        </div>
        <AssetMiniCard a={asset} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* From */}
          <div className="text-xs text-slate-500 mb-1">From</div>
          <div className="flex items-center gap-2">
            <TokenSelect value={from} onChange={setFrom} universe={universe} />
            <input 
              type="number" 
              min="0" 
              value={amountIn} 
              onChange={(e) => setAmountIn(e.target.value)} 
              placeholder="输入数量" 
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none" 
            />
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <button className="px-2 py-1 rounded-lg border hover:bg-slate-50">25%</button>
              <button className="px-2 py-1 rounded-lg border hover:bg-slate-50">50%</button>
              <button className="px-2 py-1 rounded-lg border hover:bg-slate-50">75%</button>
              <button className="px-2 py-1 rounded-lg border hover:bg-slate-50">Max</button>
            </div>
          </div>

          {/* Switch */}
          <div className="my-2 flex justify-center">
            <button onClick={switchFT} className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50">
              ⇅ 
            </button>
          </div>

          {/* To */}
          <div className="text-xs text-slate-500 mb-1">To</div>
          <div className="flex items-center gap-2">
            <TokenSelect value={to} onChange={setTo} universe={universe} />
            <input 
              readOnly 
              value={q.amountOut ? q.amountOut.toFixed(6) : ""} 
              placeholder="预估到手" 
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50" 
            />
          </div>

          {/* Info */}
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm flex flex-col gap-1">
            <div>价格：1 {displayToken(from)} ≈ {q.price ? q.price.toFixed(4) : "-"} {displayToken(to)}</div>
            <div>最小到手（含滑点）：{minReceived > 0 ? minReceived.toFixed(6) : "-"} {displayToken(to)}</div>
            <div>费用(协议)：{q.feeOut ? q.feeOut.toFixed(6) : "-"} {displayToken(to)} <span className="text-xs text-slate-500">({(FEE_BPS / 100).toFixed(2)}bps)</span></div>
            <div className={cx("text-xs", q.impact > 0.01 ? "text-amber-700" : "text-slate-500")}>价格影响：{(q.impact * 100).toFixed(2)}%</div>
          </div>

          {/* Advanced */}
          <div className="mt-2 text-xs">
            <button onClick={() => setShowAdv(!showAdv)} className="text-slate-600 hover:text-slate-800">
              {showAdv ? "隐藏高级设置" : "显示高级设置"}
            </button>
          </div>
          {showAdv && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border p-3">
                <div className="text-xs text-slate-500">滑点</div>
                <input 
                  type="number" 
                  step="0.001" 
                  value={slippage} 
                  onChange={(e) => setSlippage(Number(e.target.value))} 
                  className="mt-1 w-full rounded-lg border px-2 py-1" 
                />
                <div className="text-[11px] text-slate-500 mt-1">默认 0.5% (=0.005)</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-slate-500">路由</div>
                <div className="text-[11px] text-slate-500">演示：Pharos Router</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-slate-500">TTL</div>
                <div className="text-[11px] text-slate-500">演示：5 分钟</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            {!approved && (
              <button 
                className="px-3 py-2 rounded-xl border text-sm hover:bg-slate-50" 
                onClick={() => setApproved(true)}
              >
                Approve {displayToken(from)}
              </button>
            )}
            <button 
              disabled={!canSwap || !approved} 
              className={cx(
                "px-4 py-2 rounded-xl text-sm text-white", 
                (!canSwap || !approved) ? "bg-slate-300" : "bg-slate-900 hover:bg-slate-800"
              )} 
              onClick={() => setReceipt({ from, to, amountIn: amt, amountOut: q.amountOut, price: q.price })}
            >
              Swap
            </button>
            <button 
              className="ml-auto px-3 py-2 rounded-xl border text-sm hover:bg-slate-50" 
              onClick={() => push("build", { assetId: asset.id, tab: "split-merge" })}
            >
              去 结构：拆/组
            </button>
          </div>
        </div>

        {/* Right side info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold">资产摘要</div>
          <div className="text-sm text-slate-600">NAV ${asset.nav} · LCR {asset.lcr}× · 到期 {asset.maturity}</div>
          <div className="text-xs text-slate-500">等式：<b>1P + 1C + 1S = 1 RWA</b></div>
          <div className="text-xs text-slate-500">P：固定到期收益 · C：票息收益 · S：护盾（高收益/高风险）</div>
        </div>
      </div>

      {receipt && (
        <ReceiptModal 
          receipt={receipt} 
          onClose={() => setReceipt(null)} 
          onBackToAsset={() => push("markets", {})} 
          onGoBuild={() => push("build", { assetId: asset.id, tab: "split-merge" })} 
        />
      )}
    </div>
  )
}
