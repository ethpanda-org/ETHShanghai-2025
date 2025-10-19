import { cx } from '../utils/helpers'

export default function NetworkStatus() {
  // Mocked: status + block height
  const status = 'normal' // 'normal' | 'delay' | 'offline'
  const color = status === 'normal' ? 'bg-emerald-500' : 
                status === 'delay' ? 'bg-amber-500' : 'bg-slate-400'
  const height = 1234567
  
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1">
      <div className="text-sm">Pharos</div>
      <div className="text-xs text-slate-500">#{height.toLocaleString()}</div>
      <span 
        className={cx("inline-block w-2.5 h-2.5 rounded-full", color)} 
        title="路由状态"
      />
    </div>
  )
}
