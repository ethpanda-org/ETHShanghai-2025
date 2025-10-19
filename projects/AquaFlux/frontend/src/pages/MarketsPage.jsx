import { useState, useEffect } from 'react'
import { ASSETS, GOALS } from '../data/mockData'
import { useSortedFiltered } from '../hooks/useSortedFiltered'
import Badge from '../components/Badge'
import KPI from '../components/KPI'
import AssetCards from '../components/AssetCards'
import AssetTable from '../components/AssetTable'
import { cx } from '../utils/helpers'
import { assetsApi, marketsApi } from '../api'

function KPIBar({ apiAssets, tvlData, volumeData, loading }) {
  // 格式化变化显示的辅助函数
  const formatChangeDisplay = (changePercentage, changeDirection) => {
    if (!changePercentage || changePercentage === "0.00") {
      return "0%";
    }
    const sign = changeDirection === "up" ? "+" : changeDirection === "down" ? "-" : "";
    return `${sign}${changePercentage}%`;
  };

  // 获取趋势方向
  const getTrend = (changeDirection) => {
    return changeDirection === "down" ? "down" : "up";
  };

  // 计算资产数量
  const activeMarketsCount = apiAssets ? apiAssets.length : 0

  // TVL数据：优先使用API数据，否则使用计算值
  const tvlValue = loading ? "$0" : (tvlData?.totalTVLFormatted ? `$${tvlData.totalTVLFormatted}` : (() => {
    const totalTVL = apiAssets ? apiAssets.reduce((sum, asset) => sum + (asset.tvl || 0), 0) : 0
    return totalTVL >= 1 ? `$${totalTVL.toFixed(1)}` : `$${(totalTVL * 1000).toFixed(0)}k`
  })())

  const tvlTrendValue = loading ? "0%" : formatChangeDisplay(tvlData?.changePercentage, tvlData?.changeDirection)
  const tvlTrend = getTrend(tvlData?.changeDirection || "up")

  // Volume数据
  const volumeValue = loading ? "$0" : (volumeData?.currentVolume24hFormatted ? `$${volumeData.currentVolume24hFormatted}` : "$0")
  const volumeTrendValue = loading ? "0%" : formatChangeDisplay(volumeData?.changePercentage, volumeData?.changeDirection)
  const volumeTrend = getTrend(volumeData?.changeDirection || "up")

  // Active Markets数据
  const newAssetsCount = apiAssets ? apiAssets.filter(asset => asset.isNew).length : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 border border-blue-200/50">
          <KPI
            label="TVL"
            value={tvlValue}
            trend={tvlTrend}
            trendValue={tvlTrendValue}
          />
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl p-4 border border-emerald-200/50">
          <KPI
            label="24h Volume"
            value={volumeValue}
            trend={volumeTrend}
            trendValue={volumeTrendValue}
          />
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-4 border border-purple-200/50">
          <KPI
            label="Active Markets"
            value={activeMarketsCount.toString()}
            trend="up"
            trendValue={newAssetsCount > 0 ? `+${newAssetsCount}` : "0"}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Network: Sepolia</span>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Currency: USD</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LegendBar({ open, setOpen }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div className="text-xs text-slate-500">
        <span className="text-slate-600">Tips: </span> 
        P=Principal Layer (Fixed maturity returns) · C=Coupon Layer (Variable) · S=Shield Layer (High returns/High risk)
      </div>
      <button 
        onClick={() => setOpen(!open)} 
        className="text-xs text-slate-500 hover:text-slate-600 underline decoration-slate-200 hover:decoration-slate-400 transition-colors duration-200"
      >
        {open ? "Hide Explanations" : "Show Explanations"}
      </button>
    </div>
  )
}

