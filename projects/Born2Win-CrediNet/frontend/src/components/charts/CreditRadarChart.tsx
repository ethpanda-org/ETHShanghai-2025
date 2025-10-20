import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import { mockCreditScore, creditDimensions } from '@/mock/data'
import { Shield, Zap, DollarSign, Heart, Activity } from 'lucide-react'
import CreditOrbitVisualizer from './CreditOrbitVisualizer'

type RadarDataInput = {
  keystone: number
  ability: number
  finance: number
  health: number
  behavior: number
}

interface Props {
  data?: RadarDataInput
}

const CreditRadarChart = ({ data: external }: Props) => {
  // 检查是否所有维度数据都是0或接近0
  const hasValidData = external && Object.values(external).some(val => val > 0)
  
  const resolvedDimensions: RadarDataInput = hasValidData
    ? (external as RadarDataInput)
    : mockCreditScore.dimensions

  const source = {
    total: hasValidData
      ? Object.values(resolvedDimensions).reduce((a, b) => a + b, 0)
      : mockCreditScore.total,
    change: hasValidData ? 0 : mockCreditScore.change,
    dimensions: resolvedDimensions
  }

  // 图标映射
  const iconMap = {
    keystone: Shield,
    ability: Zap,
    finance: DollarSign,
    health: Heart,
    behavior: Activity
  }

  const data = creditDimensions.map((dim) => ({
    dimension: dim.name,
    value: source.dimensions[dim.key as keyof typeof source.dimensions],
    fullMark: 100,
    color: dim.color,
    icon: iconMap[dim.key as keyof typeof iconMap]
  }))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card"
    >
      {/* 标题部分 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">信用光谱</h2>
          <p className="text-sm text-gray-400">五维信用模型</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-gradient">
            {source.total}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            <span className="text-emerald-400">▲ {source.change}</span>
          </div>
        </div>
      </div>

      {/* 雷达图 + 星球轨道 */}
      <div className="grid gap-8 xl:grid-cols-[1.25fr_1fr] items-center">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid 
                stroke="#4a5568" 
                strokeWidth={1}
              />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{
                  fill: '#e2e8f0',
                  fontSize: 14,
                  fontWeight: 500
                }}
              />
              <Radar
                dataKey="value"
                stroke="#60a5fa"
                strokeWidth={2.5}
                fill="#3b82f6"
                fillOpacity={0.5}
                animationDuration={1000}
                animationBegin={0}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(26, 30, 61, 0.95)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                formatter={(value: any) => [`${value}`, '得分']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center">
          <CreditOrbitVisualizer
            dimensions={source.dimensions}
            total={source.total}
            change={source.change}
          />
        </div>
      </div>

      {/* 维度详情 */}
      <div className="grid grid-cols-1 gap-4 mt-6 sm:grid-cols-2 xl:grid-cols-5">
        {data.map((dim, index) => {
          const IconComponent = dim.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="text-center"
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white shadow-lg relative group hover:scale-110 transition-transform duration-200"
                style={{
                  backgroundColor: dim.color,
                  boxShadow: `0 4px 20px ${dim.color}40`
                }}
              >
                <IconComponent size={28} className="group-hover:scale-110 transition-transform duration-200" />
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center border-2 border-gray-800">
                  <span className="text-xs font-bold text-gray-800">{dim.value}</span>
                </div>
              </div>
              <div className="text-xs text-gray-400 font-medium">{dim.dimension}</div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default CreditRadarChart

