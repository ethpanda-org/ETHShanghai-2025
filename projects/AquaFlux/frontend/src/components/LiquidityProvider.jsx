import { useState } from 'react'
import { cx } from '../utils/helpers'
import { displayToken } from '../utils/tokenHelpers'
import TokenSelect from './TokenSelect'

const mockLiquidityPools = [
  {
    id: 1,
    tokenA: 'USDC',
    tokenB: 'REIT1:P',
    tokenAAmount: 50000,
    tokenBAmount: 45000,
    share: 0.15,
    totalValueLocked: 95000,
    apr: 12.5
  },
  {
    id: 2,
    tokenA: 'USDC',
    tokenB: 'REIT1:C',
    tokenAAmount: 25000,
    tokenBAmount: 28000,
    share: 0.08,
    totalValueLocked: 53000,
    apr: 8.3
  },
  {
    id: 3,
    tokenA: 'USDC',
    tokenB: 'REIT1:S',
    tokenAAmount: 15000,
    tokenBAmount: 12000,
    share: 0.12,
    totalValueLocked: 27000,
    apr: 18.7
  }
]

export default function LiquidityProvider({ universe }) {
  const [selectedPoolId, setSelectedPoolId] = useState(null)
  const [newPoolTokenA, setNewPoolTokenA] = useState('USDC')
  const [newPoolTokenB, setNewPoolTokenB] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [approved, setApproved] = useState(false)
  const [pools, setPools] = useState(mockLiquidityPools)

  const selectedPool = pools.find(p => p.id === selectedPoolId)

  const handleRemoveLiquidity = (poolId, percentage) => {
    setPools(prevPools =>
      prevPools.map(pool => {
        if (pool.id === poolId) {
          const newTokenAAmount = pool.tokenAAmount * (1 - percentage / 100)
          const newTokenBAmount = pool.tokenBAmount * (1 - percentage / 100)
          const newShare = pool.share * (1 - percentage / 100)
          return {
            ...pool,
            tokenAAmount: newTokenAAmount,
            tokenBAmount: newTokenBAmount,
            share: newShare,
            totalValueLocked: newTokenAAmount + newTokenBAmount
          }
        }
        return pool
      })
    )
  }

  const handleAddLiquidity = () => {
    if (!newPoolTokenA || !newPoolTokenB || newPoolTokenA === newPoolTokenB || !parseFloat(amountA) || !parseFloat(amountB) || !approved) {
      return
    }

    const newPool = {
      id: pools.length + 1,
      tokenA: newPoolTokenA,
      tokenB: newPoolTokenB,
      tokenAAmount: parseFloat(amountA),
      tokenBAmount: parseFloat(amountB),
      share: 0.05,
      totalValueLocked: parseFloat(amountA) + parseFloat(amountB),
      apr: 10.5
    }
    setPools(prevPools => [...prevPools, newPool])
    
    // 重置表单
    setAmountA('')
    setAmountB('')
    setApproved(false)
    setNewPoolTokenB('')
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl border border-blue-200/50 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Add New Pool</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Token A</label>
                <TokenSelect 
                  value={newPoolTokenA} 
                  onChange={setNewPoolTokenA} 
                  universe={universe}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Token B</label>
                <TokenSelect 
                  value={newPoolTokenB} 
                  onChange={setNewPoolTokenB} 
                  universe={universe}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {displayToken(newPoolTokenA)} Amount
                </label>
                <input
                  type="number"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {displayToken(newPoolTokenB)} Amount
                </label>
                <input
                  type="number"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-300"
                />
              </div>
            </div>

            {(newPoolTokenA && newPoolTokenB && newPoolTokenA !== newPoolTokenB && (parseFloat(amountA) > 0 || parseFloat(amountB) > 0)) && (
              <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 mb-4">
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Price Ratio</span>
                    <span className="font-medium">1 {displayToken(newPoolTokenA)} ≈ 0.9 {displayToken(newPoolTokenB)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pool Share</span>
                    <span className="font-medium">0.02%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {!approved && (newPoolTokenA && newPoolTokenB && parseFloat(amountA) > 0 && parseFloat(amountB) > 0) && (
                <button
                  onClick={() => setApproved(true)}
                  className="w-full px-6 py-3 rounded-2xl border border-slate-300 hover:border-emerald-400 text-sm font-medium hover:bg-emerald-50 transition-all duration-300"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve Tokens
                  </div>
                </button>
              )}
              
              <button
                onClick={handleAddLiquidity}
                disabled={!newPoolTokenA || !newPoolTokenB || newPoolTokenA === newPoolTokenB || !parseFloat(amountA) || !parseFloat(amountB) || !approved}
                className={cx(
                  "w-full px-6 py-3 rounded-2xl text-base font-semibold transition-all duration-300",
                  (!newPoolTokenA || !newPoolTokenB || newPoolTokenA === newPoolTokenB || !parseFloat(amountA) || !parseFloat(amountB) || !approved)
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-emerald-300 transform hover:scale-105"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Liquidity
                </div>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl border border-violet-200/50 p-6 shadow-lg">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Your Liquidity Positions</h2>
            
            {pools.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-slate-500">No liquidity positions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pools.map((pool) => (
                  <div
                    key={pool.id}
                    className={cx(
                      "bg-white rounded-2xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md",
                      selectedPoolId === pool.id ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200"
                    )}
                    onClick={() => setSelectedPoolId(selectedPoolId === pool.id ? null : pool.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            {displayToken(pool.tokenA).charAt(0)}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                            {displayToken(pool.tokenB).charAt(0)}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">
                            {displayToken(pool.tokenA)} / {displayToken(pool.tokenB)}
                          </div>
                          <div className="text-sm text-slate-500">
                            Pool Share: {(pool.share * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          ${pool.totalValueLocked.toLocaleString()}
                        </div>
                        <div className="text-sm text-emerald-600 font-medium">
                          {pool.apr.toFixed(1)}% APR
                        </div>
                      </div>
                    </div>

                    {selectedPoolId === pool.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="text-xs text-slate-500 mb-1">Your {displayToken(pool.tokenA)}</div>
                            <div className="font-semibold">{pool.tokenAAmount.toLocaleString()}</div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="text-xs text-slate-500 mb-1">Your {displayToken(pool.tokenB)}</div>
                            <div className="font-semibold">{pool.tokenBAmount.toLocaleString()}</div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveLiquidity(pool.id, 25)
                            }}
                            className="px-3 py-1.5 rounded-xl border border-amber-300 hover:bg-amber-50 text-xs font-medium transition-all duration-200"
                          >
                            Remove 25%
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveLiquidity(pool.id, 50)
                            }}
                            className="px-3 py-1.5 rounded-xl border border-amber-300 hover:bg-amber-50 text-xs font-medium transition-all duration-200"
                          >
                            Remove 50%
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveLiquidity(pool.id, 100)
                            }}
                            className="px-3 py-1.5 rounded-xl border border-red-300 hover:bg-red-50 text-xs font-medium transition-all duration-200"
                          >
                            Remove All
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-emerald-200/50 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Total Portfolio</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Value Locked</span>
                <span className="font-bold text-slate-800">
                  ${pools.reduce((sum, pool) => sum + pool.totalValueLocked, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Active Pools</span>
                <span className="font-bold text-slate-800">{pools.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Avg APR</span>
                <span className="font-bold text-emerald-600">
                  {pools.length > 0 ? (pools.reduce((sum, pool) => sum + pool.apr, 0) / pools.length).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-200/50 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Liquidity Tips</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>• Add liquidity to earn trading fees from swaps</p>
              <p>• Higher APR pools usually have more price volatility</p>
              <p>• Monitor impermanent loss on volatile pairs</p>
              <p>• Diversify across multiple pools for better risk management</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}