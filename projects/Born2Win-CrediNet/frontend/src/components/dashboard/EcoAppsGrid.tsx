import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { mockEcoApps } from '@/mock/data'
import { ExternalLink } from 'lucide-react'

const EcoAppsGrid = () => {
  const featuredApps = mockEcoApps.filter(app => app.status === 'active').slice(0, 6)

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      defi: '💰',
      talent: '💼',
      insurance: '🛡️',
      social: '👥',
      dao: '🏛️',
      kyc: '🔐'
    }
    return emojiMap[category] || '🌐'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="glass-card"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">生态入口</h2>
        <Link
          to="/marketplace"
          className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          查看全部
          <ExternalLink size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {featuredApps.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + index * 0.05 }}
            className="group relative p-4 rounded-xl bg-dark-card/50 border border-dark-border hover:border-primary-500/50 transition-all duration-300 cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-3xl mb-2">{getCategoryEmoji(app.category)}</div>
            <div className="text-sm font-semibold text-white mb-1 truncate">
              {app.name}
            </div>
            <div className="text-xs text-gray-400 truncate-2">
              {app.description}
            </div>

            {/* Hover效果 */}
            <div className="absolute inset-0 rounded-xl bg-slate-700/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default EcoAppsGrid

