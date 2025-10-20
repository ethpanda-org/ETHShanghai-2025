'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import TradingChart from '@/components/TradingChart';
import { PriceProvider } from '@/contexts/PriceContext';
import { useState, useEffect, Suspense } from 'react';

// 禁用静态优化，因为此页面需要实时数据和 URL 参数
export const dynamic = 'force-dynamic';

const AVAILABLE_SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'BTC/USDT', icon: '₿', basePrice: 106961 },
  { symbol: 'ETHUSDT', name: 'ETH/USDT', icon: 'Ξ', basePrice: 3889 },
  { symbol: 'BNBUSDT', name: 'BNB/USDT', icon: 'B', basePrice: 689 },
  { symbol: 'SOLUSDT', name: 'SOL/USDT', icon: 'S', basePrice: 238 },
  { symbol: 'XRPUSDT', name: 'XRP/USDT', icon: 'X', basePrice: 2.84 },
  { symbol: 'ADAUSDT', name: 'ADA/USDT', icon: 'A', basePrice: 1.08 },
  { symbol: 'DOGEUSDT', name: 'DOGE/USDT', icon: 'D', basePrice: 0.38 },
  { symbol: 'AVAXUSDT', name: 'AVAX/USDT', icon: 'A', basePrice: 42.5 },
  { symbol: 'MATICUSDT', name: 'MATIC/USDT', icon: 'M', basePrice: 0.52 },
  { symbol: 'DOTUSDT', name: 'DOT/USDT', icon: 'D', basePrice: 7.25 },
  { symbol: 'LINKUSDT', name: 'LINK/USDT', icon: 'L', basePrice: 23.8 },
  { symbol: 'UNIUSDT', name: 'UNI/USDT', icon: 'U', basePrice: 14.5 },
  { symbol: 'ATOMUSDT', name: 'ATOM/USDT', icon: 'A', basePrice: 10.2 },
  { symbol: 'LTCUSDT', name: 'LTC/USDT', icon: 'L', basePrice: 108.5 },
  { symbol: 'ETCUSDT', name: 'ETC/USDT', icon: 'E', basePrice: 28.9 },
  { symbol: 'NEARUSDT', name: 'NEAR/USDT', icon: 'N', basePrice: 5.45 },
  { symbol: 'APTUSDT', name: 'APT/USDT', icon: 'A', basePrice: 12.3 },
  { symbol: 'ARBUSDT', name: 'ARB/USDT', icon: 'A', basePrice: 0.89 },
  { symbol: 'OPUSDT', name: 'OP/USDT', icon: 'O', basePrice: 2.15 },
  { symbol: 'SUIUSDT', name: 'SUI/USDT', icon: 'S', basePrice: 4.28 },
];

function ChartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [symbol, setSymbol] = useState('ETHUSDT');

  useEffect(() => {
    const symbolParam = searchParams.get('symbol');
    if (symbolParam) {
      setSymbol(symbolParam);
    }
  }, [searchParams]);

  return (
    <PriceProvider symbol={symbol}>
      <div className="h-screen bg-[#0B0E11] text-white flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <div className="h-14 bg-[#0E1013] border-b border-[#1E2329] flex items-center px-4 flex-shrink-0">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-[#1E2329] rounded-lg mr-4 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-lg">{symbol}</span>
            <span className="bg-[#14B8A6]/20 text-[#14B8A6] text-xs px-2 py-0.5 rounded">永续合约</span>
          </div>
          
          <div className="ml-auto flex items-center space-x-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs">标记价格</div>
              <div className="text-white font-medium">
                {symbol === 'BTCUSDT' ? '106,961.2' :
                 symbol === 'ETHUSDT' ? '3,888.56' :
                 symbol === 'BNBUSDT' ? '689.45' :
                 symbol === 'SOLUSDT' ? '238.67' :
                 symbol === 'XRPUSDT' ? '2.8412' : '---'}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">24h涨跌</div>
              <div className="text-[#14B8A6] font-medium">+2.58%</div>
            </div>
          </div>
        </div>

        {/* 全屏K线图 */}
        <div className="flex-1 min-h-0">
          <TradingChart symbol={symbol} />
        </div>
      </div>
    </PriceProvider>
  );
}

export default function ChartPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#0B0E11] text-white flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    }>
      <ChartContent />
    </Suspense>
  );
}

