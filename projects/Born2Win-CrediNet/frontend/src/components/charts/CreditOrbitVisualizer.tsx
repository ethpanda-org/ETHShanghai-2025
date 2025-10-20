import { motion } from 'framer-motion'
import { creditDimensions } from '@/mock/data'

const ORBIT_RADIUS = 130
const PLANET_SIZE = 104
const PLANET_HALF = PLANET_SIZE / 2
const CONTAINER_SIZE = ORBIT_RADIUS * 2 + PLANET_SIZE
const ORBIT_DURATION = 18
const SPIN_DURATION = 12

type DimensionScores = {
  keystone: number
  ability: number
  finance: number
  health: number
  behavior: number
}

type DimensionKey = keyof DimensionScores

const planetIcons: Record<DimensionKey, string> = {
  keystone: '/planets/keystone.svg',
  ability: '/planets/ability.svg',
  finance: '/planets/wealth.svg',
  health: '/planets/health.svg',
  behavior: '/planets/behavior.svg',
}

interface Props {
  dimensions: DimensionScores
  total: number
  change?: number
}

const CreditOrbitVisualizer = ({ dimensions, total, change = 0 }: Props) => {
  return (
    <div
      className="relative flex items-center justify-center mx-auto"
      style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
    >
      <div
        className="absolute rounded-full border border-dashed border-slate-700/40"
        style={{
          width: ORBIT_RADIUS * 2,
          height: ORBIT_RADIUS * 2,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        className="absolute z-10 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 text-center"
        style={{ left: '50%', top: '50%' }}
      >
        <div className="w-24 h-24 rounded-full bg-slate-900/90 border border-slate-700 shadow-[0_0_32px_rgba(59,130,246,0.35)] flex flex-col items-center justify-center backdrop-blur">
          <div className="text-2xl font-bold text-white leading-none">{total}</div>
          <div className="text-[10px] text-gray-400 tracking-wide mt-1 uppercase">C-Score</div>
          <div className="text-[11px] font-semibold mt-1">
            <span className={change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {change >= 0 ? '+' : '-'} {Math.abs(change)}
            </span>
          </div>
        </div>
      </div>

      {creditDimensions.map((dim, index) => {
        const startAngle = (360 / creditDimensions.length) * index
        const value = dimensions[dim.key as DimensionKey] ?? 0

        return (
          <div
            key={dim.key}
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
              style={{ width: 0, height: 0 }}
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
                    duration: 0.6,
                    delay: index * 0.08,
                  },
                }}
              >
                <motion.div
                  className="relative flex flex-col items-center group"
                  whileHover={{ scale: 1.1 }}
                >
                  <motion.img
                    src={planetIcons[dim.key as DimensionKey]}
                    alt={dim.name}
                    style={{
                      width: PLANET_SIZE,
                      height: PLANET_SIZE,
                    }}
                    className="drop-shadow-[0_12px_25px_rgba(15,23,42,0.55)]"
                    animate={{
                      filter: [
                        'drop-shadow(0 8px 16px rgba(15,23,42,0.35))',
                        'drop-shadow(0 16px 28px rgba(15,23,42,0.55))',
                        'drop-shadow(0 8px 16px rgba(15,23,42,0.35))',
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />

                  <div className="pointer-events-none absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/70 border border-slate-600/50 text-white/90 text-xs font-medium shadow-lg backdrop-blur-sm opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                    <span className="block">{dim.name}</span>
                    <span className="text-emerald-300 font-semibold">{value} 分</span>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

export default CreditOrbitVisualizer