function Explainer({ open, setOpen }) {
  if (!open) return null
  
  return (
    <div className="mt-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-slate-700 mb-3">Column Field Explanations</div>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li><b className="text-slate-700">P-APY</b>: Expected fixed annualized return calculated by maturity; close to "Principal Layer".</li>
            <li><b className="text-slate-700">C-APR</b>: Current annualized return corresponding to coupon, may fluctuate; close to "Coupon Layer".</li>
            <li><b className="text-slate-700">S-APY(Range)</b>: Annualized range estimated from premium-claim history; high return/high risk "Shield Layer".</li>
            <li><b className="text-slate-700">Maturity</b>: Affects duration/capital occupation; marked as Near Maturity when approaching maturity.</li>
            <li><b className="text-slate-700">TVL/24h Volume</b>: Liquidity and activity signals.</li>
            <li><b className="text-slate-700">NAV/Discount</b>: Helps judge "value for money".</li>
          </ul>
        </div>
        <button 
          onClick={() => setOpen(false)} 
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function MarketsPage({ push }) {
  const [goal, setGoal] = useState("Conservative")
  const [view, setView] = useState("cards")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("trend")
  const [showExplainer, setShowExplainer] = useState(false)
  const [apiAssets, setApiAssets] = useState(null)
  const [tvlData, setTvlData] = useState(null)
  const [volumeData, setVolumeData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const assets = useSortedFiltered(
    apiAssets || [],
    { sort, search, goal }
  )

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // 并行获取assets、TVL和Volume数据
        const [assetsResponse, tvlResponse, volumeResponse] = await Promise.all([
          assetsApi.getAll({
            page: 1,
            limit: 100,
            isActive: true
          }),
          marketsApi.getTvlTotal().catch(err => {
            console.warn('TVL API failed:', err)
            return null
          }),
          marketsApi.getVolume24h('sepolia').catch(err => {
            console.warn('Volume API failed:', err)
            return null
          })
        ])

        // 处理assets数据
        if (assetsResponse.status === "success" && assetsResponse.data) {
          console.log('assets response.data', assetsResponse.data)
          setApiAssets(assetsResponse.data.assets)
        } else {
          throw new Error(assetsResponse.message || 'Failed to fetch assets')
        }

        // 处理TVL数据
        if (tvlResponse && tvlResponse.success && tvlResponse.data) {
          console.log('tvl response.data', tvlResponse.data)
          setTvlData(tvlResponse.data)
        }

        // 处理Volume数据
        if (volumeResponse && volumeResponse.success && volumeResponse.data) {
          console.log('volume response.data', volumeResponse.data)
          setVolumeData(volumeResponse.data)
        }

      } catch (err) {
        setError(err.message)
        console.error('Failed to fetch data:', err)
        // 出错时设置为空数组，显示空数据状态
        setApiAssets([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 border border-blue-200/30">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-emerald-200/20 to-blue-200/20 rounded-full translate-y-12 -translate-x-12"></div>
        
        <header className="relative">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Markets
              </h1>
              <p className="text-slate-600 mt-2 text-base md:text-lg max-w-2xl">
                 Explore diversified RWAs, build your portfolio with different P, C, S layers.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Badge tone="info" className="bg-white/80 backdrop-blur-sm border-blue-200/50">v1.2</Badge>
            </div>
          </div>
        </header>
      </div>

      <KPIBar
        apiAssets={apiAssets || []}
        tvlData={tvlData}
        volumeData={volumeData}
        loading={loading}
      />

      <LegendBar open={showExplainer} setOpen={setShowExplainer} />
      <Explainer open={showExplainer} setOpen={setShowExplainer} />

      {/* Enhanced Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center gap-6">
          <div className="flex items-center gap-3 flex-1">
            <label className="text-slate-700 text-sm font-medium min-w-[60px]">Sort:</label>
            <select 
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200" 
              value={sort} 
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="trend">Trend</option>
              <option value="pApy">P-APY</option>
              <option value="cApr">C-APR</option>
              <option value="sApyRange">S-APY Median</option>
              <option value="tvl">Highest TVL</option>
              <option value="maturity">Shortest Maturity</option>
            </select>
            
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Search issuer/code/ISIN…" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200" 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-md">⌘K</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-100 rounded-xl p-1">
              <button 
                onClick={() => setView("cards")} 
                className={cx(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200", 
                  view === "cards" 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                Card View
              </button>
              <button 
                onClick={() => setView("table")} 
                className={cx(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200", 
                  view === "table" 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                List View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-600">Loading assets...</span>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-red-200/50 p-8 shadow-sm">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Failed to load assets</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 p-8 shadow-sm">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No assets found</h3>
            <p className="text-slate-600">There are no assets available at the moment.</p>
          </div>
        </div>
      ) : view === "cards" ? (
        <AssetCards
          assets={assets}
          onSwap={(params) => push("swap", params)}
          onBuild={(params) => push("structure", params)}
        />
      ) : (
        <AssetTable
          assets={assets}
          onSwap={(params) => push("swap", params)}
        />
      )}
    </div>
  )
}
