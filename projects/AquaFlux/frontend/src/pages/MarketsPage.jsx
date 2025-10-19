import { useState, useEffect } from 'react'
import { ASSETS, GOALS } from '../data/mockData'
import { useSortedFiltered } from '../hooks/useSortedFiltered'
import Badge from '../components/Badge'
import KPI from '../components/KPI'
import AssetCards from '../components/AssetCards'
import AssetTable from '../components/AssetTable'
import { cx } from '../utils/helpers'
import { assetsApi } from '../api'

function KPIBar({ apiAssets }) {
  // 计算资产数量
  const activeMarketsCount = apiAssets ? apiAssets.length : 0
  
  // 计算TVL总和并格式化
  const totalTVL = apiAssets ? 
    apiAssets.reduce((sum, asset) => sum + (asset.tvl || 0), 0) : 0
  const formattedTVL = totalTVL >= 1 ? `$${totalTVL.toFixed(1)}m` : `$${(totalTVL * 1000).toFixed(0)}k`
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 border border-blue-200/50">
          <KPI label="TVL" value={formattedTVL} trend="up" trendValue="+2.3%" />
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl p-4 border border-emerald-200/50">
          <KPI label="24h Volume" value="$4.5m" trend="up" trendValue="+12.5%" />
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-4 border border-purple-200/50">
          <KPI label="Active Markets" value={activeMarketsCount.toString()} trend="up" trendValue="+2" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-slate-700">Network: Pharos</span>
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const assets = useSortedFiltered(
    Array.isArray(apiAssets) ? apiAssets : [], 
    { sort, search, goal }
  )

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await assetsApi.getAll()
        const rawAssets = response.data?.assets || []
        
        // 数据验证和转换
        const validatedAssets = rawAssets.map(asset => ({
          ...asset,
          sApyRange: Array.isArray(asset.sApyRange) ? asset.sApyRange : [0, 0],
          pApy: Number(asset.pApy) || 0,
          cApr: Number(asset.cApr) || 0,
          tvl: Number(asset.tvl) || 0,
          vol24h: Number(asset.vol24h) || 0
        }))
        
        setApiAssets(validatedAssets)
      } catch (err) {
        setError(err.message)
        console.error('Failed to fetch assets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [])

  useEffect(() => {
    if (apiAssets) {
      console.log('apiAssets更新了:', apiAssets)
    }
  }, [apiAssets])

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

      <KPIBar apiAssets={apiAssets} />

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
      {view === "cards" ? (
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
