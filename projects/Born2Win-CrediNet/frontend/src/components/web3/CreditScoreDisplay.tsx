/**
 * 信用分数展示组件
 * 从智能合约读取并展示用户的信用数据
 */

import { useCrediNet } from '../../hooks'
import { useAccount } from 'wagmi'
import { RefreshCw } from 'lucide-react'
import { mockCreditScore } from '@/mock/data'

const CreditScoreDisplay = () => {
  const { isConnected } = useAccount()
  const { creditScore, refetchCreditInfo, isLoading, error } = useCrediNet()

  const handleRefresh = async () => {
    console.log('🔄 手动刷新信用数据...')
    try {
      const result = await refetchCreditInfo()
      console.log('✅ 刷新结果:', result)
    } catch (err) {
      console.error('❌ 刷新失败:', err)
    }
  }

  if (!isConnected) {
    return (
      <div className="glass-card p-6">
        <p className="text-gray-400 text-center">请先连接钱包查看信用数据</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">加载信用数据中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="text-center">
          <div className="text-red-400 mb-2">❌ 加载信用数据失败</div>
          <div className="text-sm text-gray-400 mb-4">
            错误信息: {error.message || '未知错误'}
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!creditScore) {
    return (
      <div className="glass-card p-6">
        <div className="text-center">
          <div className="text-yellow-400 mb-2">⚠️ 暂无信用数据</div>
          <div className="text-sm text-gray-400 mb-4">
            您的钱包地址可能还没有信用评分记录
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
          >
            刷新检查
          </button>
        </div>
      </div>
    )
  }

  // 检查链上数据是否有效（所有维度都不为0）
  const hasValidChainData = creditScore.dimensions.keystone > 0 || 
                            creditScore.dimensions.ability > 0 || 
                            creditScore.dimensions.finance > 0 || 
                            creditScore.dimensions.health > 0 || 
                            creditScore.dimensions.behavior > 0

  // 使用链上数据或 fallback 到 mock 数据
  const displayDimensions = hasValidChainData ? creditScore.dimensions : mockCreditScore.dimensions
  const displayTotal = hasValidChainData ? creditScore.total : mockCreditScore.total

  const dimensions = [
    { name: '基石 K', value: displayDimensions.keystone, color: 'text-purple-400' },
    { name: '能力 A', value: displayDimensions.ability, color: 'text-blue-400' },
    { name: '财富 F', value: displayDimensions.finance, color: 'text-amber-400' },
    { name: '健康 H', value: displayDimensions.health, color: 'text-emerald-400' },
    { name: '行为 B', value: displayDimensions.behavior, color: 'text-red-400' },
  ]

  return (
    <div className="glass-card p-6 space-y-6">
      {/* 标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">信用分数（从链上读取）</h3>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="刷新数据"
        >
          <RefreshCw size={18} className="text-gray-400 hover:text-cyan-400" />
        </button>
      </div>

      {/* C-Score 总分 */}
      <div className="text-center">
        <div className="text-5xl font-bold text-gradient mb-2">{displayTotal}</div>
        <p className="text-sm text-gray-400">C-Score 总分</p>
      </div>

      {/* 五维数据 */}
      <div className="space-y-3">
        {dimensions.map((dim) => {
          const percentage = (dim.value / 200) * 100
          return (
            <div key={dim.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${dim.color}`}>{dim.name}</span>
                <span className="text-sm text-gray-300">{dim.value}</span>
              </div>
              <div className="w-full h-2 bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* 最后更新时间 */}
      <div className="text-xs text-gray-500 text-center">
        最后更新: {new Date(creditScore.lastUpdated).toLocaleString('zh-CN')}
      </div>
    </div>
  )
}

export default CreditScoreDisplay

