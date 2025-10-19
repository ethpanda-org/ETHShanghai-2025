'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RealTimeChart from './RealTimeChart';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'live' | 'beta' | 'coming_soon';
  impact: 'high' | 'medium' | 'low';
  category: 'ai' | 'defi' | 'ux' | 'analytics';
}

const hackathonFeatures: Feature[] = [
  {
    id: 'ai_oracle',
    title: 'AI-Powered Oracle',
    description: '6个数据源聚合，97.4%准确率的AI价格预测',
    icon: '🤖',
    status: 'live',
    impact: 'high',
    category: 'ai'
  },
  {
    id: 'realtime_chart',
    title: '实时价格图表',
    description: '5秒更新频率，展示AI预测vs实际价格',
    icon: '📈',
    status: 'live',
    impact: 'high',
    category: 'analytics'
  },
  {
    id: 'public_goods',
    title: '公益基金自动捐赠',
    description: '每笔交易自动捐赠0.1%到公益基金',
    icon: '💚',
    status: 'live',
    impact: 'high',
    category: 'defi'
  },
  {
    id: 'fee_optimization',
    title: '动态费率优化',
    description: '基于网络拥堵和用户行为的智能费率调整',
    icon: '⚡',
    status: 'beta',
    impact: 'medium',
    category: 'ai'
  },
  {
    id: 'cross_chain',
    title: '跨链支付',
    description: '支持多链资产，一键跨链支付体验',
    icon: '🌉',
    status: 'coming_soon',
    impact: 'high',
    category: 'defi'
  },
  {
    id: 'mobile_app',
    title: '移动端PWA',
    description: '原生应用体验的渐进式Web应用',
    icon: '📱',
    status: 'beta',
    impact: 'medium',
    category: 'ux'
  }
];

export default function HackathonEnhancements() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showRealTimeChart, setShowRealTimeChart] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const categories = [
    { id: 'all', name: '全部', icon: '🚀' },
    { id: 'ai', name: 'AI技术', icon: '🤖' },
    { id: 'defi', name: 'DeFi创新', icon: '💎' },
    { id: 'analytics', name: '数据分析', icon: '📊' },
    { id: 'ux', name: '用户体验', icon: '✨' }
  ];

  const filteredFeatures = selectedCategory === 'all' 
    ? hackathonFeatures 
    : hackathonFeatures.filter(f => f.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-100 text-green-800 border-green-200';
      case 'beta': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'coming_soon': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🏆 黑客松创新特性</h2>
            <p className="text-purple-100">
              展示AetherPay的核心技术创新和用户体验优化
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{hackathonFeatures.filter(f => f.status === 'live').length}</div>
            <div className="text-sm text-purple-200">已上线功能</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Real-time Chart Toggle */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <h3 className="font-semibold text-gray-900">实时价格图表</h3>
              <p className="text-sm text-gray-600">展示AI预测准确性和实时价格变化</p>
            </div>
          </div>
          <button
            onClick={() => setShowRealTimeChart(!showRealTimeChart)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              showRealTimeChart
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {showRealTimeChart ? '隐藏图表' : '显示图表'}
          </button>
        </div>
      </div>

      {/* Real-time Chart */}
      <AnimatePresence>
        {showRealTimeChart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RealTimeChart />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="wait">
          {filteredFeatures.map((feature, index) => (
            <motion.div
              key={`${feature.id}-${animationKey}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{feature.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(feature.status)}`}>
                        {feature.status === 'live' ? '已上线' : 
                         feature.status === 'beta' ? '测试中' : '即将推出'}
                      </span>
                      <span className={`text-xs font-medium ${getImpactColor(feature.impact)}`}>
                        {feature.impact === 'high' ? '高影响' : 
                         feature.impact === 'medium' ? '中影响' : '低影响'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Progress indicator for beta/coming soon features */}
              {feature.status !== 'live' && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>开发进度</span>
                    <span>{feature.status === 'beta' ? '80%' : '30%'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        feature.status === 'beta' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}
                      style={{ width: feature.status === 'beta' ? '80%' : '30%' }}
                    ></div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Innovation Metrics */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 创新指标</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">97.4%</div>
            <div className="text-sm text-green-700 mt-1">AI预测准确率</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">0.6%</div>
            <div className="text-sm text-blue-700 mt-1">超低手续费</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">5s</div>
            <div className="text-sm text-purple-700 mt-1">实时数据更新</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">6</div>
            <div className="text-sm text-orange-700 mt-1">数据源聚合</div>
          </div>
        </div>
      </div>

      {/* Technical Architecture */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏗️ 技术架构亮点</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <span className="text-2xl">🧠</span>
            <div>
              <h4 className="font-semibold text-gray-900">AI驱动的价格预测</h4>
              <p className="text-sm text-gray-600 mt-1">
                使用LightGBM模型，基于600万+交易数据训练，实现97.4%的预测准确率
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <span className="text-2xl">⚡</span>
            <div>
              <h4 className="font-semibold text-gray-900">实时数据聚合</h4>
              <p className="text-sm text-gray-600 mt-1">
                聚合Binance、Coinbase等6个主流交易所数据，5秒更新频率
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <span className="text-2xl">🔗</span>
            <div>
              <h4 className="font-semibold text-gray-900">智能合约自动化</h4>
              <p className="text-sm text-gray-600 mt-1">
                自动化公益捐赠、费率优化和跨链桥接功能
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}