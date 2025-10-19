import AssetAvatar from './AssetAvatar'
import Badge from './Badge'
import { isNearMaturity, avg } from '../utils/helpers'

export default function AssetTable({ assets, onSwap }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="text-left p-3">资产</th>
            <th className="text-left p-3">到期</th>
            <th className="text-left p-3">信评</th>
            <th className="text-left p-3">P-APY</th>
            <th className="text-left p-3">C-APR</th>
            <th className="text-left p-3">S-APY(中值)</th>
            <th className="text-left p-3">P折价%</th>
            <th className="text-left p-3">NAV</th>
            <th className="text-left p-3">TVL</th>
            <th className="text-left p-3">24h量</th>
            <th className="text-left p-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <AssetAvatar a={a} />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {a.name}
                      {isNearMaturity(a) && <Badge tone="warn">临近到期</Badge>}
                    </div>
                    <div className="text-[11px] text-slate-500">{a.type} · {a.chain}</div>
                  </div>
                </div>
              </td>
              <td className="p-3">{a.maturity}</td>
              <td className="p-3">{a.rating}</td>
              <td className="p-3">{a.pApy.toFixed(1)}%</td>
              <td className="p-3">{a.cApr.toFixed(1)}%</td>
              <td className="p-3">{avg(a.sApy).toFixed(1)}%</td>
              <td className="p-3">{a.discountP}%</td>
              <td className="p-3">${a.nav}</td>
              <td className="p-3">${a.tvl.toFixed(1)}m</td>
              <td className="p-3">${a.vol24h.toFixed(1)}m</td>
              <td className="p-3">
                <div className="flex gap-2">
                  <button 
                    className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50" 
                    onClick={() => onSwap({ assetId: a.id, from: "USDC", to: `${a.id}:P`, action: "buy" })}
                  >
                    Buy P
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50" 
                    onClick={() => onSwap({ assetId: a.id, from: "USDC", to: `${a.id}:C`, action: "buy" })}
                  >
                    Buy C
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50" 
                    onClick={() => onSwap({ assetId: a.id, from: "USDC", to: `${a.id}:S`, action: "buy" })}
                  >
                    Buy S
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
