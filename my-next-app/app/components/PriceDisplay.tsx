'use client';

import { useState, useEffect } from 'react';

interface PriceData {
  symbol: string;
  price: string;
  lastUpdate: string;
}

interface PriceDisplayProps {
  tradingPair: string;
  privateKey: string;
}

export default function PriceDisplay({ tradingPair, privateKey }: PriceDisplayProps) {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async () => {
    if (!tradingPair) return;
    if (!privateKey || privateKey.trim().length === 0) {
      setError('请先在左侧表单输入私钥');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 将交易对格式转换为后端API期望的格式 (ETH/USDC -> ETH-USDC)
      const pairFormatted = tradingPair.replace('/', '-');
      
      // 调用后端API获取价格 (POST 携带私钥)
      const response = await fetch(`http://localhost:8080/api/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: pairFormatted, private_key: privateKey })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || '获取价格失败');
      }
      
      const data = await response.json();
      
      // 格式化价格显示
      let formattedPrice = '0.00';
      if (data.price && typeof data.price === 'number') {
        if (data.price < 0.01) {
          // 对于非常小的价格，使用科学计数法或显示更多小数位
          formattedPrice = data.price.toExponential(4);
        } else if (data.price < 1) {
          // 对于小于1的价格，显示6位小数
          formattedPrice = data.price.toFixed(6);
        } else {
          // 对于正常价格，显示2位小数
          formattedPrice = data.price.toFixed(2);
        }
      }
      
      setPriceData({
        symbol: tradingPair,
        price: formattedPrice,
        lastUpdate: new Date().toLocaleTimeString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取价格失败');
      console.error('Price fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tradingPair && privateKey) {
      fetchPrice();
      // 每5秒更新一次价格
      const interval = setInterval(fetchPrice, 5000);
      return () => clearInterval(interval);
    }
  }, [tradingPair, privateKey]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">实时价格</h3>
        <button
          onClick={fetchPrice}
          disabled={isLoading || !privateKey}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
        >
          {isLoading ? '更新中...' : '刷新'}
        </button>
      </div>

      <div className="text-center">
        {error ? (
          <div className="text-red-600 dark:text-red-400">
            <p className="text-sm">❌ {error}</p>
            <p className="text-xs mt-1">请检查后端服务是否运行，以及私钥是否有效</p>
          </div>
        ) : priceData ? (
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {priceData.symbol}
            </div>
            <div className="text-3xl font-mono text-green-600 dark:text-green-400 mb-2">
              ${parseFloat(priceData.price).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              最后更新: {priceData.lastUpdate}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm">请输入交易对与私钥以获取价格</p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
