import { useState, useMemo } from 'react'
import { getAsset, ASSETS } from '../data/mockData'
import AssetMiniCard from '../components/AssetMiniCard'
import SwapTrading from '../components/SwapTrading'
import LiquidityProvider from '../components/LiquidityProvider'
import { buildTokenUniverse } from '../utils/tokenHelpers'
import { cx } from '../utils/helpers'

export default function SwapPage({ params, push }) {
  const asset = getAsset(params.assetId) || ASSETS[0]
  const universe = useMemo(() => buildTokenUniverse(asset), [asset])

  const [activeTab, setActiveTab] = useState('swap')

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8 border border-emerald-200/30">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 to-teal-100/20"></div>
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {activeTab === 'swap' ? 'Swap' : 'Liquidity'}
                </h1>
                <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                  {activeTab === 'swap' 
                    ? `Trade ${asset?.name} P/C/S tokens with stablecoins` 
                    : `Provide liquidity and earn trading fees`
                  }
                  <span className="ml-1 text-[11px] text-slate-500">(Demo pricing)</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <AssetMiniCard a={asset} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-3xl bg-white border border-slate-200 p-1.5 shadow-lg shadow-slate-100/50">
          <button
            onClick={() => setActiveTab('swap')}
            className={cx(
              "px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300",
              activeTab === 'swap'
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 transform scale-105"
                : "text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            )}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Swap
            </div>
          </button>
          <button
            onClick={() => setActiveTab('liquidity')}
            className={cx(
              "px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300",
              activeTab === 'liquidity'
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 transform scale-105"
                : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            )}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Liquidity
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'swap' ? (
        <SwapTrading 
          universe={universe} 
          asset={asset} 
          push={push} 
          params={params} 
        />
      ) : (
        <LiquidityProvider universe={universe} />
      )}
    </div>
  )
}
