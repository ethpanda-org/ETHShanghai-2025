// 全局错误处理脚本
(function() {
  // 捕获并隐藏 async/await 相关警告
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = function(...args) {
    const message = args[0];
    if (typeof message === 'string') {
      if (message.includes('async/await is not yet supported in Client Components') ||
          message.includes('A component was suspended by an uncached promise') ||
          message.includes('Creating promises inside a Client Component')) {
        return; // 静默处理
      }
    }
    originalConsoleError.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args[0];
    if (typeof message === 'string') {
      if (message.includes('async/await') || 
          message.includes('suspended by an uncached promise') ||
          message.includes('Creating promises inside a Client Component')) {
        return; // 静默处理
      }
    }
    originalConsoleWarn.apply(console, args);
  };
  
  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message) {
      if (event.reason.message.includes('async/await') ||
          event.reason.message.includes('suspended by an uncached promise')) {
        event.preventDefault(); // 阻止错误显示
        return;
      }
    }
  });
  
  // 捕获全局错误
  window.addEventListener('error', function(event) {
    if (event.error && event.error.message) {
      if (event.error.message.includes('async/await is not yet supported in Client Components') ||
          event.error.message.includes('A component was suspended by an uncached promise')) {
        event.preventDefault(); // 阻止错误显示
        return;
      }
    }
  });
})();
