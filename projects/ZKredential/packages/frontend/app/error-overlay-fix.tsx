'use client'

import { useEffect } from 'react'

export function ErrorOverlayFix() {
  useEffect(() => {
    // 彻底移除所有 Next.js 错误提示
    const removeAllErrors = () => {
      // 移除所有可能的错误相关元素
      const selectors = [
        '[data-nextjs-dialog-overlay]',
        '[data-nextjs-dialog]',
        '[data-nextjs-toast]',
        'nextjs-portal',
        '#__next-build-watcher',
        '.__next-build-watcher',
        '[data-nextjs-errors-dialog-left-right-close-button]',
        'button[aria-label*="error"]',
        'button[aria-label*="unhandled"]'
      ]
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(el => el.remove())
      })
      
      // 隐藏所有固定定位在左下角和右下角的元素（可能是错误提示）
      const fixedElements = document.querySelectorAll('div[style*="position: fixed"]')
      fixedElements.forEach(el => {
        const htmlEl = el as HTMLElement
        const style = window.getComputedStyle(htmlEl)
        if ((style.bottom === '0px' || style.bottom.includes('px')) && 
            (style.left === '0px' || style.right === '0px')) {
          // 检查是否包含 "error" 或 "unhandled" 文本
          if (htmlEl.textContent?.toLowerCase().includes('error') || 
              htmlEl.textContent?.toLowerCase().includes('unhandled')) {
            htmlEl.style.display = 'none'
          }
        }
      })
    }

    // 立即执行
    removeAllErrors()

    // 持续监控并移除
    const interval = setInterval(removeAllErrors, 500)

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(removeAllErrors)
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, [])

  return null
}

