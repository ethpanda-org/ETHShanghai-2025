'use client'

import { useEffect } from 'react'

export function BackgroundStyle() {
  useEffect(() => {
    // 强制在客户端应用背景样式
    const style = `
      body {
        background-color: #fafafa !important;
        background-image: 
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 78, 152, 0.5), transparent),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(220, 0, 54, 0.4), transparent),
          radial-gradient(ellipse 60% 40% at 20% 60%, rgba(238, 189, 1, 0.3), transparent),
          linear-gradient(to right, rgba(0, 78, 152, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 78, 152, 0.15) 1px, transparent 1px) !important;
        background-size: auto, auto, auto, 40px 40px, 40px 40px !important;
        background-attachment: fixed !important;
      }
    `
    
    const styleElement = document.createElement('style')
    styleElement.id = 'barca-background-override'
    styleElement.textContent = style
    
    // 移除旧的样式（如果存在）
    const existingStyle = document.getElementById('barca-background-override')
    if (existingStyle) {
      existingStyle.remove()
    }
    
    document.head.appendChild(styleElement)
    
    // 清理函数
    return () => {
      const elem = document.getElementById('barca-background-override')
      if (elem) {
        elem.remove()
      }
    }
  }, [])
  
  return null
}

