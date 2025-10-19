import AssetAvatar from './AssetAvatar'
import Badge from './Badge'
import { isNearMaturity, avg, formatDateToYMD } from '../utils/helpers'

export default function AssetTable({ assets, onSwap }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="text-left p-3">Asset</th>
            <th className="text-left p-3">Maturity</th>
            <th className="text-left p-3">Rating</th>
            <th className="text-left p-3">P-APY</th>
            <th className="text-left p-3">C-APR</th>
            <th className="text-left p-3">S-APY(Median)</th>
            <th className="text-left p-3">P Discount %</th>
            <th className="text-left p-3">NAV</th>
            <th className="text-left p-3">TVL</th>
            <th className="text-left p-3">24h Volume</th>
            <th className="text-left p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.assetId || a.id} className="border-t">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <AssetAvatar a={a} />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {a.name || 'Unknown Asset'}
                      {isNearMaturity(a) && <Badge tone="warn">Near Maturity</Badge>}
                    </div>
                    <div className="text-[11px] text-slate-500">{a.type || 'N/A'} · {a.chain || 'N/A'}</div>
                  </div>
                </div>
              </td>
              <td className="p-3">{formatDateToYMD(a.maturity)}</td>
              <td className="p-3">{a.rating || 'N/A'}</td>
              <td className="p-3">{(a.pApr || 0).toFixed(1)}%</td>
              <td className="p-3">{(a.cApr || 0).toFixed(1)}%</td>
              <td className="p-3">{avg(a.sAprRange || [0, 0]).toFixed(1)}%</td>
              <td className="p-3">{a.discountP || 0}%</td>
              <td className="p-3">${a.nav || 0}</td>
              <td className="p-3">${(a.tvl || 0).toFixed(1)}</td>
              <td className="p-3">${(a.vol24h || 0).toFixed(1)}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50"
                    onClick={() => onSwap({ assetId: a.assetId || a.id, from: "USDC", to: `${a.assetId || a.id}:P`, action: "buy" })}
                  >
                    Buy P
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50"
                    onClick={() => onSwap({ assetId: a.assetId || a.id, from: "USDC", to: `${a.assetId || a.id}:C`, action: "buy" })}
                  >
                    Buy C
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50"
                    onClick={() => onSwap({ assetId: a.assetId || a.id, from: "USDC", to: `${a.assetId || a.id}:S`, action: "buy" })}
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
