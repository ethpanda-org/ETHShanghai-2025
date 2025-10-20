import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Wallet as WalletIcon, CheckCircle2, XCircle, ArrowLeft, ExternalLink, Activity, TrendingUp, Coins, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Wallet = () => {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncComplete, setSyncComplete] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    // 模拟同步过程
    await new Promise(resolve => setTimeout(resolve, 2500))
    setSyncComplete(true)
    setIsSyncing(false)
  }

  useEffect(() => {
    if (isConnected && !syncComplete) {
      // 自动触发同步
      handleSync()
    }
  }, [isConnected])

  // 模拟链上活动数据
  const onchainData = {
    totalTransactions: 1247,
    activeChains: ['Ethereum', 'Polygon', 'Base', 'Arbitrum'],
    defiProtocols: 12,
    nftHoldings: 23,
    totalValue: '$12,450.32'
  }

  // 活动统计
  const activityStats = [
    { label: '总交易次数', value: onchainData.totalTransactions, icon: Activity, color: 'from-blue-500 to-cyan-500' },
    { label: 'DeFi 协议', value: onchainData.defiProtocols, icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
    { label: 'NFT 持有', value: onchainData.nftHoldings, icon: Coins, color: 'from-emerald-500 to-green-500' },
  ]

  const features = [
    {
      icon: Activity,
      title: '交易历史',
      description: '自动分析您的所有链上交易记录'
    },
    {
      icon: TrendingUp,
      title: 'DeFi 参与度',
      description: '评估您在去中心化金融协议中的活跃程度'
    },
    {
      icon: BarChart3,
      title: '资产分析',
      description: '全面分析您的数字资产组合和持仓'
    }
  ]

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span>返回仪表盘</span>
      </motion.button>

      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
            <WalletIcon size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient mb-2">Wallet</h1>
            <p className="text-gray-400 text-lg">
              连接钱包获取链上活动数据，提升信用评分
            </p>
          </div>
        </div>
      </motion.div>

      {/* 连接状态卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">连接状态</h2>
          {isConnected ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={24} />
              <span className="font-semibold">已连接</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <XCircle size={24} />
              <span className="font-semibold">未连接</span>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">请先连接您的钱包以获取链上数据</p>
            <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300">
              连接钱包
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-dark-card/50 border border-dark-border">
              <div className="text-sm text-gray-400 mb-1">钱包地址</div>
              <div className="text-white font-mono text-sm break-all">{address}</div>
            </div>

            {syncComplete ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30"
              >
                <div className="flex items-start gap-4">
                  <CheckCircle2 size={48} className="text-orange-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">同步成功！</h3>
                    <p className="text-gray-300 mb-4">
                      已成功同步您的链上活动数据
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">活跃链</div>
                        <div className="text-white font-semibold">{onchainData.activeChains.length} 条</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">总价值</div>
                        <div className="text-white font-semibold">{onchainData.totalValue}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : isSyncing ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
                  />
                  <p className="text-gray-400">正在同步链上数据...</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSync}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300"
              >
                开始同步链上数据
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* 活动统计 */}
      {syncComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card"
        >
          <h2 className="text-2xl font-bold text-white mb-6">链上活动统计</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activityStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-6 rounded-xl bg-dark-card/50 border border-dark-border"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon size={24} className="text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 活跃链 */}
      {syncComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card"
        >
          <h2 className="text-2xl font-bold text-white mb-6">活跃区块链</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {onchainData.activeChains.map((chain, index) => (
              <motion.div
                key={chain}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="p-4 rounded-xl bg-dark-card/50 border border-dark-border hover:border-orange-500/50 transition-all duration-300 text-center"
              >
                <div className="text-lg font-bold text-white mb-1">{chain}</div>
                <div className="text-xs text-emerald-400">✓ 已连接</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 特性介绍 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-6">钱包连接的优势</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-6 rounded-xl bg-dark-card/50 border border-dark-border hover:border-primary-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center mb-4">
                <feature.icon size={24} className="text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 说明信息 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-4">关于钱包数据接入</h2>
        <div className="space-y-4 text-gray-300">
          <p>
            通过连接您的钱包，CrediNet 可以安全地读取您的链上活动数据，包括交易历史、DeFi 参与度、NFT 持有情况等。
            这些数据将帮助系统更全面地评估您的信用状况。
          </p>
          <p>
            CrediNet 支持多链数据聚合，包括 Ethereum、Polygon、Base、Arbitrum 等主流区块链。
            您的链上行为越活跃，参与的优质协议越多，您的信用评分就会越高。
          </p>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <div className="text-blue-400 mt-1">🔒</div>
              <div>
                <div className="font-semibold text-blue-400 mb-1">隐私保护</div>
                <div className="text-sm text-gray-400">
                  CrediNet 只读取公开的链上数据，不会访问您的私钥或执行任何交易。所有数据处理均符合隐私保护标准。
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <a
              href="https://docs.credinet.io/wallet-integration"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <span>了解更多关于钱包数据接入</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Wallet

