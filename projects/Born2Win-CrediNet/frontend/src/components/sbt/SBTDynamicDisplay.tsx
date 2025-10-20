import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useDynamicSBT, getRarityColor, getRarityIcon } from '@/hooks/useDynamicSBT'
import CreditRadarChart from '@/components/charts/CreditRadarChart'
import { mockCreditScore } from '@/mock/data'
import type { Address } from 'viem'

interface SBTDynamicDisplayProps {
  userAddress?: Address
}

/**
 * SBT 动态展示组件
 * 实时显示用户的信用评分和SBT形象，并监听评分更新
 */
export const SBTDynamicDisplay = ({ userAddress }: SBTDynamicDisplayProps) => {
  const { 
    creditInfo, 
    isLoading, 
    showUpgradeAnimation, 
    setShowUpgradeAnimation 
  } = useDynamicSBT(userAddress)

  // 触发升级特效
  const triggerUpgradeEffects = (rarity: string) => {
    const colors = {
      LEGENDARY: ['#FFD700', '#FF8C00', '#FFA500'],
      EPIC: ['#8B5CF6', '#A78BFA', '#C084FC'],
      RARE: ['#3B82F6', '#60A5FA', '#93C5FD'],
      COMMON: ['#9CA3AF', '#D1D5DB', '#E5E7EB']
    }

    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: colors[rarity as keyof typeof colors] || colors.COMMON,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">加载信用数据中...</p>
        </div>
      </div>
    )
  }

  if (!creditInfo) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p className="text-xl mb-2">😴 暂无SBT</p>
        <p className="text-sm">请先铸造您的信用SBT</p>
      </div>
    )
  }

  // 检查链上数据是否有效（所有维度都不为0）
  const hasValidChainData = creditInfo.score.keystone > 0 || 
                            creditInfo.score.ability > 0 || 
                            creditInfo.score.wealth > 0 || 
                            creditInfo.score.health > 0 || 
                            creditInfo.score.behavior > 0

  // 使用链上数据或 fallback 到 mock 数据
  const displayScore = hasValidChainData ? creditInfo.score : {
    keystone: mockCreditScore.dimensions.keystone,
    ability: mockCreditScore.dimensions.ability,
    wealth: mockCreditScore.dimensions.finance,
    health: mockCreditScore.dimensions.health,
    behavior: mockCreditScore.dimensions.behavior,
    lastUpdate: 0,
    updateCount: 0,
  }

  const displayTotalScore = hasValidChainData ? creditInfo.totalScore : mockCreditScore.total
  const { rarity } = creditInfo
  const rarityColor = getRarityColor(rarity)
  const rarityIcon = getRarityIcon(rarity)
  const formatLastUpdate = (lastUpdate: number) => {
    if (lastUpdate > 0) {
      const date = new Date(lastUpdate * 1000)
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      return `${year}.${month}.${day}`
    }
    return '2025.10.19'
  }

  return (
    <div className="relative">
      {/* SBT 卡片展示 */}
      <motion.div
        key={displayTotalScore} // 分数变化时触发动画
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.5 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">我的信用 SBT</h2>
          <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${rarityColor} text-white font-bold flex items-center gap-2`}>
            <span className="text-2xl">{rarityIcon}</span>
            <span>{rarity}</span>
          </div>
        </div>

        {/* C-Score 显示 */}
        <div className="text-center mb-6">
          <motion.div
            key={displayTotalScore}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative inline-block"
          >
            <div className={`text-6xl font-bold bg-gradient-to-r ${rarityColor} bg-clip-text text-transparent mb-2`}>
              {displayTotalScore}
            </div>
            <div className="text-gray-400 text-sm">C-Score</div>
          </motion.div>
        </div>

        {/* 五维评分详情 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <ScorePill label="基石 K" value={displayScore.keystone} icon="🏛️" />
          <ScorePill label="能力 A" value={displayScore.ability} icon="💪" />
          <ScorePill label="财富 F" value={displayScore.wealth} icon="💰" />
          <ScorePill label="健康 H" value={displayScore.health} icon="🛡️" />
          <ScorePill label="行为 B" value={displayScore.behavior} icon="⭐" />
        </div>

        {/* 更新信息 */}
        <div className="flex items-center justify-between text-sm text-gray-400 border-t border-gray-700 pt-4">
          <span>更新次数: {displayScore.updateCount}</span>
          <span>最后更新: {formatLastUpdate(displayScore.lastUpdate)}</span>
        </div>
      </motion.div>

      {/* 五维雷达图 */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-4">五维评分雷达图</h3>
        <CreditRadarChart
          data={{
            keystone: displayScore.keystone,
            ability: displayScore.ability,
            finance: displayScore.wealth,
            health: displayScore.health,
            behavior: displayScore.behavior,
          }}
        />
      </div>

      {/* 升级动画 */}
      <AnimatePresence>
        {showUpgradeAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onAnimationComplete={() => {
              triggerUpgradeEffects(rarity)
              setTimeout(() => setShowUpgradeAnimation(false), 2000)
            }}
          >
            <div className="text-center">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity
                }}
                className="text-9xl mb-6"
              >
                {rarityIcon}
              </motion.div>
              <h2 className="text-5xl font-bold text-white mb-4">
                🎉 恭喜升级！
              </h2>
              <p className={`text-3xl font-bold bg-gradient-to-r ${rarityColor} bg-clip-text text-transparent`}>
                {rarity}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * 单个评分药丸组件
 */
function ScorePill({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  )
}

export default SBTDynamicDisplay

