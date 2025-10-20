'use client'

interface BackgroundConfig {
  type: 'image' | 'gradient' | 'pattern'
  imageUrl?: string
  animation: 'floating' | 'pulse' | 'glow' | 'slide' | 'zoom' | 'rotate' | 'none'
  speed: 'slow' | 'medium' | 'fast'
  overlay: boolean
}

interface DynamicBackgroundProps {
  backgroundConfig: BackgroundConfig
}

export default function DynamicBackground({ backgroundConfig }: DynamicBackgroundProps) {
  // 获取背景样式
  const getBackgroundStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      pointerEvents: 'none'
    }

    switch (backgroundConfig.type) {
      case 'image':
        return {
          ...baseStyle,
          backgroundImage: `url(${backgroundConfig.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          animation: getAnimationClass()
        }
      
      case 'gradient':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
          animation: getAnimationClass()
        }
      
      case 'pattern':
        return {
          ...baseStyle,
          background: `
            radial-gradient(circle at 20% 80%, rgba(0, 243, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255, 0, 255, 0.05) 0%, transparent 50%),
            linear-gradient(45deg, transparent 49%, rgba(0, 243, 255, 0.05) 50%, transparent 51%),
            linear-gradient(-45deg, transparent 49%, rgba(138, 43, 226, 0.05) 50%, transparent 51%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 50px 50px, 50px 50px',
          animation: getAnimationClass()
        }
      
      default:
        return baseStyle
    }
  }

  // 获取动画类名
  const getAnimationClass = () => {
    if (backgroundConfig.animation === 'none') return ''
    
    const speedMap = {
      slow: '20s',
      medium: '15s',
      fast: '10s'
    }

    const animationMap = {
      floating: `floatingBackground ${speedMap[backgroundConfig.speed]} ease-in-out infinite`,
      pulse: `pulseBackground ${speedMap[backgroundConfig.speed]} ease-in-out infinite`,
      glow: `glowBackground ${speedMap[backgroundConfig.speed]} ease-in-out infinite`,
      slide: `slideBackground ${speedMap[backgroundConfig.speed]} linear infinite`,
      zoom: `zoomBackground ${speedMap[backgroundConfig.speed]} ease-in-out infinite`,
      rotate: `rotateBackground ${speedMap[backgroundConfig.speed]} linear infinite`
    }

    return animationMap[backgroundConfig.animation]
  }

  // 获取覆盖层样式
  const getOverlayStyle = (): React.CSSProperties => {
    if (!backgroundConfig.overlay) return {}
    
    return {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, rgba(10, 10, 31, 0.7) 0%, rgba(26, 26, 46, 0.8) 100%)',
      zIndex: -1,
      pointerEvents: 'none' as React.CSSProperties['pointerEvents']
    }
  }

  return (
    <>
      {/* 动态背景 */}
      <div style={getBackgroundStyle()} />
      
      {/* 覆盖层 */}
      {backgroundConfig.overlay && <div style={getOverlayStyle()} />}
    </>
  )
}