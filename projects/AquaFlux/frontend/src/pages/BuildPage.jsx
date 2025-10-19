import { useState } from 'react'
import { ASSETS, getAsset } from '../data/mockData'
import AssetMiniCard from '../components/AssetMiniCard'
import { cx } from '../utils/helpers'

function PreviewBox({ title, value, warn = false, subtle = false }) {
  return (
    <div className={cx(
      "rounded-xl border p-3", 
      warn ? "border-amber-300 bg-amber-50" : 
      subtle ? "border-slate-200 bg-slate-50" : "bg-white border-slate-200"
    )}> 
      <div className="text-xs text-slate-500">{title}</div>
      <div className={cx("mt-1 text-sm", warn ? "text-amber-800" : "text-slate-800")}>{value}</div>
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <div className="md:col-span-2 space-y-3">
        <div className="flex items-center gap-2">
          <button 
            className={cx(
              "px-3 py-1.5 rounded-xl text-sm", 
              mode === "split" ? "bg-slate-900 text-white" : "border hover:bg-slate-50"
            )} 
            onClick={() => setMode("split")}
          >
            Split (RWA → P+C+S)
          </button>
          <button 
            className={cx(
              "px-3 py-1.5 rounded-xl text-sm", 
              mode === "merge" ? "bg-slate-900 text-white" : "border hover:bg-slate-50"
            )} 
            onClick={() => setMode("merge")}
          >
            Merge (P+C+S → RWA)
          </button>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-slate-500">Amount</div>
          <input 
            type="number" 
            min="0" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder={mode === "split" ? "Enter RWA amount" : "Enter sets to merge"} 
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" 
          />

          {mode === "split" ? (
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <PreviewBox title="Will get P" value={`${outPCS.P} P`} />
              <PreviewBox title="Will get C" value={`${outPCS.C} C`} />
              <PreviewBox title="Will get S" value={`${outPCS.S} S`} />
              <div className="col-span-3 text-[11px] text-slate-500">Fees and gas subject to actual network (demo).</div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <PreviewBox title="Need P" value={`${need.P.toFixed(2)} P`} warn={need.P > 0} />
              <PreviewBox title="Need C" value={`${need.C.toFixed(2)} C`} warn={need.C > 0} />
              <PreviewBox title="Need S" value={`${need.S.toFixed(2)} S`} warn={need.S > 0} />
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

          <div className="mt-3 flex items-center gap-2">
            <button 
              className={cx(
                "px-4 py-2 rounded-xl text-sm text-white", 
                amt > 0 ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-300"
              )} 
              disabled={amt <= 0}
            >
              {mode === "split" ? "Split" : "Merge"}
            </button>
            {mode === "merge" && (
              <span className={cx("text-xs", canMerge ? "text-emerald-700" : "text-slate-500")}>
                {canMerge ? "Equal amounts satisfied" : "Need to fill P/C/S to equal amounts"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border p-4 bg-white">
          <div className="text-sm font-semibold">Instructions</div>
          <ul className="mt-2 text-xs text-slate-600 list-disc pl-5 space-y-1">
            <li>Split：1 RWA → 1 P + 1 C + 1 S.</li>
            <li>Merge：Three legs must be equal; please fill shortage via Swap first.</li>
            <li>S has high and uncertain returns; may decrease due to claims.</li>
          </ul>
        </div>
        <div className="rounded-2xl border p-4 bg-white text-xs text-slate-500">
          NAV ${asset.nav} · LCR {asset.lcr}× · Maturity {asset.maturity}
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <div className="md:col-span-2 space-y-3">
        <div className="flex items-center gap-2">
          <button 
            className={cx(
              "px-3 py-1.5 rounded-xl text-sm", 
              mode === "wrap" ? "bg-slate-900 text-white" : "border hover:bg-slate-50"
            )} 
            onClick={() => setMode("wrap")}
          >
            Wrap (Mint RWA)
          </button>
          <button 
            className={cx(
              "px-3 py-1.5 rounded-xl text-sm", 
              mode === "unwrap" ? "bg-slate-900 text-white" : "border hover:bg-slate-50"
            )} 
            onClick={() => setMode("unwrap")}
          >
            Unwrap (Redeem RWA)
          </button>
        </div>
        
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-slate-500">Amount</div>
          <input 
            type="number" 
            min="0" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder="Enter amount" 
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" 
          />
          
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {mode === "wrap" ? (
              <>
                <PreviewBox title="Will mint RWA" value={`${amt} RWA`} />
                <PreviewBox title="Note" value={`Testnet custody simulation · Estimated gas`} subtle />
              </>
            ) : (
              <>
                <PreviewBox title="Will redeem RWA" value={`${amt} RWA`} />
                <PreviewBox title="Note" value={`Testnet redemption simulation · Estimated gas`} subtle />
              </>
            )}
          </div>
          
          <div className="mt-3">
            <button 
              className={cx(
                "px-4 py-2 rounded-xl text-sm text-white", 
                amt > 0 ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-300"
              )} 
              disabled={amt <= 0}
            >
              {mode === "wrap" ? "Wrap" : "Unwrap"}
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="rounded-2xl border p-4 bg-white text-sm">
          <div className="font-semibold">Note</div>
          <div className="text-xs text-slate-600 mt-1">
            Current MVP demo: Before mainnet launch, real custody and compliance processes for Wrap/Unwrap will be documented.
          </div>
        </div>
        <div className="rounded-2xl border p-4 bg-white text-xs text-slate-500">
          Asset: {asset.name} · {asset.type} · Rating {asset.rating}
        </div>
      </div>
    </div>
  )
}

export default function BuildPage({ params, push }) {
  const [tab, setTab] = useState(params.tab || "split-merge")
  const [assetId, setAssetId] = useState(params.assetId || ASSETS[0].id)
  const asset = getAsset(assetId)

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Structure (P·C·S)</h2>
          <p className="text-slate-600 mt-1 text-sm">
            Split RWA into three parts, or merge them back; also perform Wrap/Unwrap.
            <span className="ml-1 text-[11px] text-slate-500">(MVP)</span>
          </p>
        </div>
        <AssetMiniCard a={asset} />
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex gap-2">
          <button 
            className={cx(
              "px-3 py-2 rounded-xl text-sm", 
              tab === "split-merge" ? "bg-slate-900 text-white" : "hover:bg-slate-50 border"
            )} 
            onClick={() => setTab("split-merge")}
          >
            Split/Merge
          </button>
          <button 
            className={cx(
              "px-3 py-2 rounded-xl text-sm", 
              tab === "wrap-unwrap" ? "bg-slate-900 text-white" : "hover:bg-slate-50 border"
            )} 
            onClick={() => setTab("wrap-unwrap")}
          >
            Wrap/Unwrap
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">Select Asset</span>
            <select 
              value={assetId} 
              onChange={(e) => setAssetId(e.target.value)} 
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
            >
              {ASSETS.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        {tab === "split-merge" ? (
          <SplitMerge asset={asset} push={push} />
        ) : (
          <WrapUnwrap asset={asset} />
        )}
      </div>

      <div className="text-xs text-slate-500">
        Equation always holds: <b>1P + 1C + 1S = 1 RWA</b>
      </div>
    </div>
  )
}
