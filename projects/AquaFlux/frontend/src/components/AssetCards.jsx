import { useState } from 'react'
import AssetAvatar from './AssetAvatar'
import Badge from './Badge'
import MiniSimulator from './MiniSimulator'
import { isNearMaturity, avg } from '../utils/helpers'
import { cx } from '../utils/helpers'

function PCSPanel({ label, value, sub, tone = "neutral", onClick }) {
  const toneMap = { 
    neutral: "bg-slate-50", 
    success: "bg-emerald-50", 
    info: "bg-blue-50", 
    warn: "bg-amber-50" 
  }
  
  return (
    <button 
      onClick={onClick}
      className={cx(
        "rounded-xl p-3 border border-slate-200 text-left hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer", 
        toneMap[tone]
      )}
    >
      <div className="text-xs text-slate-500 truncate whitespace-nowrap" title={label}>{label}</div>
      <div className="text-lg font-semibold truncate whitespace-nowrap" title={value}>{value}</div>
      <div className="text-[11px] text-slate-500 truncate whitespace-nowrap" title={sub}>{sub}</div>
    </button>
  )
}

export default function AssetCards({ assets, onSwap, onBuild }) {
  const [openSimId, setOpenSimId] = useState(null)
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {assets.map((a) => (
        <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 overflow-hidden">
                <AssetAvatar a={a} />
                <div className="text-base font-semibold truncate whitespace-nowrap" title={a.name}>{a.name}</div>
                {a.isNew && <Badge tone="info">New</Badge>}
                {/* <Badge>{a.type}</Badge>
                <Badge tone="success">{a.rating}</Badge>
                {isNearMaturity(a) && <Badge tone="warn">Near Maturity</Badge>} */}
              </div>
              <div className="text-xs text-slate-500 mt-1 truncate whitespace-nowrap" title={`Issuer: ${a.issuer} · Maturity: ${a.maturity}`}>
                Issuer: {a.issuer} · Maturity: {a.maturity}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate whitespace-nowrap" title={`Chain: ${a.chain} · NAV $${a.nav} · P Discount ${a.discountP}%`}>
                Chain: {a.chain} · NAV ${a.nav} · P Discount {a.discountP}%
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm text-slate-500 whitespace-nowrap">TVL</div>
              <div className="text-lg font-semibold whitespace-nowrap">${a.tvl.toFixed(1)}m</div>
              <div className="text-xs text-slate-500 whitespace-nowrap">24h ${a.vol24h.toFixed(1)}m</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <PCSPanel 
              label="P" 
              value={`${a.pApy.toFixed(1)}%`} 
              sub="Maturity APY" 
              tone="info"
              onClick={() => onSwap({ assetId: a.id, from: "USDC", to: `${a.id}:P`, action: "buy" })}
            />
            <PCSPanel 
              label="C" 
              value={`${a.cApr.toFixed(1)}%`} 
              sub="Coupon APR" 
              tone="success"
              onClick={() => onSwap({ assetId: a.id, from: "USDC", to: `${a.id}:C`, action: "buy" })}
            />
            <PCSPanel 
              label="S" 
              value={`${avg(a.sApy).toFixed(1)}%`} 
              sub={`${a.sApy[0]}%~${a.sApy[1]}%`} 
              tone="warn"
              onClick={() => onSwap({ assetId: a.id, from: "USDC", to: `${a.id}:S`, action: "buy" })}
            />
          </div>

          {/* <div className="mt-3 flex items-center justify-center">
            <button 
              onClick={() => setOpenSimId(openSimId === a.id ? null : a.id)} 
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              {openSimId === a.id ? "Hide Portfolio Purchase" : "Portfolio Purchase (Slider)"}
            </button>
          </div> */}

          {openSimId === a.id && (
            <MiniSimulator 
              asset={a} 
              onQuickSwap={(leg) => onSwap({ assetId: a.id, from: "USDC", to: `${a.id}:${leg}`, action: "buy" })} 
            />
          )}

        </div>
      ))}
    </div>
  )
}
