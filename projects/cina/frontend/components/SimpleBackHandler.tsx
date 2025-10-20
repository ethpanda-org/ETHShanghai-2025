'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SimpleBackHandler() {
  const pathname = usePathname();

  useEffect(() => {
    // 在 trading 页面时设置标记
    if (pathname === '/trading') {
      sessionStorage.setItem('wasOnTrading', 'true');
    }

    // 监听页面可见性变化（包括回退）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const wasOnTrading = sessionStorage.getItem('wasOnTrading');
        const currentPath = window.location.pathname;
        
        console.log('Visibility change detected:', {
          wasOnTrading,
          currentPath,
          pathname
        });
        
        // 如果之前在 trading 页面，现在在首页，则刷新
        if (wasOnTrading === 'true' && currentPath === '/') {
          console.log('Refreshing page after back from trading');
          sessionStorage.removeItem('wasOnTrading');
          window.location.reload();
        }
      }
    };

    // 监听浏览器历史记录变化
    const handlePopState = () => {
      const wasOnTrading = sessionStorage.getItem('wasOnTrading');
      const currentPath = window.location.pathname;
      
      console.log('PopState detected:', {
        wasOnTrading,
        currentPath
      });
      
      if (wasOnTrading === 'true' && currentPath === '/') {
        console.log('Refreshing page after popstate from trading');
        sessionStorage.removeItem('wasOnTrading');
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    // 添加事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);

    // 清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  return null;
}
