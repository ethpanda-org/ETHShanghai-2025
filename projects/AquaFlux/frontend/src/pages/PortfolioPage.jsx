import { useState, useRef, useEffect } from 'react'
import { calculatePortfolioSummary, PORTFOLIO_HOLDINGS, getAsset, getPortfolioHolding } from '../data/mockData'
import { cx } from '../utils/helpers'
import AssetAvatar from '../components/AssetAvatar'
import Badge from '../components/Badge'

// P/C/S圆环组件
function PCSRing({ pPercent, cPercent, sPercent, size = 48, strokeWidth = 6, onClick }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  // 计算每段的路径
  const pLength = (pPercent / 100) * circumference
  const cLength = (cPercent / 100) * circumference  
  const sLength = (sPercent / 100) * circumference
  
  const pOffset = 0
  const cOffset = pLength
  const sOffset = pLength + cLength

  return (
    <div className="relative inline-block" onClick={onClick}>
      <svg width={size} height={size} className="transform -rotate-90 cursor-pointer">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        
        {/* P层 - 绿色 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeDasharray={`${pLength} ${circumference}`}
          strokeDashoffset={-pOffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
        
        {/* C层 - 蓝色 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${cLength} ${circumference}`}
          strokeDashoffset={-cOffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
        
        {/* S层 - 琥珀色 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          strokeDasharray={`${sLength} ${circumference}`}
          strokeDashoffset={-sOffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      
      {/* 中心文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-medium">
        <div className="text-slate-600">PCS</div>
      </div>
    </div>
  )
}

// 甜甜圈图组件（更大的版本用于分布区块）
function PCSDonutChart({ pPercent, cPercent, sPercent, size = 160, onHover }) {
  const [hoveredSegment, setHoveredSegment] = useState(null)
  
  const centerX = size / 2
  const centerY = size / 2
  const radius = size * 0.35
  const strokeWidth = size * 0.15
  
  // 创建路径数据
  const createPath = (startAngle, endAngle) => {
    const start = (startAngle * Math.PI) / 180
    const end = (endAngle * Math.PI) / 180
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    
    const x1 = centerX + radius * Math.cos(start)
    const y1 = centerY + radius * Math.sin(start)
    const x2 = centerX + radius * Math.cos(end)
    const y2 = centerY + radius * Math.sin(end)
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
  }
  
  const pAngle = (pPercent / 100) * 360
  const cAngle = (cPercent / 100) * 360
  const sAngle = (sPercent / 100) * 360
  
  const pPath = createPath(-90, -90 + pAngle)
  const cPath = createPath(-90 + pAngle, -90 + pAngle + cAngle)
  const sPath = createPath(-90 + pAngle + cAngle, -90 + pAngle + cAngle + sAngle)
  
  const summary = calculatePortfolioSummary()
  
  return (
    <div className="relative">
      <svg width={size} height={size}>
        {/* P层 */}
        <path
          d={pPath}
          fill="none"
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-200 hover:brightness-110 cursor-pointer"
          onMouseEnter={() => {
            setHoveredSegment('P')
            onHover?.('P', pPercent, summary.pValue)
          }}
          onMouseLeave={() => {
            setHoveredSegment(null)
            onHover?.(null)
          }}
        />
        
        {/* C层 */}
        <path
          d={cPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-200 hover:brightness-110 cursor-pointer"
          onMouseEnter={() => {
            setHoveredSegment('C')
            onHover?.('C', cPercent, summary.cValue)
          }}
          onMouseLeave={() => {
            setHoveredSegment(null)
            onHover?.(null)
          }}
        />
        
        {/* S层 */}
        <path
          d={sPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-200 hover:brightness-110 cursor-pointer"
          onMouseEnter={() => {
            setHoveredSegment('S')
            onHover?.('S', sPercent, summary.sValue)
          }}
          onMouseLeave={() => {
            setHoveredSegment(null)
            onHover?.(null)
          }}
        />
      </svg>
      
      {/* 百分比标签 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* P标签 */}
        <div 
          className="absolute text-xs font-medium text-emerald-600 bg-white px-1.5 py-0.5 rounded shadow-sm"
          style={{
            left: `${50 + 45 * Math.cos((-90 + pAngle/2) * Math.PI / 180)}%`,
            top: `${50 + 45 * Math.sin((-90 + pAngle/2) * Math.PI / 180)}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          P {pPercent.toFixed(0)}%
        </div>
        
        {/* C标签 */}
        <div 
          className="absolute text-xs font-medium text-blue-600 bg-white px-1.5 py-0.5 rounded shadow-sm"
          style={{
            left: `${50 + 45 * Math.cos((-90 + pAngle + cAngle/2) * Math.PI / 180)}%`,
            top: `${50 + 45 * Math.sin((-90 + pAngle + cAngle/2) * Math.PI / 180)}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          C {cPercent.toFixed(0)}%
        </div>
        
        {/* S标签 */}
        <div 
          className="absolute text-xs font-medium text-amber-600 bg-white px-1.5 py-0.5 rounded shadow-sm"
          style={{
            left: `${50 + 45 * Math.cos((-90 + pAngle + cAngle + sAngle/2) * Math.PI / 180)}%`,
            top: `${50 + 45 * Math.sin((-90 + pAngle + cAngle + sAngle/2) * Math.PI / 180)}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          S {sPercent.toFixed(0)}%
        </div>
      </div>
    </div>
  )
}

// Enhanced Page header component
function PageHeader() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 p-8 border border-blue-200/30">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-indigo-100/20"></div>
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Portfolio
              </h1>
              <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                Your investment holdings with P·C·S layer breakdown
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-gray-800 text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">P·C·S Layers</h3>
                <div className="bg-white rounded-2xl border border-slate-200 px-6 py-3 shadow-lg">
                  <div className="text-base font-bold text-slate-800 font-mono tracking-wide">
                    <span className="text-emerald-600">Principal</span> + <span className="text-blue-600">Coupon</span> + <span className="text-amber-600">Shield</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Portfolio distribution block
function PortfolioDistribution({ highlightDistribution }) {
  const [hoverInfo, setHoverInfo] = useState(null)
  const summary = calculatePortfolioSummary()
  const distributionRef = useRef(null)
  
  useEffect(() => {
    if (highlightDistribution && distributionRef.current) {
      distributionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      distributionRef.current.classList.add('bg-blue-50')
      setTimeout(() => {
        distributionRef.current?.classList.remove('bg-blue-50')
      }, 1500)
    }
  }, [highlightDistribution])
  
  const handleDonutHover = (segment, percent, value) => {
    if (segment) {
      const assetCount = PORTFOLIO_HOLDINGS.filter(h => h.holdings[segment].amount > 0).length
      setHoverInfo({
        segment,
        percent: percent.toFixed(1),
        assetCount,
        value: value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
      })
    } else {
      setHoverInfo(null)
    }
  }
  
  return (
    <div 
      ref={distributionRef}
      className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/20 transition-colors duration-1500 p-6"
    >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Enhanced Net Asset Value Display */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 border border-blue-200/50 shadow-lg shadow-blue-100/20 text-center lg:text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600">Net Asset Value</div>
                <div className="text-4xl font-bold font-mono text-slate-800">
                  ${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
            
            {/* Enhanced P/C/S Breakdown */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-emerald-200/30 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white mx-auto mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mb-1">P Layer</div>
                <div className="text-xl font-bold text-slate-800">{summary.pPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">${(summary.pValue / 1000).toFixed(0)}k</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-200/30 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mx-auto mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-xs text-blue-600 font-semibold mb-1">C Layer</div>
                <div className="text-xl font-bold text-slate-800">{summary.cPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">${(summary.cValue / 1000).toFixed(0)}k</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/30 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white mx-auto mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-xs text-amber-600 font-semibold mb-1">S Layer</div>
                <div className="text-xl font-bold text-slate-800">{summary.sPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">${(summary.sValue / 1000).toFixed(0)}k</div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Donut Chart */}
          <div className="flex flex-col items-center">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 text-center">Your P·C·S Distribution</h3>
            </div>
            
            <div className="relative">
              <PCSDonutChart
                pPercent={summary.pPercent}
                cPercent={summary.cPercent}
                sPercent={summary.sPercent}
                onHover={handleDonutHover}
              />
              
              {/* Enhanced Hover info tooltip */}
              {hoverInfo && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-800 to-gray-900 text-white text-sm px-4 py-3 rounded-2xl shadow-2xl pointer-events-none z-10 border border-slate-600">
                  <div className="font-bold text-center">{hoverInfo.segment} Layer</div>
                  <div className="text-center text-xs opacity-90 mt-1">
                    {hoverInfo.percent}% · {hoverInfo.assetCount} assets
                  </div>
                  <div className="text-center font-mono text-sm mt-1">{hoverInfo.value}</div>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  )
}

// Holdings table row component  
function HoldingRow({ asset, holding, highlighted, push }) {
  // Check if near maturity
  const maturityDate = new Date(asset.maturity)
  const today = new Date()
  const daysToMaturity = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24))
  const isNearMaturity = daysToMaturity <= 90 && daysToMaturity > 0
  
  const totalValue = (
    holding.holdings.P.amount * asset.nav +
    holding.holdings.C.amount * asset.nav +
    holding.holdings.S.amount * asset.nav
  )
  
  return (
    <tr 
      className={cx(
        "border-b border-slate-100 hover:bg-slate-50 transition-colors",
        highlighted && "bg-blue-50 border-l-2 border-l-blue-500"
      )}
    >
      {/* Asset */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <AssetAvatar a={asset} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{asset.name}</span>
              <Badge tone="success" className="text-xs">{asset.rating}</Badge>
              {isNearMaturity && <Badge tone="warn" className="text-xs">Near Maturity</Badge>}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {asset.issuer} · {asset.chain}
            </div>
          </div>
        </div>
      </td>
      
      {/* Maturity */}
      <td className="py-4 px-4 text-center">
        <div className="text-sm text-slate-700">{asset.maturity}</div>
        {isNearMaturity && (
          <div className="text-xs text-amber-600 mt-1">
            {daysToMaturity} days left
          </div>
        )}
      </td>
      
      {/* P Amount */}
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="font-mono text-sm text-slate-800">
            {holding.holdings.P.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </td>
      
      {/* C Amount */}
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="font-mono text-sm text-slate-800">
            {holding.holdings.C.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </td>
      
      {/* S Amount */}
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <span className="font-mono text-sm text-slate-800">
            {holding.holdings.S.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </td>
      
      {/* Value (USDC) */}
      <td className="py-4 px-4 text-right">
        <div className="font-mono text-sm font-semibold text-slate-800">
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </div>
      </td>
      
      {/* Actions */}
      <td className="py-4 px-4 text-right">
        <div className="flex items-center gap-2 justify-end">
          <button 
            onClick={() => push('swap', { assetId: asset.id, from: 'USDC', to: `${asset.id}:P` })}
            className="px-3 py-1.5 text-xs font-medium text-emerald-600 border border-emerald-300 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Swap
            </div>
          </button>
          <button 
            onClick={() => push('structure', { assetId: asset.id, tab: 'split-merge' })}
            className="px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-300 rounded-xl hover:bg-violet-50 hover:border-violet-400 transition-all duration-200 transform hover:scale-105"
          >
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Structure
            </div>
          </button>
        </div>
      </td>
    </tr>
  )
}

// Holdings table component
function HoldingsTable({ highlightNearMaturity, clearFilter, push }) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter and sort data
  let filteredHoldings = PORTFOLIO_HOLDINGS.map(holding => ({
    ...holding,
    asset: getAsset(holding.assetId)
  })).filter(item => {
    if (!item.asset) return false
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (!item.asset.name.toLowerCase().includes(searchLower) && 
          !item.asset.issuer.toLowerCase().includes(searchLower) &&
          !item.assetId.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    // Near maturity filter
    if (highlightNearMaturity) {
      const maturityDate = new Date(item.asset.maturity)
      const today = new Date()
      const daysToMaturity = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24))
      return daysToMaturity <= 90 && daysToMaturity > 0
    }
    
    return true
  })
  
  // Sort by maturity date
  filteredHoldings.sort((a, b) => new Date(a.asset.maturity) - new Date(b.asset.maturity))
  
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/20 overflow-hidden">
      {/* Enhanced Table header */}
      <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-100 px-6 py-5 border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-gray-700 text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Holdings Details</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Clear filter button */}
            {highlightNearMaturity && (
              <button 
                onClick={clearFilter}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear filter"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Enhanced Search box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search issuer / asset ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-56 pl-10 pr-4 py-2.5 text-sm border border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-2xl bg-white/80 backdrop-blur-sm transition-all duration-300 transform hover:scale-105 focus:scale-105"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-medium text-slate-600">Asset</th>
              <th className="py-3 px-4 text-center text-sm font-medium text-slate-600">Maturity</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-slate-600">P Amount</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-slate-600">C Amount</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-slate-600">S Amount</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-slate-600">Value (USDC)</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.map(({ asset, holdings, assetId }) => (
              <HoldingRow
                key={assetId}
                asset={asset}
                holding={{ holdings }}
                highlighted={highlightNearMaturity}
                push={push}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredHoldings.length === 0 && (
        <div className="py-8 text-center text-slate-500">
          {searchTerm ? 'No matching assets found' : 'No holdings data'}
        </div>
      )}
    </div>
  )
}

// Main component
export default function PortfolioPage({ push }) {
  const [highlightDistribution, setHighlightDistribution] = useState(false)
  const [highlightNearMaturity, setHighlightNearMaturity] = useState(false)
  
  const clearFilter = () => {
    setHighlightNearMaturity(false)
  }
  
  return (
    <div className="space-y-6">
      <PageHeader />
      
      <PortfolioDistribution 
        highlightDistribution={highlightDistribution}
      />
      
      <div data-holdings-table>
        <HoldingsTable 
          highlightNearMaturity={highlightNearMaturity}
          clearFilter={clearFilter}
          push={push}
        />
      </div>
    </div>
  )
}
