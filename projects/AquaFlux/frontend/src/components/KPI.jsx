export default function KPI({ label, value, trend, trendValue }) {
  return (
    <div className="relative group">
      <div className="rounded-2xl border border-transparent p-4 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-600">{label}</div>
          {trend && (
            <div className={cx(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend === "up" ? "text-emerald-600 bg-emerald-100" : "text-red-600 bg-red-100"
            )}>
              <svg className={cx("w-3 h-3", trend === "up" ? "rotate-0" : "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {trendValue}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-slate-800 mt-2">{value}</div>
        
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
    </div>
  )
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}
