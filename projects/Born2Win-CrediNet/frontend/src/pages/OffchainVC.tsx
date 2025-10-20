import { motion } from 'framer-motion'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { FileText, CheckCircle2, XCircle, ArrowLeft, ExternalLink, Upload, Shield, Award, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Credential {
  id: string
  type: string
  title: string
  issuer: string
  issuedDate: string
  status: 'verified' | 'pending' | 'expired'
  description: string
}

const OffchainVC = () => {
  const navigate = useNavigate()
  const { isConnected } = useAccount()
  const [isUploading, setIsUploading] = useState(false)
  const [credentials, setCredentials] = useState<Credential[]>([
    {
      id: '1',
      type: 'education',
      title: '计算机科学学士学位',
      issuer: 'Stanford University',
      issuedDate: '2021-06',
      status: 'verified',
      description: '计算机科学专业学士学位证书'
    },
    {
      id: '2',
      type: 'certification',
      title: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      issuedDate: '2023-03',
      status: 'verified',
      description: 'AWS解决方案架构师认证'
    },
    {
      id: '3',
      type: 'employment',
      title: '高级软件工程师',
      issuer: 'Tech Corp',
      issuedDate: '2023-01',
      status: 'pending',
      description: '工作经历证明'
    }
  ])

  const handleUpload = async () => {
    setIsUploading(true)
    // 模拟上传过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 添加新凭证
    const newCredential: Credential = {
      id: String(Date.now()),
      type: 'certification',
      title: '区块链开发者认证',
      issuer: 'Blockchain Academy',
      issuedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      description: '区块链技术认证证书'
    }
    
    setCredentials([newCredential, ...credentials])
    setIsUploading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'expired':
        return 'text-red-400 bg-red-500/20 border-red-500/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return '已验证'
      case 'pending':
        return '待验证'
      case 'expired':
        return '已过期'
      default:
        return '未知'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'education':
        return '🎓'
      case 'certification':
        return '📜'
      case 'employment':
        return '💼'
      default:
        return '📄'
    }
  }

  const features = [
    {
      icon: Shield,
      title: '可验证凭证',
      description: '使用 W3C VC 标准，确保凭证的真实性和可验证性'
    },
    {
      icon: Award,
      title: '多类型支持',
      description: '支持教育、职业、技能等多种类型的链下凭证'
    },
    {
      icon: Clock,
      title: '持久化存储',
      description: '凭证安全存储在去中心化网络，永久可访问'
    }
  ]

  const stats = {
    total: credentials.length,
    verified: credentials.filter(c => c.status === 'verified').length,
    pending: credentials.filter(c => c.status === 'pending').length
  }

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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <FileText size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient mb-2">Off-chain VC</h1>
            <p className="text-gray-400 text-lg">
              上传和管理您的链下可验证凭证，构建可信身份
            </p>
          </div>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">总凭证数</div>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <FileText size={24} className="text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">已验证</div>
              <div className="text-3xl font-bold text-emerald-400">{stats.verified}</div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">待验证</div>
              <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
              <Clock size={24} className="text-yellow-400" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 上传凭证 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">上传新凭证</h2>
          {isConnected ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 size={16} />
              <span>钱包已连接</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <XCircle size={16} />
              <span>未连接钱包</span>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">请先连接您的钱包以上传凭证</p>
            <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all duration-300">
              连接钱包
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-dark-border hover:border-indigo-500/50 rounded-xl p-8 text-center transition-all duration-300">
              <Upload size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">点击上传或拖拽文件到此处</p>
              <p className="text-sm text-gray-500">支持 PDF, JSON, 或其他可验证凭证格式</p>
            </div>

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  上传中...
                </span>
              ) : (
                '上传凭证'
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* 我的凭证列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-6">我的凭证</h2>
        <div className="space-y-4">
          {credentials.map((credential, index) => (
            <motion.div
              key={credential.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="p-5 rounded-xl bg-dark-card/50 border border-dark-border hover:border-indigo-500/50 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{getTypeIcon(credential.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{credential.title}</h3>
                      <p className="text-sm text-gray-400">{credential.description}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(credential.status)}`}>
                      {getStatusText(credential.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-3">
                    <div className="flex items-center gap-1">
                      <span>签发方:</span>
                      <span className="text-white">{credential.issuer}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>签发日期:</span>
                      <span className="text-white">{credential.issuedDate}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      查看详情
                    </button>
                    <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                      验证凭证
                    </button>
                    {credential.status === 'verified' && (
                      <button className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                        分享凭证
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 特性介绍 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-6">链下凭证的优势</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-6 rounded-xl bg-dark-card/50 border border-dark-border hover:border-primary-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <feature.icon size={24} className="text-indigo-400" />
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
        <h2 className="text-2xl font-bold text-white mb-4">关于链下可验证凭证</h2>
        <div className="space-y-4 text-gray-300">
          <p>
            链下可验证凭证（Off-chain Verifiable Credentials，简称 VC）是基于 W3C 标准的数字凭证格式。
            与链上数据不同，这些凭证可以包含教育背景、职业经历、专业技能等更丰富的身份信息。
          </p>
          <p>
            通过上传并验证您的链下凭证，CrediNet 可以更全面地评估您的信用状况。
            已验证的凭证将显著提升您在相应维度的信用评分。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
              <div className="flex items-start gap-3">
                <div className="text-indigo-400 mt-1">🎓</div>
                <div>
                  <div className="font-semibold text-indigo-400 mb-1">教育凭证</div>
                  <div className="text-sm text-gray-400">
                    学位证书、专业认证、在线课程完成证明等
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-start gap-3">
                <div className="text-purple-400 mt-1">💼</div>
                <div>
                  <div className="font-semibold text-purple-400 mb-1">职业凭证</div>
                  <div className="text-sm text-gray-400">
                    工作经历证明、项目经验、职业技能认证等
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <a
              href="https://docs.credinet.io/verifiable-credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>了解更多关于可验证凭证</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default OffchainVC

