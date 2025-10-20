import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { DocItem, docCategories } from '../../config/docs'

interface DocCardProps {
  doc: DocItem
  index: number
  onClick: (doc: DocItem) => void
}

const DocCard = ({ doc, index, onClick }: DocCardProps) => {
  const categoryInfo = docCategories[doc.category]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="glass-card cursor-pointer group relative overflow-hidden"
      onClick={() => onClick(doc)}
    >
      {/* 背景渐变效果 */}
      <div className={`absolute inset-0 bg-gradient-to-br ${categoryInfo.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

      <div className="relative z-10">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{doc.icon}</div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {categoryInfo.label}
              </div>
              {doc.language && (
                <div className="text-xs text-gray-500">
                  {doc.language === 'zh' && '🇨🇳 中文'}
                  {doc.language === 'en' && '🇬🇧 English'}
                  {doc.language === 'de' && '🇩🇪 Deutsch'}
                </div>
              )}
            </div>
          </div>
          
          {doc.featured && (
            <div className="px-2 py-1 bg-gradient-primary rounded text-xs font-semibold text-white">
              推荐
            </div>
          )}
        </div>

        {/* 标题 */}
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
          {doc.title}
        </h3>

        {/* 描述 */}
        <p className="text-sm text-gray-400 mb-4 line-clamp-3">
          {doc.description}
        </p>

        {/* 底部 */}
        <div className="flex items-center justify-between pt-4 border-t border-dark-border">
          <span className="text-xs text-gray-500">
            点击阅读
          </span>
          <ArrowRight 
            size={16} 
            className="text-cyan-400 transform group-hover:translate-x-1 transition-transform" 
          />
        </div>
      </div>
    </motion.div>
  )
}

export default DocCard

