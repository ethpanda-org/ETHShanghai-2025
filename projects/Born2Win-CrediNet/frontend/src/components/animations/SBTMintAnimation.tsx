import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'

interface SBTMintAnimationProps {
  isVisible: boolean
  onComplete?: () => void
  sbtData?: {
    name: string
    image: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
  }
}

/**
 * SBT 铸造动画组件
 * 在用户铸造 SBT 时显示华丽的动画效果
 */
export const SBTMintAnimation = ({ 
  isVisible, 
  onComplete, 
  sbtData 
}: SBTMintAnimationProps) => {
  const [stage, setStage] = useState<'idle' | 'minting' | 'reveal' | 'complete'>('idle')

  useEffect(() => {
    if (isVisible) {
      // 动画序列
      setStage('minting')
      
      // 2秒后进入展示阶段
      setTimeout(() => {
        setStage('reveal')
        
        // 触发彩带效果
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8B5CF6', '#EC4899', '#06B6D4']
        })
      }, 2000)
      
      // 再过3秒完成
      setTimeout(() => {
        setStage('complete')
        onComplete?.()
      }, 5000)
    } else {
      setStage('idle')
    }
  }, [isVisible, onComplete])

  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-orange-600'
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div className="relative w-96 h-96 flex items-center justify-center">
            {/* 铸造阶段 - 旋转光环 */}
            {stage === 'minting' && (
              <motion.div
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute w-64 h-64"
              >
                <div className="w-full h-full rounded-full border-4 border-dashed border-purple-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-6xl mb-4"
                    >
                      ✨
                    </motion.div>
                    <p className="text-white text-xl font-bold">铸造中...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 展示阶段 - SBT 卡片飞入 */}
            {(stage === 'reveal' || stage === 'complete') && sbtData && (
              <motion.div
                initial={{ scale: 0, rotateY: 180, y: -100 }}
                animate={{ scale: 1, rotateY: 0, y: 0 }}
                transition={{ 
                  duration: 0.8, 
                  type: "spring",
                  stiffness: 260,
                  damping: 20 
                }}
                className="relative"
              >
                {/* 发光背景 */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute inset-0 bg-gradient-to-r ${rarityColors[sbtData.rarity]} blur-3xl rounded-3xl`}
                />
                
                {/* SBT 卡片 */}
                <div className="relative bg-slate-900/90 backdrop-blur-xl border-2 border-purple-500 rounded-3xl p-8 w-80">
                  {/* 稀有度标签 */}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${rarityColors[sbtData.rarity]} text-white`}>
                    {sbtData.rarity.toUpperCase()}
                  </div>
                  
                  {/* SBT 图像 */}
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-48 h-48 mx-auto mb-6 relative"
                  >
                    <img 
                      src={sbtData.image} 
                      alt={sbtData.name}
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </motion.div>
                  
                  {/* SBT 名称 */}
                  <h3 className="text-2xl font-bold text-white text-center mb-2">
                    {sbtData.name}
                  </h3>
                  
                  <p className="text-gray-400 text-center text-sm">
                    Soulbound Token
                  </p>
                  
                  {/* 成功提示 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 text-center"
                  >
                    <div className="inline-flex items-center gap-2 text-green-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">铸造成功！</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* 粒子效果 */}
            {stage === 'reveal' && (
              <>
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: 0, 
                      y: 0, 
                      scale: 0,
                      opacity: 1 
                    }}
                    animate={{ 
                      x: Math.random() * 400 - 200,
                      y: Math.random() * 400 - 200,
                      scale: Math.random() * 2,
                      opacity: 0
                    }}
                    transition={{ 
                      duration: 1.5,
                      delay: i * 0.05,
                      ease: "easeOut"
                    }}
                    className="absolute w-2 h-2 bg-purple-500 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%'
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SBTMintAnimation
