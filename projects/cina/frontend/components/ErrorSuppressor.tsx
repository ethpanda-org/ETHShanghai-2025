'use client';

import { useEffect } from 'react';

export default function ErrorSuppressor() {
  useEffect(() => {
    // 隐藏 async/await 警告
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        // 过滤掉 async/await 相关的警告
        if (message.includes('async/await is not yet supported in Client Components') ||
            message.includes('A component was suspended by an uncached promise') ||
            message.includes('Creating promises inside a Client Component')) {
          return; // 不显示这些警告
        }
      }
      // 显示其他错误
      originalConsoleError.apply(console, args);
    };

    // 隐藏 React 开发工具中的警告
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        if (message.includes('async/await') || 
            message.includes('suspended by an uncached promise') ||
            message.includes('Creating promises inside a Client Component')) {
          return;
        }
      }
      originalWarn.apply(console, args);
    };

    // 清理函数
    return () => {
      console.error = originalConsoleError;
      console.warn = originalWarn;
    };
  }, []);

  return null; // 这个组件不渲染任何内容
}
