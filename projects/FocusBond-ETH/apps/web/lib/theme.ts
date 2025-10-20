'use client'

export interface ThemeConfig {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    card: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
  }
}

export const themes: ThemeConfig[] = [
  {
    id: 'blue',
    name: '科技蓝',
    colors: {
      primary: '#00a8ff',
      secondary: '#0097e6',
      accent: '#00a8ff',
      background: '#0f0f23',
      card: '#16213e',
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      border: 'rgba(0, 168, 255, 0.3)',
      success: '#00b894',
      warning: '#fdcb6e',
      error: '#ff4757'
    }
  },
  {
    id: 'purple',
    name: '梦幻紫',
    colors: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#8b5cf6',
      background: '#0f0f23',
      card: '#1e1b4b',
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      border: 'rgba(139, 92, 246, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  {
    id: 'green',
    name: '自然绿',
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#10b981',
      background: '#0f0f23',
      card: '#064e3b',
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      border: 'rgba(16, 185, 129, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  {
    id: 'orange',
    name: '活力橙',
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#f97316',
      background: '#0f0f23',
      card: '#431407',
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      border: 'rgba(249, 115, 22, 0.3)',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  {
    id: 'pink',
    name: '浪漫粉',
    colors: {
      primary: '#ec4899',
      secondary: '#db2777',
      accent: '#ec4899',
      background: '#0f0f23',
      card: '#500724',
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      border: 'rgba(236, 72, 153, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  },
  {
    id: 'cyan',
    name: '深海青',
    colors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#06b6d4',
      background: '#0f0f23',
      card: '#164e63',
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      border: 'rgba(6, 182, 212, 0.3)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  }
]

export function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement
  
  // 应用主题颜色到正确的 CSS 变量
  root.style.setProperty('--color-primary', theme.colors.primary)
  root.style.setProperty('--color-secondary', theme.colors.secondary)
  root.style.setProperty('--color-accent', theme.colors.accent)
  root.style.setProperty('--color-background', theme.colors.background)
  root.style.setProperty('--color-card', theme.colors.card)
  root.style.setProperty('--color-text', theme.colors.text)
  root.style.setProperty('--color-text-secondary', theme.colors.textSecondary)
  root.style.setProperty('--color-border', theme.colors.border)
  root.style.setProperty('--color-success', theme.colors.success)
  root.style.setProperty('--color-warning', theme.colors.warning)
  root.style.setProperty('--color-error', theme.colors.error)
  
  // 同时设置兼容的变量名
  root.style.setProperty('--accent-primary', theme.colors.primary)
  root.style.setProperty('--accent-secondary', theme.colors.secondary)
  root.style.setProperty('--background-primary', theme.colors.background)
  root.style.setProperty('--background-secondary', theme.colors.card)
  root.style.setProperty('--text-primary', theme.colors.text)
  root.style.setProperty('--text-secondary', theme.colors.textSecondary)
  root.style.setProperty('--border-glow', theme.colors.border)
  root.style.setProperty('--accent-success', theme.colors.success)
  root.style.setProperty('--accent-warning', theme.colors.warning)
  root.style.setProperty('--accent-danger', theme.colors.error)
  
  // 保存主题到本地存储
  localStorage.setItem('currentTheme', JSON.stringify(theme))
}

export function getCurrentTheme(): ThemeConfig {
  const savedTheme = localStorage.getItem('currentTheme')
  if (savedTheme) {
    return JSON.parse(savedTheme)
  }
  return themes[0] // 默认使用蓝色主题
}

export function resetToDefaultTheme() {
  applyTheme(themes[0])
}