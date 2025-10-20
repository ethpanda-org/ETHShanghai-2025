/**
 * 连接状态指示器
 * 显示 WebSocket 实时数据流的连接状态
 */

'use client';

import { useEffect, useState } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  label?: string;
  showDot?: boolean;
}

export default function ConnectionStatus({ 
  isConnected, 
  label = '实时数据', 
  showDot = true 
}: ConnectionStatusProps) {
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  return (
    <div className="flex items-center space-x-1.5 text-[10px]">
      {showDot && (
        <div className="relative flex items-center justify-center">
          {/* 连接点 */}
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isConnected ? 'bg-[#14B8A6]' : 'bg-gray-600'
            }`}
          />
          {/* 脉冲效果 */}
          {isConnected && showPulse && (
            <div className="absolute w-2 h-2 rounded-full bg-[#14B8A6] animate-ping opacity-75" />
          )}
        </div>
      )}
      
      <span className={`transition-colors duration-300 ${
        isConnected ? 'text-[#14B8A6]' : 'text-gray-500'
      }`}>
        {label}
      </span>
    </div>
  );
}

/**
 * 使用示例：
 * 
 * const [isConnected, setIsConnected] = useState(false);
 * 
 * // 在 WebSocket 连接时
 * ws.onConnect(() => setIsConnected(true));
 * ws.onError(() => setIsConnected(false));
 * 
 * // 渲染
 * <ConnectionStatus isConnected={isConnected} label="价格" />
 */

