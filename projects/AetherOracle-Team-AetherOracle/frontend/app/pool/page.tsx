'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamic imports to avoid SSR issues
const Navigation = dynamic(() => import('@/components/Navigation'), { ssr: false });
const SwapInterface = dynamic(() => import('@/components/SwapInterface'), { ssr: false });
const LiquidityManager = dynamic(() => import('@/components/LiquidityManager'), { ssr: false });

export default function PoolPage() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'pools' | 'analytics'>('swap');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <Navigation />

      {/* Page Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards - Simplified without duplicate header */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-emerald-600 font-semibold">+12.5%</span>
                </div>
                <div className="text-xs text-slate-600 mb-1">Total Value Locked</div>
                <div className="text-xl font-bold text-slate-900">$2.4M</div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-blue-600 font-semibold">+8.3%</span>
                </div>
                <div className="text-xs text-slate-600 mb-1">24h Volume</div>
                <div className="text-xl font-bold text-slate-900">$485K</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="text-xs text-purple-600 font-semibold">APY</span>
                </div>
                <div className="text-xs text-slate-600 mb-1">Earning Range</div>
                <div className="text-xl font-bold text-slate-900">5.2% - 18.7%</div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7H7v6h6V7z" />
                    <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-amber-600 font-semibold">+4 new</span>
                </div>
                <div className="text-xs text-slate-600 mb-1">Active Pools</div>
                <div className="text-xl font-bold text-slate-900">12</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="flex space-x-1 p-1">
              <button
                onClick={() => setActiveTab('swap')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'swap'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Swap
              </button>
              <button
                onClick={() => setActiveTab('liquidity')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'liquidity'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Liquidity
              </button>
              <button
                onClick={() => setActiveTab('pools')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'pools'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Pools
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'swap' && <SwapInterface />}
            {activeTab === 'liquidity' && <LiquidityManager />}
            {activeTab === 'pools' && <PoolsList />}
            {activeTab === 'analytics' && <PoolAnalytics />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Pools List Component
function PoolsList() {
  const pools = [
    { pair: 'USDC/USDT', tvl: '$1,234,567', volume24h: '$234,567', apy: '5.2%', fee: '0.1%' },
    { pair: 'ETH/USDC', tvl: '$456,789', volume24h: '$123,456', apy: '12.8%', fee: '0.2%' },
    { pair: 'ETH/USDT', tvl: '$345,678', volume24h: '$98,765', apy: '10.5%', fee: '0.2%' },
    { pair: 'WBTC/USDC', tvl: '$234,567', volume24h: '$87,654', apy: '8.9%', fee: '0.2%' },
    { pair: 'DAI/USDC', tvl: '$123,456', volume24h: '$45,678', apy: '3.2%', fee: '0.1%' },
    { pair: 'SOL/USDT', tvl: '$89,012', volume24h: '$23,456', apy: '18.7%', fee: '0.3%' },
  ];

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pool
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TVL
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                24h Volume
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                APY
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fee
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pools.map((pool) => (
              <tr key={pool.pair} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex -space-x-2 mr-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        {pool.pair.split('/')[0][0]}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {pool.pair.split('/')[1][0]}
                      </div>
                    </div>
                    <div className="font-medium text-gray-900">{pool.pair}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pool.tvl}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pool.volume24h}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-green-600">{pool.apy}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {pool.fee}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-blue-600 hover:text-blue-700 font-medium mr-3">
                    Add Liquidity
                  </button>
                  <button className="text-purple-600 hover:text-purple-700 font-medium">
                    Swap
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create New Pool */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Create New Pool</h3>
        <p className="text-slate-600 mb-4">Don't see the pool you need? Create a new one and earn fees from the first trade.</p>
        <button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow">
          Create Pool
        </button>
      </div>
    </div>
  );
}

// Pool Analytics Component
function PoolAnalytics() {
  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVL Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Total Value Locked</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
            Chart Placeholder - TVL Over Time
          </div>
        </div>

        {/* Volume Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Volume</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
            Chart Placeholder - Volume Over Time
          </div>
        </div>

        {/* Fee Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Fee Distribution</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">LP Providers</span>
              <span className="font-semibold">85%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Protocol Treasury</span>
              <span className="font-semibold">10%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Public Goods</span>
              <span className="font-semibold">5%</span>
            </div>
          </div>
        </div>

        {/* MEV Protection Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">MEV Protection</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Protected Transactions</span>
              <span className="font-semibold text-green-600">98.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg. Slippage Saved</span>
              <span className="font-semibold">0.82%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Smart Orders Split</span>
              <span className="font-semibold">24</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Pools (7 Days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">SOL/USDT</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Top APY</span>
            </div>
            <div className="text-2xl font-bold text-green-600">18.7%</div>
            <div className="text-sm text-gray-600">APY</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">ETH/USDC</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Top Volume</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">$1.2M</div>
            <div className="text-sm text-gray-600">24h Volume</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">USDC/USDT</span>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Most Stable</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">0.02%</div>
            <div className="text-sm text-gray-600">Volatility</div>
          </div>
        </div>
      </div>
    </div>
  );
}