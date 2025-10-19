import { useState, useRef, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { portfolioApi } from '../api'
import { cx } from '../utils/helpers'
import AssetAvatar from '../components/AssetAvatar'
import Badge from '../components/Badge'
import { useClaimableRewards } from '../hooks/useClaimableReward'


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
function PCSDonutChart({ pPercent, cPercent, sPercent, pValue, cValue, sValue, size = 160, onHover }) {
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
            onHover?.('P', pPercent, pValue)
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
            onHover?.('C', cPercent, cValue)
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
            onHover?.('S', sPercent, sValue)
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
function PortfolioDistribution({ highlightDistribution, portfolioData, loading, error }) {
  const [hoverInfo, setHoverInfo] = useState(null)
  const distributionRef = useRef(null)

  // 计算portfolio汇总数据
  const calculateSummary = () => {
    if (loading || !portfolioData) {
      return {
        totalValue: 0,
        pPercent: 0,
        cPercent: 0,
        sPercent: 0,
        pValue: 0,
        cValue: 0,
        sValue: 0
      }
    }

    const { summary } = portfolioData
    const { totalValueUSD, totalPValueUSD, totalCValueUSD, totalSValueUSD } = summary

    return {
      totalValue: totalValueUSD,
      pPercent: totalValueUSD > 0 ? (totalPValueUSD / totalValueUSD) * 100 : 0,
      cPercent: totalValueUSD > 0 ? (totalCValueUSD / totalValueUSD) * 100 : 0,
      sPercent: totalValueUSD > 0 ? (totalSValueUSD / totalValueUSD) * 100 : 0,
      pValue: totalPValueUSD,
      cValue: totalCValueUSD,
      sValue: totalSValueUSD
    }
  }
  
  const summary = calculateSummary()
  
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
      // 计算该层有余额的资产数量
      const assetCount = portfolioData?.balances.filter(balance => {
        const layerKey = `${segment.toLowerCase()}Balance`
        return balance.balances[layerKey] > 0
      }).length || 0

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
  
  // Error状态
  if (error) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-red-200 shadow-lg shadow-red-200/20 p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Failed to load portfolio</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
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
                  {loading ? '$0' : `$${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
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
                <div className="text-xl font-bold text-slate-800">{loading ? '0' : summary.pPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">{loading ? '$0' : `$${(summary.pValue).toFixed(2)}`}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-200/30 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mx-auto mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-xs text-blue-600 font-semibold mb-1">C Layer</div>
                <div className="text-xl font-bold text-slate-800">{loading ? '0' : summary.cPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">{loading ? '$0' : `$${(summary.cValue).toFixed(2)}`}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/30 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white mx-auto mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-xs text-amber-600 font-semibold mb-1">S Layer</div>
                <div className="text-xl font-bold text-slate-800">{loading ? '0' : summary.sPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">{loading ? '$0' : `$${(summary.sValue).toFixed(2)}`}</div>
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
                pValue={summary.pValue}
                cValue={summary.cValue}
                sValue={summary.sValue}
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
function HoldingRow({ asset, holding, highlighted, push, refreshData }) {
  // Check if near maturity
  const maturityDate = new Date(asset.maturity)
  const today = new Date()
  const daysToMaturity = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24))
  const isNearMaturity = daysToMaturity <= 90 && daysToMaturity > 0

  // 从API数据获取总价值
  const totalValue = holding.totalValueUSD || 0

  // 使用可领取奖励hook
  const {
    rewards,
    isLoading: rewardsLoading,
    claimReward,
    isClaimingP,
    isClaimingC,
    isClaimingS,
    isConfirming
  } = useClaimableRewards(
    holding.assetId,
    asset.assetInfo,
    true,
    refreshData
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
        <div className="text-sm text-slate-700">
          {new Date(asset.maturity).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })}
        </div>
        {isNearMaturity && (
          <div className="text-xs text-amber-600 mt-1">
            {daysToMaturity} days left
          </div>
        )}
      </td>
      
      {/* P Amount */}
      <td className="py-4 px-4 text-right">
        <div className="flex flex-col items-end">
          <div className="flex items-center justify-end gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="font-mono text-sm text-slate-800">
              {holding.holdings.P.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {/* Claimable Reward - only show if amount > 0 */}
          {!rewardsLoading && rewards.P.amount > 0 && (
            <>
              <div className="flex items-center justify-end gap-1 mt-1">
                <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="font-mono text-xs text-emerald-600">
                  +{rewards.P.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>
              <button
                className="mt-1 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isClaimingP || isConfirming}
                onClick={async () => {
                  try {
                    await claimReward('P')
                  } catch (error) {
                    console.error('Failed to claim P rewards:', error)
                  }
                }}
              >
                {isClaimingP ? 'Claiming...' : isConfirming ? 'Confirming...' : 'Claim'}
              </button>
            </>
          )}
        </div>
      </td>
      
      {/* C Amount */}
      <td className="py-4 px-4 text-right">
        <div className="flex flex-col items-end">
          <div className="flex items-center justify-end gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="font-mono text-sm text-slate-800">
              {holding.holdings.C.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {/* Claimable Reward - only show if amount > 0 */}
          {!rewardsLoading && rewards.C.amount > 0 && (
            <>
              <div className="flex items-center justify-end gap-1 mt-1">
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="font-mono text-xs text-blue-600">
                  +{rewards.C.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>
              <button
                className="mt-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isClaimingC || isConfirming}
                onClick={async () => {
                  try {
                    await claimReward('C')
                  } catch (error) {
                    console.error('Failed to claim C rewards:', error)
                  }
                }}
              >
                {isClaimingC ? 'Claiming...' : isConfirming ? 'Confirming...' : 'Claim'}
              </button>
            </>
          )}
        </div>
      </td>
      
      {/* S Amount */}
      <td className="py-4 px-4 text-right">
        <div className="flex flex-col items-end">
          <div className="flex items-center justify-end gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="font-mono text-sm text-slate-800">
              {holding.holdings.S.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {/* Claimable Reward - only show if amount > 0 */}
          {!rewardsLoading && rewards.S.amount > 0 && (
            <>
              <div className="flex items-center justify-end gap-1 mt-1">
                <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="font-mono text-xs text-amber-600">
                  +{rewards.S.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>
              <button
                className="mt-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isClaimingS || isConfirming}
                onClick={async () => {
                  try {
                    await claimReward('S')
                  } catch (error) {
                    console.error('Failed to claim S rewards:', error)
                  }
                }}
              >
                {isClaimingS ? 'Claiming...' : isConfirming ? 'Confirming...' : 'Claim'}
              </button>
            </>
          )}
        </div>
      </td>
      
      {/* Value (USDC) */}
      <td className="py-4 px-4 text-right">
        <div className="font-mono text-sm font-semibold text-slate-800">
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </div>
      </td>
    </tr>
  )
}

// Holdings table component
function HoldingsTable({ highlightNearMaturity, clearFilter, push, portfolioData, loading, error, refreshData }) {
  const [searchTerm, setSearchTerm] = useState('')

  // 转换API数据为组件需要的格式
  const convertApiDataToHoldings = () => {
    if (!portfolioData?.balances) return []

    return portfolioData.balances.map(balance => {
      const asset = {
        name: balance.assetInfo.name,
        issuer: balance.assetInfo.issuer,
        chain: balance.assetInfo.chain,
        rating: balance.assetInfo.rating,
        maturity: balance.assetInfo.maturity,
        nav: 1, // API数据中的价格信息，这里简化处理
        assetInfo: balance.assetInfo // 添加完整的assetInfo以便访问token地址
      }

      const holding = {
        holdings: {
          P: { amount: balance.balances.pBalance || 0 },
          C: { amount: balance.balances.cBalance || 0 },
          S: { amount: balance.balances.sBalance || 0 }
        },
        totalValueUSD: balance.balances.totalValueUSD
      }

      return {
        assetId: balance.assetInfo.assetId,
        asset,
        ...holding
      }
    })
  }

  // Filter and sort data
  let filteredHoldings = convertApiDataToHoldings().filter(item => {
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

  // Error状态
  if (error) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-red-200 shadow-lg shadow-red-200/20 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Failed to load holdings</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

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
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.map((item) => (
              <HoldingRow
                key={item.assetId}
                asset={item.asset}
                holding={item}
                highlighted={highlightNearMaturity}
                push={push}
                refreshData={refreshData}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {loading && (
        <div className="py-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-600">Loading holdings...</span>
          </div>
        </div>
      )}

      {!loading && filteredHoldings.length === 0 && (
        <div className="py-8 text-center text-slate-500">
          {searchTerm ? 'No matching assets found' : (portfolioData ? 'No holdings data' : 'No portfolio data available')}
        </div>
      )}
    </div>
  )
}

// Main component
export default function PortfolioPage({ push }) {
  const [highlightDistribution, setHighlightDistribution] = useState(false)
  const [highlightNearMaturity, setHighlightNearMaturity] = useState(false)
  const [portfolioData, setPortfolioData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { address: walletAddress, isConnected } = useAccount()

  // 获取portfolio数据的函数
  const fetchPortfolioData = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await portfolioApi.getAllBalances(walletAddress)

      if (response.status === 'success') {
        setPortfolioData(response.data)
      } else {
        throw new Error(response.message || 'Failed to fetch portfolio data')
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching portfolio data:', err)
      setPortfolioData(null)
    } finally {
      setLoading(false)
    }
  }, [isConnected, walletAddress])

  useEffect(() => {
    fetchPortfolioData()
  }, [fetchPortfolioData])

  const clearFilter = () => {
    setHighlightNearMaturity(false)
  }

  // 如果钱包未连接，显示连接钱包提示
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/20 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Connect Your Wallet</h3>
            <p className="text-slate-600 mb-4">Please connect your wallet to view your portfolio holdings</p>
            <p className="text-sm text-slate-500">Click the "Connect Wallet" button in the header to get started</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      <PortfolioDistribution
        highlightDistribution={highlightDistribution}
        portfolioData={portfolioData}
        loading={loading}
        error={error}
      />

      <div data-holdings-table>
        <HoldingsTable
          highlightNearMaturity={highlightNearMaturity}
          clearFilter={clearFilter}
          push={push}
          portfolioData={portfolioData}
          loading={loading}
          error={error}
          refreshData={fetchPortfolioData}
        />
      </div>
    </div>
  )
}
