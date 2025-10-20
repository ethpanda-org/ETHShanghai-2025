/**
 * React StrictMode 兼容性助手
 * 提供更全面的解决方案来处理第三方库在StrictMode下的兼容性问题
 */

// 保存原始的console方法
const originalConsole = {
  error: console.error,
  warn: console.warn,
};

// findDOMNode相关警告的匹配模式
const FINDDOMNODE_WARNING_PATTERNS = [
  /findDOMNode is deprecated/i,
  /findDOMNode was passed an instance/i,
  /is deprecated in StrictMode/i,
  /DomWrapper/i,
  /ReactDOM\.findDOMNode/i,
];

// 检查消息是否为findDOMNode相关警告
const isFindDOMNodeWarning = (message: string): boolean => {
  return FINDDOMNODE_WARNING_PATTERNS.some(pattern => pattern.test(message));
};

// 检查参数数组是否包含findDOMNode相关内容
const containsFindDOMNodeContent = (args: any[]): boolean => {
  const allContent = args.join(' ').toLowerCase();
  return (
    allContent.includes('finddomnode') ||
    allContent.includes('domwrapper') ||
    (allContent.includes('strictmode') && allContent.includes('deprecated')) ||
    allContent.includes('reactdom.finddomnode')
  );
};

/**
 * 智能抑制findDOMNode相关警告
 * 只在开发环境中生效，保留其他重要的错误和警告
 */
export const suppressFindDOMNodeWarnings = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // 重写console.error
  console.error = (...args: any[]) => {
    const firstArg = args[0];
    
    // 检查第一个参数是否为字符串且包含findDOMNode警告
    if (typeof firstArg === 'string' && isFindDOMNodeWarning(firstArg)) {
      return; // 抑制警告
    }
    
    // 检查所有参数是否包含findDOMNode相关内容
    if (containsFindDOMNodeContent(args)) {
      return; // 抑制警告
    }
    
    // 其他错误正常输出
    originalConsole.error.apply(console, args);
  };

  // 重写console.warn（某些情况下警告可能通过warn输出）
  console.warn = (...args: any[]) => {
    const firstArg = args[0];
    
    if (typeof firstArg === 'string' && isFindDOMNodeWarning(firstArg)) {
      return; // 抑制警告
    }
    
    if (containsFindDOMNodeContent(args)) {
      return; // 抑制警告
    }
    
    // 其他警告正常输出
    originalConsole.warn.apply(console, args);
  };
};

/**
 * 恢复原始的console方法
 */
export const restoreConsole = (): void => {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
};

/**
 * 创建一个临时的错误边界来捕获和过滤React错误
 */
export const createErrorBoundary = () => {
  const originalOnError = window.onerror;
  const originalOnUnhandledRejection = window.onunhandledrejection;

  // 捕获全局错误
  window.onerror = (message, source, lineno, colno, error) => {
    if (typeof message === 'string' && isFindDOMNodeWarning(message)) {
      return true; // 阻止错误传播
    }
    
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // 捕获未处理的Promise拒绝
  window.onunhandledrejection = function(event: PromiseRejectionEvent) {
    const reason = event.reason;
    if (reason && typeof reason.message === 'string' && isFindDOMNodeWarning(reason.message)) {
      event.preventDefault();
      return;
    }
    
    if (originalOnUnhandledRejection) {
      originalOnUnhandledRejection.call(window, event);
    }
  };

  // 返回清理函数
  return () => {
    window.onerror = originalOnError;
    window.onunhandledrejection = originalOnUnhandledRejection;
  };
};

/**
 * 初始化StrictMode兼容性助手
 */
export const initStrictModeCompatibility = (): (() => void) => {
  suppressFindDOMNodeWarnings();
  const cleanupErrorBoundary = createErrorBoundary();
  
  return () => {
    restoreConsole();
    cleanupErrorBoundary();
  };
};