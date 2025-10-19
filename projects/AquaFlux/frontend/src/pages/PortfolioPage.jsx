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
        
        {/* P层 - 蓝色 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${pLength} ${circumference}`}
          strokeDashoffset={-pOffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
        
        {/* C层 - 绿色 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10b981"
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
          stroke="#3b82f6"
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
          stroke="#10b981"
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
          className="absolute text-xs font-medium text-blue-600 bg-white px-1.5 py-0.5 rounded shadow-sm"
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
          className="absolute text-xs font-medium text-emerald-600 bg-white px-1.5 py-0.5 rounded shadow-sm"
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

// Page header component (simple title only)
function PageHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
        Portfolio
      </h1>
      <p className="text-slate-600 mt-2 text-base md:text-lg">
        Your investment holdings with P·C·S layer breakdown.
      </p>
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
      className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors duration-1500 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Portfolio Distribution</h2>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Net Asset Value Display */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-200/50 text-center lg:text-left">
            <div className="text-sm font-medium text-slate-600 mb-2">Net Asset Value</div>
            <div className="text-4xl font-bold font-mono text-slate-800 mb-2">
              ${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-slate-500 mb-4">Valued in USDC</div>
            
            {/* P/C/S Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-blue-200/30">
                <div className="text-xs text-blue-600 font-medium mb-1">P Layer</div>
                <div className="text-lg font-bold text-slate-800">{summary.pPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">${(summary.pValue / 1000).toFixed(0)}k</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-200/30">
                <div className="text-xs text-emerald-600 font-medium mb-1">C Layer</div>
                <div className="text-lg font-bold text-slate-800">{summary.cPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">${(summary.cValue / 1000).toFixed(0)}k</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-amber-200/30">
                <div className="text-xs text-amber-600 font-medium mb-1">S Layer</div>
                <div className="text-lg font-bold text-slate-800">{summary.sPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">${(summary.sValue / 1000).toFixed(0)}k</div>
              </div>
            </div>
          </div>
          
          {/* Donut Chart */}
          <div className="flex justify-center">
            <div className="relative">
              <PCSDonutChart
                pPercent={summary.pPercent}
                cPercent={summary.cPercent}
                sPercent={summary.sPercent}
                onHover={handleDonutHover}
              />
              
              {/* Hover info tooltip */}
              {hoverInfo && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10">
                  <div className="font-medium">{hoverInfo.segment} · {hoverInfo.percent}%</div>
                  <div>{hoverInfo.assetCount} assets · {hoverInfo.value}</div>
                </div>
              )}
            </div>
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
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="font-mono text-sm text-slate-800">
            {holding.holdings.P.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </td>
      
      {/* C Amount */}
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
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
            className="px-2 py-1 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
          >
            Swap
          </button>
          <button 
            onClick={() => push('structure', { assetId: asset.id, tab: 'split-merge' })}
            className="px-2 py-1 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
          >
            Structure
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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Holdings Details</h2>
          
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
            
            {/* Search box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search issuer / asset ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
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
