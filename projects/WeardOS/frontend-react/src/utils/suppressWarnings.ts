/**
 * 抑制开发环境中的特定警告
 * 这是一个临时解决方案，用于处理第三方库（如Ant Design）在StrictMode下的兼容性问题
 */

const originalConsoleError = console.error;

export const suppressFindDOMNodeWarnings = () => {
  if (process.env.NODE_ENV === 'development') {
    console.error = (...args: any[]) => {
      // 检查是否是findDOMNode相关的警告
      const message = args[0];
      if (typeof message === 'string') {
        // 检查格式化的警告消息（包含%s占位符的模板）
        if (
          message.includes('is deprecated in StrictMode') ||
          message.includes('findDOMNode is deprecated') ||
          message.includes('findDOMNode was passed an instance') ||
          message.includes('DomWrapper') ||
          (message.includes('%s') && message.includes('StrictMode') && message.includes('findDOMNode'))
        ) {
          // 在开发环境中抑制这些警告
          return;
        }
      }
      
      // 检查参数中是否包含findDOMNode相关内容
      const allArgs = args.join(' ');
      if (
        allArgs.includes('findDOMNode') ||
        allArgs.includes('DomWrapper') ||
        (allArgs.includes('StrictMode') && allArgs.includes('deprecated'))
      ) {
        return;
      }
      
      // 对于其他所有错误和警告，正常输出
      originalConsoleError.apply(console, args);
    };
  }
};

export const restoreConsoleError = () => {
  console.error = originalConsoleError;
};