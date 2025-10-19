import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { assetsApi } from '../api'
import { cx } from '../utils/helpers'
import SplitMerge from '../components/structure/SplitMerge'
import WrapUnwrap from '../components/structure/WrapUnwrap'


export default function StructurePage({ params, push }) {
  const [tab, setTab] = useState(params.tab || "split-merge")
  const [assets, setAssets] = useState([])
  const [assetId, setAssetId] = useState(params.assetId || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 获取选中的asset
  const asset = assets.find(a => (a.assetId || a.id) === assetId) || assets[0]

  // 获取assets数据
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await assetsApi.getAll({
          page: 1,
          limit: 100,
          isActive: true
        })

        if (response.status === 'success' && response.data) {
          const assetsList = response.data.assets || []
          setAssets(assetsList)

          // 如果没有预设的assetId，设置为第一个asset
          if (!params.assetId && assetsList.length > 0) {
            setAssetId(assetsList[0].assetId || assetsList[0].id)
          }
        } else {
          throw new Error(response.message || 'Failed to fetch assets')
        }
      } catch (err) {
        setError(err.message)
        console.error('Failed to fetch assets:', err)
        setAssets([])
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [])

  return (
    <>
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Simplified Header with Core Equation */}
      <motion.div 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-8 border border-violet-200/30"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100/20 to-purple-100/20"></div>
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div 
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </motion.div>
              <motion.h1 
                className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Structure (P·C·S)
              </motion.h1>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center gap-4">
                <motion.div 
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-gray-800 text-white shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </motion.div>
                <div>
                  <motion.h3 
                    className="text-lg font-bold text-slate-700 mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Core Equation
                  </motion.h3>
                  <motion.div 
                    className="bg-white rounded-2xl border border-slate-200 px-6 py-3 shadow-lg"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                  >
                    <div className="text-xl font-bold text-slate-800 font-mono tracking-wide">
                      <motion.span 
                        className="text-emerald-600"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        1P
                      </motion.span> + <motion.span 
                        className="text-blue-600"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        1C
                      </motion.span> + <motion.span 
                        className="text-amber-600"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        1S
                      </motion.span> = <motion.span 
                        className="text-purple-600"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        1 RWA
                      </motion.span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Tab Section */}
      <motion.div 
        className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-xl shadow-slate-200/20 p-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex gap-3">
            <button 
              className={cx(
                "px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 shadow-sm", 
                tab === "split-merge" 
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-violet-200 shadow-lg transform scale-105" 
                  : "bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:shadow-md"
              )} 
              onClick={() => setTab("split-merge")}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Split/Merge
              </div>
            </button>
            <button 
              className={cx(
                "px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 shadow-sm", 
                tab === "wrap-unwrap" 
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-violet-200 shadow-lg transform scale-105" 
                  : "bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:shadow-md"
              )} 
              onClick={() => setTab("wrap-unwrap")}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Wrap/Unwrap
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Select Asset</span>
            <div className="relative">
              {loading ? (
                <div className="appearance-none bg-white rounded-2xl border border-slate-200 px-4 py-2.5 pr-10 text-sm font-medium text-slate-400 shadow-sm">
                  Loading assets...
                </div>
              ) : error ? (
                <div className="appearance-none bg-red-50 rounded-2xl border border-red-200 px-4 py-2.5 pr-10 text-sm font-medium text-red-600 shadow-sm">
                  Error loading assets
                </div>
              ) : (
                <>
                  <select
                    value={assetId || ''}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="appearance-none bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    disabled={assets.length === 0}
                  >
                    {assets.length === 0 ? (
                      <option value="">No assets available</option>
                    ) : (
                      assets.map(a => (
                        <option key={a.assetId || a.id} value={a.assetId || a.id}>{a.name}</option>
                      ))
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <motion.div
            className="py-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-600">Loading assets...</span>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            className="py-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Failed to load assets</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        ) : !asset ? (
          <motion.div
            className="py-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No asset selected</h3>
            <p className="text-slate-600">Please select an asset from the dropdown above.</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "split-merge" ? (
              <motion.div
                key="split-merge"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <SplitMerge asset={asset} push={push} />
              </motion.div>
            ) : (
              <motion.div
                key="wrap-unwrap"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <WrapUnwrap asset={asset} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>


    </motion.div>
    </>
  )
}
