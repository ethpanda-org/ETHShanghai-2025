import { motion } from 'framer-motion'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Wallet, CheckCircle2, XCircle, ArrowLeft, ExternalLink, Database, Key, Link as LinkIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SelfXyz = () => {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const [isConnected_self, setIsConnected_self] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    // 模拟连接过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsConnected_self(true)
    setIsConnecting(false)
  }

  const handleDisconnect = () => {
    setIsConnected_self(false)
  }

  const dataTypes = [
    {
      name: '社交媒体',
      items: ['Twitter', 'Discord', 'Telegram', 'LinkedIn'],
      icon: '🐦',
      connected: isConnected_self ? 3 : 0
    },
    {
      name: '专业认证',
      items: ['GitHub', 'GitLab', 'Stack Overflow', 'Kaggle'],
      icon: '💼',
      connected: isConnected_self ? 2 : 0
    },
    {
      name: '教育背景',
      items: ['学位证书', '专业证书', '在线课程', '学术成就'],
      icon: '🎓',
      connected: isConnected_self ? 1 : 0
    }
  ]

  const features = [
    {
      icon: Database,
      title: '聚合身份数据',
      description: '将您的多个身份和凭证聚合到一个地方'
    },
    {
      icon: Key,
      title: '自主控制',
      description: '您完全掌控自己的数据，随时可以撤销授权'
    },
    {
      icon: LinkIcon,
      title: '跨平台互通',
      description: '在不同平台间无缝使用您的身份凭证'
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Wallet size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient mb-2">self.xyz</h1>
            <p className="text-gray-400 text-lg">
              聚合您的多维度身份数据，构建全面的信用档案
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
          {isConnected_self ? (
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
            <p className="text-gray-400 mb-4">请先连接您的钱包</p>
            <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all duration-300">
              连接钱包
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-dark-card/50 border border-dark-border">
              <div className="text-sm text-gray-400 mb-1">钱包地址</div>
              <div className="text-white font-mono text-sm break-all">{address}</div>
            </div>

            {isConnected_self ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 size={48} className="text-purple-400 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">连接成功！</h3>
                      <p className="text-gray-300 mb-4">
                        您已成功连接 self.xyz，正在同步您的身份数据
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-purple-400">
                          <span className="font-semibold">6</span> 项数据已同步
                        </div>
                        <div className="text-gray-400">
                          连接时间: {new Date().toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  断开连接
                </button>
              </motion.div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    连接中...
                  </span>
                ) : (
                  '连接 self.xyz'
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* 数据类型 */}
      {isConnected_self && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card"
        >
          <h2 className="text-2xl font-bold text-white mb-6">已同步的数据</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dataTypes.map((type, index) => (
              <motion.div
                key={type.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-5 rounded-xl bg-dark-card/50 border border-dark-border hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{type.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{type.name}</h3>
                    <p className="text-sm text-gray-400">
                      {type.connected}/{type.items.length} 已连接
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {type.items.slice(0, type.connected).map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                  {type.items.slice(type.connected).map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                      <span className="text-gray-500">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 特性介绍 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-6">为什么选择 self.xyz？</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="p-6 rounded-xl bg-dark-card/50 border border-dark-border hover:border-primary-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <feature.icon size={24} className="text-purple-400" />
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
        transition={{ duration: 0.4, delay: 0.4 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-4">关于 self.xyz</h2>
        <div className="space-y-4 text-gray-300">
          <p>
            self.xyz 是一个去中心化的身份聚合平台，帮助用户将分散在各个平台的身份和凭证聚合到一起。
            通过 self.xyz，您可以更好地管理和展示您的数字身份。
          </p>
          <p>
            在 CrediNet 中集成 self.xyz 后，系统将自动从您的各类社交媒体、专业平台和教育机构获取相关数据，
            全面评估您的信用状况，让信用评分更加准确和全面。
          </p>
          <div className="pt-4">
            <a
              href="https://self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span>了解更多关于 self.xyz</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SelfXyz

