import { motion } from 'framer-motion'
import { FileText, ArrowLeft } from 'lucide-react'
import { DocItem, docCategories } from '../../config/docs'

interface DocNavProps {
  docs: DocItem[]
  selectedDoc: DocItem | null
  onSelectDoc: (doc: DocItem) => void
  onBack: () => void
  showBackButton?: boolean
}

const DocNav = ({ docs, selectedDoc, onSelectDoc, onBack, showBackButton = false }: DocNavProps) => {
  // 按分类分组文档
  const groupedDocs = docs.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = []
    }
    acc[doc.category].push(doc)
    return acc
  }, {} as Record<string, DocItem[]>)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card h-full"
    >
      <div className="p-4 border-b border-dark-border">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText size={20} className="text-cyan-400" />
          文档导航
        </h2>
      </div>

      {showBackButton && (
        <button
          onClick={onBack}
          className="w-full p-4 flex items-center gap-2 text-gray-400 hover:text-white hover:bg-dark-card/50 transition-colors border-b border-dark-border"
        >
          <ArrowLeft size={16} />
          <span>返回文档列表</span>
        </button>
      )}

      <div className="p-2 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {Object.entries(groupedDocs).map(([category, categoryDocs]) => {
          const categoryInfo = docCategories[category as keyof typeof docCategories]
          
          return (
            <div key={category}>
              <div className="px-3 py-2 flex items-center gap-2">
                <span className="text-xl">{categoryInfo.icon}</span>
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  {categoryInfo.label}
                </span>
              </div>
              
              <div className="space-y-1">
                {categoryDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onSelectDoc(doc)}
                    className={`
                      w-full text-left p-3 rounded-lg transition-all duration-200
                      ${selectedDoc?.id === doc.id
                        ? 'bg-gradient-to-r ' + categoryInfo.color + ' text-white shadow-lg'
                        : 'hover:bg-dark-card/50 text-gray-300 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl mt-0.5">{doc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {doc.title}
                        </div>
                        {doc.language && (
                          <div className="text-xs opacity-75 mt-1">
                            {doc.language === 'zh' && '🇨🇳 中文'}
                            {doc.language === 'en' && '🇬🇧 English'}
                            {doc.language === 'de' && '🇩🇪 Deutsch'}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 统计信息 */}
      <div className="p-4 border-t border-dark-border mt-auto">
        <div className="text-xs text-gray-500">
          共 {docs.length} 篇文档
        </div>
      </div>
    </motion.div>
  )
}

export default DocNav

