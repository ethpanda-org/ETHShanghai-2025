import { motion } from 'framer-motion'
import { mockCreditScore } from '@/mock/data'

const ORBIT_RADIUS = 200
const ORBIT_DURATION = 18
const SPIN_DURATION = 12
const PLANET_SIZE = 160
const PLANET_HALF = PLANET_SIZE / 2
const CONTAINER_SIZE = ORBIT_RADIUS * 2 + PLANET_SIZE

const planets: Array<{
  key: keyof typeof mockCreditScore.dimensions
  label: string
  icon: string
}> = [
  { key: 'keystone', label: '基石 K', icon: '/planets/keystone.svg' },
  { key: 'ability', label: '能力 A', icon: '/planets/ability.svg' },
  { key: 'finance', label: '财富 F', icon: '/planets/wealth.svg' },
  { key: 'health', label: '健康 H', icon: '/planets/health.svg' },
  { key: 'behavior', label: '行为 B', icon: '/planets/behavior.svg' },
]

const SBTBadgePreview = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card h-full flex flex-col"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">动态 SBT 勋章</h2>
        <p className="text-sm text-gray-400">五维信用星系</p>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <div
          className="relative flex items-center justify-center"
          style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
        >
          <div
            className="absolute rounded-full border border-dashed border-slate-700/30"
            style={{
              width: ORBIT_RADIUS * 2,
              height: ORBIT_RADIUS * 2,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          <div
            className="absolute z-10 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: '50%', top: '50%' }}
          >
            <div className="w-40 h-40 rounded-full bg-slate-800/90 backdrop-blur-xl border-2 border-slate-600 flex items-center justify-center shadow-xl">
              <div className="flex flex-col items-center justify-center h-full text-center leading-tight">
                <div className="text-5xl font-bold text-white tracking-tight mb-1 leading-none">
                  {mockCreditScore.total}
                </div>
                <div className="text-sm text-gray-300 font-medium tracking-wide">C-Score</div>
              </div>
            </div>
          </div>

          {planets.map((planet, index) => {
            const startAngle = (360 / planets.length) * index
            const dimensionValue = mockCreditScore.dimensions[planet.key]

            return (
              <div
                key={planet.key}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  width: 0,
                  height: 0,
                }}
              >
                <motion.div
                  className="absolute"
                  style={{
                    width: 0,
                    height: 0,
                  }}
                  animate={{ rotate: [startAngle, startAngle + 360] }}
                  transition={{
                    duration: ORBIT_DURATION,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  <motion.div
                    className="absolute"
                    style={{
                      left: ORBIT_RADIUS,
                      top: 0,
                      marginLeft: -PLANET_HALF,
                      marginTop: -PLANET_HALF,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      rotate: [-startAngle, -startAngle - 360],
                    }}
                    transition={{
                      rotate: {
                        duration: SPIN_DURATION,
                        repeat: Infinity,
                        ease: 'linear',
                      },
                      opacity: {
                        duration: 0.5,
                        delay: index * 0.1,
                      },
                    }}
                  >
                    <motion.div
                      className="relative group cursor-pointer"
                      whileHover={{ scale: 1.15 }}
                    >
                      <motion.img
                        src={planet.icon}
                        alt={planet.label}
                        style={{
                          width: PLANET_SIZE,
                          height: PLANET_SIZE,
                        }}
                        className="drop-shadow-2xl"
                        animate={{
                          filter: [
                            'drop-shadow(0 6px 12px rgba(0,0,0,0.35))',
                            'drop-shadow(0 12px 24px rgba(0,0,0,0.55))',
                            'drop-shadow(0 6px 12px rgba(0,0,0,0.35))',
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />

                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-xs px-3 py-1.5 rounded-lg opacity-90 group-hover:opacity-100 transition-all whitespace-nowrap border border-slate-700 shadow-xl z-50 backdrop-blur-sm">
                        <div className="font-semibold tracking-wide">{planet.label}</div>
                        <div className="text-emerald-400 text-sm font-semibold">
                          {(dimensionValue ?? 0).toString()} 分
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="text-xs text-gray-500">五维星球随信用数据动态变化</p>
      </div>
    </motion.div>
  )
}

export default SBTBadgePreview
