'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function BackRefreshHandler() {
  const pathname = usePathname();

  useEffect(() => {
    // 设置全局错误处理
    const handleError = (event: ErrorEvent) => {
      console.log('Error detected, refreshing page...');
      window.location.reload();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.log('Unhandled promise rejection, refreshing page...');
      window.location.reload();
    };

    // 监听回退操作
    const handlePopState = (event: PopStateEvent) => {
      console.log('PopState event detected');
      // 延迟一点时间，如果出现任何错误就刷新
      setTimeout(() => {
        try {
          // 检查当前路径
          const currentPath = window.location.pathname;
          console.log('Current path after popstate:', currentPath);
          
          // 如果从 trading 回退到首页，直接刷新
          if (currentPath === '/') {
            console.log('Refreshing page after back to home');
            window.location.reload();
          }
        } catch (error) {
          console.log('Error in popstate handler, refreshing page...');
          window.location.reload();
        }
      }, 100);
    };

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible');
        // 检查是否从 trading 页面回退
        const currentPath = window.location.pathname;
        if (currentPath === '/') {
          console.log('On home page after visibility change, refreshing...');
          setTimeout(() => {
            window.location.reload();
          }, 200);
        }
      }
    };

    // 添加所有事件监听器
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理函数
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
