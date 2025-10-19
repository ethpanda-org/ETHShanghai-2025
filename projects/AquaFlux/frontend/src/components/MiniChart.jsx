import { useState, useMemo } from 'react'
import { cx } from '../utils/helpers'
import { getSpark } from '../utils/helpers'
import Sparkline from './Sparkline'

export default function MiniChart({ asset }) {
  const [range, setRange] = useState('7D')
  const data = useMemo(() => getSpark(asset, range === '7D' ? 7 : 30), [asset, range])
  
  return (
    <div className="mt-1">
      <div className="flex items-center justify-end gap-2">
        <Sparkline data={data} />
        <div className="flex items-center gap-1">
          <button 
            className={cx(
              "px-1.5 py-0.5 rounded-md text-[10px] border", 
              range === '7D' ? "bg-white shadow" : "hover:bg-slate-50"
            )} 
            onClick={() => setRange('7D')}
          >
            7D
          </button>
          <button 
            className={cx(
              "px-1.5 py-0.5 rounded-md text-[10px] border", 
              range === '30D' ? "bg-white shadow" : "hover:bg-slate-50"
            )} 
            onClick={() => setRange('30D')}
          >
            30D
          </button>
        </div>
      </div>
    </div>
  )
}
