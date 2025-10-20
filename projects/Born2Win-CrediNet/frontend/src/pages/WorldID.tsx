import { motion } from 'framer-motion'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Globe, CheckCircle2, XCircle, ArrowLeft, ExternalLink, Shield, Users, Fingerprint } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const WorldID = () => {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const [isVerified, setIsVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async () => {
    setIsVerifying(true)
    // 模拟验证过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsVerified(true)
    setIsVerifying(false)
  }

  const features = [
    {
      icon: Shield,
      title: '隐私保护',
      description: '使用零知识证明技术，保护您的身份隐私'
    },
    {
      icon: Users,
      title: '人格证明',
      description: '确保每个账户背后都是真实的人类用户'
    },
    {
      icon: Fingerprint,
      title: '唯一身份',
      description: '防止女巫攻击，确保身份的唯一性'
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Globe size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient mb-2">World ID</h1>
            <p className="text-gray-400 text-lg">
              通过 World ID 验证您的人类身份，提升信用评分
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
          {isVerified ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={24} />
              <span className="font-semibold">已验证</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <XCircle size={24} />
              <span className="font-semibold">未验证</span>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">请先连接您的钱包</p>
            <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all duration-300">
              连接钱包
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-dark-card/50 border border-dark-border">
              <div className="text-sm text-gray-400 mb-1">钱包地址</div>
              <div className="text-white font-mono text-sm break-all">{address}</div>
            </div>

            {isVerified ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30"
              >
                <div className="flex items-start gap-4">
                  <CheckCircle2 size={48} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">验证成功！</h3>
                    <p className="text-gray-300 mb-4">
                      您已成功通过 World ID 验证
                    </p>
                    <div className="text-gray-400 text-sm">
                      验证时间: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    验证中...
                  </span>
                ) : (
                  '开始 World ID 验证'
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* 特性介绍 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-6">为什么选择 World ID？</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="p-6 rounded-xl bg-dark-card/50 border border-dark-border hover:border-primary-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <feature.icon size={24} className="text-cyan-400" />
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
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-4">关于 World ID</h2>
        <div className="space-y-4 text-gray-300">
          <p>
            World ID 是由 Worldcoin 项目提供的去中心化人格证明协议。通过先进的生物识别技术和零知识证明，
            World ID 能够在保护隐私的前提下验证用户的真实人类身份。
          </p>
          <p>
            在 CrediNet 中集成 World ID 验证后，您的信用评分将获得显著提升。这是因为人格证明是建立可信身份的重要基础。
          </p>
          <div className="pt-4">
            <a
              href="https://worldcoin.org/world-id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>了解更多关于 World ID</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default WorldID

