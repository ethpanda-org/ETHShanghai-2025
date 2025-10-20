import { motion } from 'framer-motion'
import { useState } from 'react'
import { mockEcoApps, appCategories } from '@/mock/data'
import { Search, ExternalLink } from 'lucide-react'

const Marketplace = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredApps = mockEcoApps.filter((app) => {
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      all: '🌐',
      defi: '💰',
      talent: '💼',
      insurance: '🛡️',
      social: '👥',
      dao: '🏛️',
      kyc: '🔐'
    }
    return emojiMap[category] || '🌐'
  }

  const handleUseApp = (appName: string) => {
    alert(`授权 ${appName} 的弹窗（待实现）`)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold text-gradient mb-3 italic">Marketplace</h1>
        <p className="text-gray-400 text-lg">
          Discover data apps & services powered by your credentials.
        </p>
      </motion.div>

      {/* 分类和搜索栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 分类Tab */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {appCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-primary text-white shadow-glow'
                    : 'bg-dark-card text-gray-400 hover:text-gray-200 hover:bg-dark-hover'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search marketplace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-dark-card border border-dark-border text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
            />
          </div>
        </div>
      </motion.div>

      {/* 应用网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
            className="group glass-card hover:shadow-glow transition-all duration-300"
          >
            {/* 应用图标 */}
            <div className="flex items-center justify-between mb-5">
              <div className="w-16 h-16 rounded-xl bg-slate-700 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                {getCategoryEmoji(app.category)}
              </div>
              {app.status === 'coming-soon' && (
                <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold">
                  即将推出
                </span>
              )}
            </div>

            {/* 应用信息 */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                {app.name}
                {app.status === 'active' && (
                  <ExternalLink size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                )}
              </h3>
              <p className="text-sm text-gray-400 mb-3">{app.description}</p>

              {/* 需要授权的维度 */}
              <div className="flex flex-wrap gap-2">
                {app.requiredDimensions.map((dim, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded bg-dark-card text-xs text-gray-300 border border-dark-border"
                  >
                    • {dim}
                  </span>
                ))}
              </div>
            </div>

            {/* 立即使用按钮 */}
            <button
              onClick={() => handleUseApp(app.name)}
              disabled={app.status === 'coming-soon'}
              className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                app.status === 'active'
                  ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {app.status === 'active' ? '立即使用' : '即将推出'}
            </button>

            {/* Hover效果 */}
            <div className="absolute inset-0 rounded-2xl bg-slate-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>
        ))}
      </div>

      {/* 无结果提示 */}
      {filteredApps.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card text-center py-12"
        >
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">未找到应用</h3>
          <p className="text-gray-400">请尝试其他搜索词或选择不同的分类</p>
        </motion.div>
      )}
    </div>
  )
}

export default Marketplace

