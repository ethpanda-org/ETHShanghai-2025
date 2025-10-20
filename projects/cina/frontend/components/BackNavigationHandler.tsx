'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function BackNavigationHandler() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const isFromTrading = useRef(false);

  useEffect(() => {
    // 记录是否从 trading 页面来的
    if (pathname === '/trading') {
      isFromTrading.current = true;
    }

    // 监听浏览器后退/前进按钮
    const handlePopState = (event: PopStateEvent) => {
      const currentPath = window.location.pathname;
      
      console.log('PopState detected:', {
        previous: previousPath.current,
        current: currentPath,
        isFromTrading: isFromTrading.current
      });
      
      // 检查是否从 /trading 回退到首页 (/)
      if (isFromTrading.current && currentPath === '/') {
        console.log('Triggering refresh from trading to home');
        // 延迟一点时间确保路由已经改变
        setTimeout(() => {
          // 触发页面刷新
          window.location.reload();
        }, 50);
      }
      
      // 更新前一个路径
      previousPath.current = currentPath;
      // 重置标记
      if (currentPath !== '/trading') {
        isFromTrading.current = false;
      }
    };

    // 添加 popstate 事件监听器
    window.addEventListener('popstate', handlePopState);

    // 更新当前路径
    previousPath.current = pathname;

    // 清理函数
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  return null; // 这个组件不渲染任何内容
}
