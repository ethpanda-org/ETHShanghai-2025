// 文档配置文件
export interface DocItem {
  id: string
  title: string
  titleEn?: string
  description: string
  category: 'whitepaper' | 'integration' | 'technical'
  language: 'zh' | 'en' | 'de'
  path: string
  icon?: string
  featured?: boolean
}

export const docsConfig: DocItem[] = [
  // 白皮书类
  {
    id: 'whitepaper-cn',
    title: 'CrediNet 白皮书（中文版）',
    titleEn: 'CrediNet Whitepaper (Chinese)',
    description: '了解CrediNet的核心理念、技术架构和经济模型',
    category: 'whitepaper',
    language: 'zh',
    path: '/docs/credinet-whitepaper-cn.md',
    icon: '📄',
    featured: true
  },
  {
    id: 'whitepaper-en',
    title: 'CrediNet: Decentralized Trust Network',
    titleEn: 'CrediNet Whitepaper (English)',
    description: 'Learn about CrediNet\'s core concepts, technical architecture, and economic model',
    category: 'whitepaper',
    language: 'en',
    path: '/docs/credinet-whitepaper-en.md',
    icon: '📄',
    featured: true
  },
  {
    id: 'whitepaper-de',
    title: 'CrediNet: Dezentrales Kreditnetzwerk',
    titleEn: 'CrediNet Whitepaper (German)',
    description: 'Erfahren Sie mehr über CrediNets Kernkonzepte, technische Architektur und Wirtschaftsmodell',
    category: 'whitepaper',
    language: 'de',
    path: '/docs/credinet-whitepaper-de.md',
    icon: '📄',
    featured: true
  },
  
  // 集成文档
  {
    id: 'worldid-integration',
    title: 'CrediNet × World ID 集成说明书',
    titleEn: 'CrediNet × World ID Integration Guide',
    description: '基于World ID的去中心化身份验证集成指南',
    category: 'integration',
    language: 'zh',
    path: '/docs/worldid-integration.md',
    icon: '🌍',
    featured: true
  },
  {
    id: 'self-protocol-integration',
    title: 'CrediNet × Self.Protocol 集成介绍',
    titleEn: 'CrediNet × Self.Protocol Integration',
    description: '基于Self.Protocol的链上身份和信用数据集成',
    category: 'integration',
    language: 'zh',
    path: '/docs/self-protocol-integration.md',
    icon: '🔗',
    featured: true
  },
  
  // 技术文档
  {
    id: 'api-docs',
    title: 'API 文档',
    titleEn: 'API Documentation',
    description: 'CrediNet API 接口文档和使用指南',
    category: 'technical',
    language: 'zh',
    path: '/backend-docs',
    icon: '🔧',
    featured: false
  }
]

export const docCategories = {
  whitepaper: {
    label: '白皮书',
    labelEn: 'Whitepapers',
    icon: '📚',
    color: 'from-blue-500 to-cyan-500'
  },
  integration: {
    label: '集成文档',
    labelEn: 'Integration Guides',
    icon: '🔌',
    color: 'from-purple-500 to-pink-500'
  },
  technical: {
    label: '技术文档',
    labelEn: 'Technical Docs',
    icon: '⚙️',
    color: 'from-green-500 to-teal-500'
  }
}

export function getDocsByCategory(category: string) {
  return docsConfig.filter(doc => doc.category === category)
}

export function getFeaturedDocs() {
  return docsConfig.filter(doc => doc.featured)
}

export function getDocById(id: string) {
  return docsConfig.find(doc => doc.id === id)
}

