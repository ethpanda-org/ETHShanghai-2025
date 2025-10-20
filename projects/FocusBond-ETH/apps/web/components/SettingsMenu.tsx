'use client'

import { useState, useRef, useEffect } from 'react'
import { themes, applyTheme, getCurrentTheme } from '../lib/theme'

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (tab: string) => void
  onBackgroundChange: (config: any) => void
  currentBackground: any
  buttonRef: React.RefObject<HTMLButtonElement>
}

export default function SettingsMenu({ isOpen, onClose, onNavigate, onBackgroundChange, currentBackground, buttonRef }: SettingsMenuProps) {
  const [showBackgroundSettings, setShowBackgroundSettings] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems = [
    { id: 'profile', icon: '👤', label: '我的主页', description: '查看个人资料和统计数据' },
    { id: 'alerts', icon: '🔔', label: '警报设置', description: '管理专注打断警报' },
    { id: 'market', icon: '🛒', label: '代币市场', description: '购买和管理代币' },
    { id: 'leaderboard', icon: '🏆', label: '排行榜', description: '查看用户排名' }
  ]

  // 计算菜单位置
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: buttonRect.bottom + 8,
        right: window.innerWidth - buttonRect.right
      })
    }
  }, [isOpen, buttonRef])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, buttonRef])

  // 应用主题
  const handleThemeChange = (theme: any) => {
    setCurrentTheme(theme)
    applyTheme(theme)
  }

  // 应用背景设置
  const applyBackground = () => {
    onBackgroundChange(currentBackground)
    localStorage.setItem('currentBackground', JSON.stringify(currentBackground))
    setShowBackgroundSettings(false)
  }

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-background-card border border-border-glow rounded-2xl p-4 w-80 max-h-[80vh] overflow-y-auto shadow-2xl"
      style={{
        top: `${menuPosition.top}px`,
        right: `${menuPosition.right}px`
      }}
    >
      {!showBackgroundSettings ? (
        <>
          <div className="space-y-2">
            <button
              onClick={() => setShowBackgroundSettings(true)}
              className="w-full p-3 rounded-xl bg-background-secondary hover:bg-background-card border border-border-glow transition-all duration-300 text-left group hover:scale-105"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-lg">
                  🎨
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-accent-primary transition-colors">
                    背景和主题设置
                  </h3>
                  <p className="text-sm text-text-secondary">自定义应用背景和主题颜色</p>
                </div>
                <div className="text-text-muted group-hover:text-accent-primary transition-colors">
                  →
                </div>
              </div>
            </button>

            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id)
                  onClose()
                }}
                className="w-full p-3 rounded-xl bg-background-secondary hover:bg-background-card border border-border-glow transition-all duration-300 text-left group hover:scale-105"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-lg">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-accent-primary transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-sm text-text-secondary">{item.description}</p>
                  </div>
                  <div className="text-text-muted group-hover:text-accent-primary transition-colors">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border-glow">
            <div className="text-center text-text-muted text-sm">
              FocusBond v1.0.0
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowBackgroundSettings(false)}
              className="text-text-muted hover:text-white transition-colors flex items-center"
            >
              ← 返回
            </button>
            <h2 className="text-lg font-bold text-white">🎨 主题和背景</h2>
            <button
              onClick={applyBackground}
              className="btn-primary px-4 py-1 text-sm"
            >
              应用
            </button>
          </div>

          {/* 主题选择 */}
          <div>
            <h3 className="font-semibold text-white mb-3">🎨 主题颜色</h3>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme)}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    currentTheme.id === theme.id
                      ? 'border-accent-primary shadow-lg'
                      : 'border-border-glow hover:border-accent-primary'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.secondary}20)`
                  }}
                >
                  <div className="flex items-center space-x-1 justify-center">
                    <div
                      className="w-4 h-4 rounded-full border border-white/50"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <span className="text-white text-xs">{theme.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 预设背景 */}
          <div>
            <h3 className="font-semibold text-white mb-3">🌅 预设背景</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onBackgroundChange({
                  type: 'gradient',
                  animation: 'pulse',
                  speed: 'slow',
                  overlay: true
                })}
                className="p-3 rounded-lg bg-gradient-to-br from-[#0f0f23] to-[#16213e] border-2 border-border-glow hover:border-accent-primary transition-all text-white text-left"
              >
                <div className="font-semibold text-sm">渐变背景</div>
                <div className="text-xs text-text-secondary">动态渐变色彩</div>
              </button>
              <button
                onClick={() => onBackgroundChange({
                  type: 'pattern',
                  animation: 'floating',
                  speed: 'medium',
                  overlay: true
                })}
                className="p-3 rounded-lg bg-pattern border-2 border-border-glow hover:border-accent-primary transition-all text-white text-left"
              >
                <div className="font-semibold text-sm">几何图案</div>
                <div className="text-xs text-text-secondary">科技感几何图形</div>
              </button>
            </div>
          </div>

          {/* 动画设置 */}
          <div>
            <h3 className="font-semibold text-white mb-2">✨ 动画效果</h3>
            <select
              value={currentBackground.animation}
              onChange={(e) => onBackgroundChange({
                ...currentBackground,
                animation: e.target.value as any
              })}
              className="w-full p-2 rounded-lg bg-background-secondary border border-border-glow text-white text-sm"
            >
              <option value="none">无动画</option>
              <option value="floating">浮动效果</option>
              <option value="pulse">脉冲效果</option>
              <option value="glow">发光效果</option>
              <option value="slide">滑动效果</option>
              <option value="zoom">缩放效果</option>
              <option value="rotate">旋转效果</option>
            </select>
          </div>

          {/* 速度设置 */}
          <div>
            <h3 className="font-semibold text-white mb-2">⚡ 动画速度</h3>
            <select
              value={currentBackground.speed}
              onChange={(e) => onBackgroundChange({
                ...currentBackground,
                speed: e.target.value as any
              })}
              className="w-full p-2 rounded-lg bg-background-secondary border border-border-glow text-white text-sm"
            >
              <option value="slow">慢速 - 舒缓体验</option>
              <option value="medium">中速 - 平衡效果</option>
              <option value="fast">快速 - 动态强烈</option>
            </select>
          </div>

          {/* 覆盖层设置 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
            <div>
              <div className="font-semibold text-white text-sm">🌙 深色覆盖层</div>
              <div className="text-xs text-text-secondary">增强文字可读性</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentBackground.overlay}
                onChange={(e) => onBackgroundChange({
                  ...currentBackground,
                  overlay: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-background-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-primary"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}