import { useState, useMemo } from 'react'
import { avg } from '../utils/helpers'

export default function MiniSimulator({ asset, onQuickSwap }) {
  const [p, setP] = useState(70)
  const [c, setC] = useState(20)
  const s = Math.max(0, 100 - p - c)
  
  const expected = useMemo(() => 
    (p / 100) * asset.pApy + (c / 100) * asset.cApr + (s / 100) * avg(asset.sApy), 
    [p, c, s, asset]
  )
  
  return (
    <div className="mt-3 rounded-xl border border-slate-200 p-3 bg-slate-50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-600">P 比例：{p}%</label>
          <input 
            type="range" 
            min={0} 
            max={100} 
            value={p} 
            onChange={(e) => setP(Number(e.target.value))} 
            className="w-full" 
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">C 比例：{c}%</label>
          <input 
            type="range" 
            min={0} 
            max={100 - p} 
            value={c} 
            onChange={(e) => setC(Math.min(100 - p, Number(e.target.value)))} 
            className="w-full" 
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">S 比例：{s}%</label>
          <div className="text-[11px] text-slate-500">自动 = 100 - P - C</div>
        </div>
      </div>
      
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white border p-3">
          <div className="text-xs text-slate-500">预计组合年化(APR)</div>
          <div className="text-xl font-semibold">{expected.toFixed(2)}%</div>
        </div>
        <div className="rounded-xl bg-white border p-3">
          <div className="text-xs text-slate-500">风险提示</div>
          <div className="text-[11px] text-slate-600">S层收益受赔付影响；历史不代表未来。</div>
        </div>
        <div className="rounded-xl bg-white border p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">预估覆盖率(LCR)</div>
            <div className="text-sm font-medium">{asset.lcr}×</div>
          </div>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50" 
              onClick={() => onQuickSwap('P')}
            >
              Buy P
            </button>
            <button 
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50" 
              onClick={() => onQuickSwap('C')}
            >
              Buy C
            </button>
            <button 
              className="px-3 py-1.5 rounded-xl border text-xs hover:bg-slate-50" 
              onClick={() => onQuickSwap('S')}
            >
              Buy S
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
