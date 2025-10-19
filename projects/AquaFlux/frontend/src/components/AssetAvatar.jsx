export default function AssetAvatar({ a }) {
  const map = { 
    "国债": "🏛️", 
    "公司债": "🏢", 
    "商业票据": "📄", 
    "市政债": "🏙️" 
  }
  const emoji = map[a.type] || "📦"
  
  return (
    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-base" title={a.issuer}>
      <span className="leading-none">{emoji}</span>
    </div>
  )
}
