import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import { mockDataSources, mockDataAuthorizations, mockUsageRecords } from '@/mock/data'
import type { DataSource, DataAuthorization } from '@/types'
import { Database, Shield, TrendingUp, Settings } from 'lucide-react'

const Data = () => {
  const navigate = useNavigate()
  const [dataSources, setDataSources] = useState<DataSource[]>(mockDataSources)
  const [authorizations, setAuthorizations] = useState<DataAuthorization[]>(mockDataAuthorizations)

  const handleToggle = (id: string, checked: boolean) => {
    setDataSources((prev) =>
      prev.map((ds) =>
        ds.id === id ? { ...ds, connected: checked } : ds
      )
    )
  }

  const handleCardClick = (id: string) => {
    if (id === 'worldid') {
      navigate('/worldid')
    } else if (id === 'self') {
      navigate('/selfxyz')
    } else if (id === 'wallet') {
      navigate('/wallet')
    } else if (id === 'offchain') {
      navigate('/offchain-vc')
    }
  }

  const handleRevokeAuth = (appId: string) => {
    setAuthorizations((prev) =>
      prev.map((auth) =>
        auth.appId === appId ? { ...auth, status: 'revoked' as const } : auth
      )
    )
  }

  const handleRestoreAuth = (appId: string) => {
    setAuthorizations((prev) =>
      prev.map((auth) =>
        auth.appId === appId ? { ...auth, status: 'active' as const } : auth
      )
    )
  }

  // const connectedCount = dataSources.filter(ds => ds.connected).length
  const storagePercentage = 63

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold text-gradient mb-3 italic">Data</h1>
        <p className="text-gray-400 text-lg">
          Explore, plug and permission your data sources.
        </p>
      </motion.div>

      {/* 连接方式 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Database size={24} className="text-cyan-400" />
          连接方式
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dataSources.map((source, index) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => handleCardClick(source.id)}
              className="p-5 rounded-xl bg-dark-card/50 border border-dark-border hover:border-primary-500/50 transition-all duration-300 cursor-pointer hover:scale-105"
            >
              <div className="text-center mb-4">
                <div className="text-lg font-semibold text-white mb-2">
                  {source.name}
                </div>
                <div className="text-xs text-gray-400 mb-3 h-8">
                  {source.description}
                </div>
              </div>
              
              <div className="flex justify-center">
                <ToggleSwitch
                  checked={source.connected}
                  onChange={(checked) => handleToggle(source.id, checked)}
                />
              </div>

              {source.connected && source.connectedAt && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-xs text-center text-emerald-400"
                >
                  ✓ 已于 {source.connectedAt.split('T')[0]} 连接
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 我的数据源和数据授权 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 我的数据源 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield size={24} className="text-purple-400" />
            我的数据源
          </h2>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-card/30">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
              <div>
                <div className="text-sm font-semibold text-white">On-chain Activities (EVM)</div>
                <div className="text-xs text-gray-400 mt-1">链上活动数据</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-card/30">
              <div className="w-2 h-2 rounded-full bg-purple-400 mt-2" />
              <div>
                <div className="text-sm font-semibold text-white">Off-chain Credentials (Education)</div>
                <div className="text-xs text-gray-400 mt-1">链下证书（教育）</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-dark-card/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2" />
              <div>
                <div className="text-sm font-semibold text-white">Reputation & C-Score history</div>
                <div className="text-xs text-gray-400 mt-1">信用历史记录</div>
              </div>
            </div>
          </div>

          <div className="border-t border-dark-border/50 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">已加密存储</span>
              <span className="text-sm font-semibold text-emerald-400">{storagePercentage}%</span>
            </div>
            <div className="w-full h-2 bg-dark-card rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${storagePercentage}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        </motion.div>

        {/* 数据授权 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="glass-card"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Settings size={24} className="text-yellow-400" />
            数据授权
          </h2>

          <div className="space-y-4">
            {authorizations.map((auth) => (
              <div
                key={auth.appId}
                className={`p-4 rounded-xl bg-dark-card/50 border ${
                  auth.status === 'active'
                    ? 'border-emerald-500/30'
                    : 'border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">
                      给 {auth.appName} 授权：
                    </div>
                    <div className="text-xs text-gray-400">
                      ✓ {auth.authorizedDimensions.join('、')}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      auth.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {auth.status === 'active' ? '授权中' : '已撤销'}
                  </span>
                </div>

                <div className="mt-2">
                  {auth.status === 'active' ? (
                    <button
                      onClick={() => handleRevokeAuth(auth.appId)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      撤销授权
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRestoreAuth(auth.appId)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      恢复授权
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="mt-4 w-full px-4 py-2 rounded-lg border-2 border-primary-500 text-primary-400 hover:bg-primary-500/10 transition-all duration-300">
            管理所有授权
          </button>
        </motion.div>
      </div>

      {/* 使用与收益记录 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp size={24} className="text-cyan-400" />
          使用与收益记录
        </h2>

        <div className="overflow-x-auto scrollbar-custom">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">应用</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">调取内容</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">用途/范围</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">费用/奖励</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/50">
              {mockUsageRecords.map((record) => (
                <tr key={record.id} className="hover:bg-dark-hover/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400">{record.timestamp}</td>
                  <td className="px-4 py-3 text-sm text-white font-medium">{record.appName}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{record.queryContent}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{record.scope}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400">+ {record.reward} CRN</td>
                  <td className="px-4 py-3 text-center">
                    <button className="text-xs text-cyan-400 hover:text-cyan-300">
                      管理授权
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

export default Data

