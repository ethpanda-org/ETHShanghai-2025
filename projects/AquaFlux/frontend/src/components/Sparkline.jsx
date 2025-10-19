export default function Sparkline({ data, width = 120, height = 32 }) {
  if (!data || !data.length) return null
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const normY = (v) => (height - 2) - ((v - min) / (max - min || 1)) * (height - 4)
  const step = (width - 4) / (data.length - 1 || 1)
  const path = data.map((v, i) => `${i ? "L" : "M"}${2 + i * step},${normY(v)}`).join(" ")
  const rising = data[data.length - 1] >= data[0]
  
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-slate-400">
      <path 
        d={path} 
        fill="none" 
        stroke={rising ? "#10B981" : "#EF4444"} 
        strokeWidth="2" 
      />
    </svg>
  )
}
