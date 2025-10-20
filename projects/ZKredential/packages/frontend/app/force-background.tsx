'use client'

import { useEffect } from 'react'

export function ForceBackground() {
  useEffect(() => {
    const applyStyles = () => {
      // 使用 !important 确保样式优先级最高
      document.body.style.setProperty('background-color', '#fafafa', 'important')
      document.body.style.setProperty('background-image', `
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 78, 152, 0.5), transparent),
        radial-gradient(ellipse 60% 40% at 80% 80%, rgba(220, 0, 54, 0.4), transparent),
        radial-gradient(ellipse 60% 40% at 20% 60%, rgba(238, 189, 1, 0.3), transparent),
        linear-gradient(to right, rgba(0, 78, 152, 0.15) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 78, 152, 0.15) 1px, transparent 1px)
      `, 'important')
      document.body.style.setProperty('background-size', 'auto, auto, auto, 40px 40px, 40px 40px', 'important')
      document.body.style.setProperty('background-attachment', 'fixed', 'important')
      console.log('✅ Barca background applied with !important!')
    }
    
    // 立即执行
    applyStyles()
    
    // 延迟执行多次，确保覆盖任何后续样式
    const timeouts = [
      setTimeout(applyStyles, 0),
      setTimeout(applyStyles, 100),
      setTimeout(applyStyles, 300),
      setTimeout(applyStyles, 500),
      setTimeout(applyStyles, 1000)
    ]
    
    // 监听 DOM 变化，如果背景被修改就重新应用
    const observer = new MutationObserver(() => {
      const currentBg = window.getComputedStyle(document.body).backgroundImage
      if (!currentBg.includes('radial-gradient')) {
        applyStyles()
      }
    })
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    })
    
    return () => {
      timeouts.forEach(clearTimeout)
      observer.disconnect()
    }
  }, [])
  
  return null
}

