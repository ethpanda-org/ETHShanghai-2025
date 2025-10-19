import AssetAvatar from './AssetAvatar'
import Badge from './Badge'
import { isNearMaturity } from '../utils/helpers'

export default function AssetMiniCard({ a }) {
  if (!a) return null
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <AssetAvatar a={a} />
      <div className="font-medium">{a.name}</div>
      <Badge>{a.type}</Badge>
      <Badge tone="success">{a.rating}</Badge>
      {isNearMaturity(a) && <Badge tone="warn">临近到期</Badge>}
      <span className="text-slate-500">到期 {a.maturity}</span>
      <span className="text-slate-400">· {a.chain}</span>
    </div>
  )
}
