import { useState } from 'react'
import { motion } from 'framer-motion'
import { Github, ExternalLink, Grid, List } from 'lucide-react'
import DocViewer from '../components/docs/DocViewer'
import DocNav from '../components/docs/DocNav'
import DocCard from '../components/docs/DocCard'
import { docsConfig, docCategories, getDocsByCategory, type DocItem } from '../config/docs'

const Docs = () => {
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const categories = ['whitepaper', 'integration', 'technical'] as const
  
  const externalLinks = [
    {
      title: 'World ID 官方文档',
      description: 'Worldcoin官方开发者文档',
      icon: <ExternalLink size={24} />,
      link: 'https://docs.worldcoin.org/',
    },
    {
      title: 'Self.Protocol 文档',
      description: 'Self.Protocol SDK和API文档',
      icon: <ExternalLink size={24} />,
      link: 'https://developers.self.xyz/',
    },
    {
      title: 'GitHub 仓库',
      description: '查看源代码和贡献指南',
      icon: <Github size={24} />,
      link: 'https://github.com/your-repo/credinet',
    }
  ]

  const handleDocSelect = (doc: DocItem) => {
    setSelectedDoc(doc)
  }

  const handleBack = () => {
    setSelectedDoc(null)
  }

  // 如果选中了文档，显示文档阅读器视图
  if (selectedDoc) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {/* 左侧导航 */}
        <div className="lg:col-span-1">
          <DocNav
            docs={docsConfig}
            selectedDoc={selectedDoc}
            onSelectDoc={handleDocSelect}
            onBack={handleBack}
            showBackButton={true}
          />
        </div>

        {/* 右侧文档内容 */}
        <div className="lg:col-span-3">
          <DocViewer
            docPath={selectedDoc.path}
            title={selectedDoc.title}
          />
        </div>
      </div>
    )
  }

  // 文档列表视图
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gradient mb-3 italic">Docs</h1>
          <p className="text-gray-400 text-lg">
            探索 CrediNet 的技术文档和资源
          </p>
        </div>

        {/* 视图切换按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            aria-label="网格视图"
            title="网格视图"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-gradient-primary text-white'
                : 'glass-card text-gray-400 hover:text-white'
            }`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="列表视图"
            title="列表视图"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-gradient-primary text-white'
                : 'glass-card text-gray-400 hover:text-white'
            }`}
          >
            <List size={20} />
          </button>
        </div>
      </motion.div>

      {/* 按分类展示文档 */}
      {categories.map((category, categoryIndex) => {
        const categoryDocs = getDocsByCategory(category)
        const categoryInfo = docCategories[category]
        
        if (categoryDocs.length === 0) return null
        
        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: categoryIndex * 0.1 }}
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">{categoryInfo.icon}</span>
              {categoryInfo.label}
              <span className="text-sm text-gray-500 font-normal">
                {categoryInfo.labelEn}
              </span>
            </h2>
            <div className={`grid gap-6 mb-8 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
            }`}>
              {categoryDocs.map((doc, index) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  index={index}
                  onClick={handleDocSelect}
                />
              ))}
            </div>
          </motion.div>
        )
      })}

      {/* 外部资源 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-white mb-4">外部资源</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {externalLinks.map((link, index) => (
            <motion.a
              key={index}
              href={link.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              className="glass-card hover:shadow-glow transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                  {link.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    {link.title}
                    <ExternalLink size={14} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                  </h3>
                  <p className="text-sm text-gray-400">{link.description}</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* 快速开始 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-4">快速开始</h2>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start gap-3">
            <span className="text-cyan-400 font-bold">1.</span>
            <p>阅读 <strong className="text-white">CrediNet 白皮书</strong> 了解项目愿景和技术架构</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-cyan-400 font-bold">2.</span>
            <p>查看 <strong className="text-white">World ID 集成文档</strong> 了解去中心化身份验证</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-cyan-400 font-bold">3.</span>
            <p>阅读 <strong className="text-white">Self.Protocol 集成指南</strong> 了解信用数据聚合</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-cyan-400 font-bold">4.</span>
            <p>访问 <strong className="text-white">GitHub 仓库</strong> 查看源代码和参与贡献</p>
          </div>
        </div>
      </motion.div>

      {/* 技术栈 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="glass-card"
      >
        <h2 className="text-2xl font-bold text-white mb-4">技术栈</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'React', version: '18.3' },
            { name: 'TypeScript', version: '5.6' },
            { name: 'TailwindCSS', version: '3.4' },
            { name: 'Vite', version: '5.4' },
            { name: 'Rust/Axum', version: '0.7' },
            { name: 'Solidity', version: '0.8.24' },
            { name: 'Wagmi', version: '2.12' },
            { name: 'RainbowKit', version: '2.1' }
          ].map((tech, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-dark-card/50 border border-dark-border text-center hover:border-cyan-400/50 transition-colors"
            >
              <div className="text-sm font-semibold text-white">{tech.name}</div>
              <div className="text-xs text-gray-400 mt-1">v{tech.version}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default Docs

