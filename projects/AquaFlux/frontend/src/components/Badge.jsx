import { cx } from '../utils/helpers'

export default function Badge({ children, tone = "neutral", icon, className, ...props }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    warn: "bg-amber-100 text-amber-800 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
    danger: "bg-rose-100 text-rose-700 border-rose-200",
  }
  
  return (
    <span 
      className={cx(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all duration-200 hover:scale-105", 
        tones[tone],
        className
      )}
      {...props}
    >
      {icon && <span className="w-3 h-3">{icon}</span>}
      {children}
    </span>
  )
}
