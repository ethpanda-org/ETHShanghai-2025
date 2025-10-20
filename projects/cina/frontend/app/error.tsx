'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 静默处理 async/await 相关错误
    if (error.message?.includes('async/await is not yet supported in Client Components') ||
        error.message?.includes('A component was suspended by an uncached promise') ||
        error.message?.includes('Creating promises inside a Client Component')) {
      // 静默处理，不显示错误
      return;
    }
    
    // 对于其他错误，可以选择记录或处理
    console.log('Error caught:', error);
  }, [error]);

  // 对于 async/await 错误，静默处理
  if (error.message?.includes('async/await is not yet supported in Client Components') ||
      error.message?.includes('A component was suspended by an uncached promise') ||
      error.message?.includes('Creating promises inside a Client Component')) {
    return null; // 不渲染任何内容，静默处理
  }

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
