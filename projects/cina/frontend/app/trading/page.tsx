'use client';

import TradingChart from '@/components/TradingChart';
import OrderBook from '@/components/OrderBook';
import TradingPanel from '@/components/TradingPanel';
import AccountInfo from '@/components/AccountInfo';
import { PriceProvider } from '@/contexts/PriceContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 禁用静态优化，因为此页面需要实时数据
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

export default function TradingPage() {
  const router = useRouter();
  const [symbol, setSymbol] = useState('ETHUSDT');
  const [leverage, setLeverage] = useState(20);
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);

  // 检测回退到首页的情况 - 强制刷新方案
  useEffect(() => {
    // 设置页面离开时的标记
    const handleBeforeUnload = () => {
      sessionStorage.setItem('tradingPageLeft', 'true');
    };

    // 监听回退操作
    const handlePopState = () => {
      console.log('PopState detected in trading page');
      // 立即设置标记
      sessionStorage.setItem('tradingPageLeft', 'true');
      
      // 延迟检查并刷新
      setTimeout(() => {
        const currentPath = window.location.pathname;
        console.log('Current path after popstate:', currentPath);
        
        if (currentPath === '/') {
          console.log('Back to home detected, forcing refresh...');
          window.location.reload();
        }
      }, 50);
    };

    // 监听页面隐藏/显示
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem('tradingPageLeft', 'true');
      } else if (document.visibilityState === 'visible') {
        const leftTrading = sessionStorage.getItem('tradingPageLeft');
        const currentPath = window.location.pathname;
        
        if (leftTrading === 'true' && currentPath === '/') {
          console.log('Back to home after leaving trading, refreshing...');
          sessionStorage.removeItem('tradingPageLeft');
          window.location.reload();
        }
      }
    };

    // 添加所有事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="h-screen bg-[#0A0B0D] text-white flex flex-col overflow-hidden">
      {/* 顶部导航栏 - AsterDEX 风格 */}
      <div className="h-14 bg-[#0E1013] border-b border-[#1E2329] flex items-center px-2 md:px-4 flex-shrink-0">
        <div className="flex items-center space-x-2 md:space-x-6">
          <button 
            onClick={() => setShowSymbolSelector(true)}
            className="flex items-center space-x-2 hover:bg-[#1E2329] px-2 py-1 rounded transition-colors"
          >
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-base md:text-lg">{symbol}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <span className="bg-[#14B8A6]/20 text-[#14B8A6] text-xs px-2 py-0.5 rounded hidden md:inline">永续合约</span>
          </button>
          
          <div className="hidden md:flex items-center space-x-6 text-sm">
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
            <div className="h-8 w-px bg-[#1E2329]"></div>
            <div>
              <div className="text-gray-500 text-xs">指数价格</div>
              <div className="text-white font-medium">
                {symbol === 'BTCUSDT' ? '106,972.0' :
                 symbol === 'ETHUSDT' ? '3,888.11' :
                 symbol === 'BNBUSDT' ? '689.32' :
                 symbol === 'SOLUSDT' ? '238.54' :
                 symbol === 'XRPUSDT' ? '2.8401' : '---'}
              </div>
            </div>
            <div className="h-8 w-px bg-[#1E2329]"></div>
            <div>
              <div className="text-gray-500 text-xs">24h涨跌</div>
              <div className="text-[#14B8A6] font-medium">+2.58%</div>
            </div>
            <div className="h-8 w-px bg-[#1E2329]"></div>
            <div>
              <div className="text-gray-500 text-xs">24h最高</div>
              <div className="text-white font-medium">
                {symbol === 'BTCUSDT' ? '107,030.9' :
                 symbol === 'ETHUSDT' ? '3,926.00' :
                 symbol === 'BNBUSDT' ? '695.12' :
                 symbol === 'SOLUSDT' ? '242.89' :
                 symbol === 'XRPUSDT' ? '2.8956' : '---'}
              </div>
            </div>
            <div className="h-8 w-px bg-[#1E2329]"></div>
            <div>
              <div className="text-gray-500 text-xs">24h最低</div>
              <div className="text-white font-medium">
                {symbol === 'BTCUSDT' ? '104,250.5' :
                 symbol === 'ETHUSDT' ? '3,712.51' :
                 symbol === 'BNBUSDT' ? '675.89' :
                 symbol === 'SOLUSDT' ? '230.15' :
                 symbol === 'XRPUSDT' ? '2.7234' : '---'}
              </div>
            </div>
            <div className="h-8 w-px bg-[#1E2329]"></div>
            <div>
              <div className="text-gray-500 text-xs">24h成交量</div>
              <div className="text-white font-medium">
                {symbol === 'BTCUSDT' ? '12.21B' :
                 symbol === 'ETHUSDT' ? '3.93M' :
                 symbol === 'BNBUSDT' ? '567K' :
                 symbol === 'SOLUSDT' ? '892K' :
                 symbol === 'XRPUSDT' ? '1.56B' : '---'}
              </div>
            </div>
          </div>
          
          {/* 移动端显示 */}
          <div className="md:hidden flex items-center space-x-3 text-xs ml-auto">
            <div>
              <div className="text-[#14B8A6] font-medium">+2.58%</div>
            </div>
            <button 
              onClick={() => router.push(`/chart?symbol=${symbol}`)}
              className="p-2 hover:bg-[#1E2329] rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 - 三列布局 */}
      <PriceProvider symbol={symbol}>
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* 左列：K线图 + 交易量（桌面端显示） */}
          <div className="hidden md:flex flex-1 flex-col min-w-0">
            <TradingChart symbol={symbol} />
          </div>

          {/* 中间列：订单簿（桌面端显示） */}
          <div className="hidden md:flex w-[300px] flex-col border-l border-[#1E2329] flex-shrink-0">
            <OrderBook symbol={symbol} />
          </div>

          {/* 右列：交易面板 + 账户信息（桌面端） */}
          <div className="hidden md:flex w-[380px] flex-col border-l border-[#1E2329] flex-shrink-0">
            {/* 交易面板（开仓按钮等） */}
            <div className="h-[60%] border-b border-[#1E2329] min-h-0 overflow-y-auto">
              <TradingPanel 
                symbol={symbol} 
                leverage={leverage}
                onLeverageChange={setLeverage}
              />
            </div>

            {/* 账户信息 */}
            <div className="h-[40%] min-h-0">
              <AccountInfo />
            </div>
          </div>
        
          {/* 移动端：交易面板 */}
          <div className="md:hidden flex-1 flex flex-col min-h-0">
            <TradingPanel 
              symbol={symbol} 
              leverage={leverage}
              onLeverageChange={setLeverage}
              isMobile={true}
            />
          </div>
        </div>
      </PriceProvider>

      {/* 合约选择模态框 - AsterDEX 风格 */}
      {showSymbolSelector && (
        <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50">
          <div className="bg-[#0E1013] rounded-t-2xl md:rounded-lg w-full md:w-[500px] max-h-[70vh] flex flex-col">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-[#1E2329]">
              <h3 className="text-lg font-medium">选择合约</h3>
              <button
                onClick={() => setShowSymbolSelector(false)}
                className="p-2 hover:bg-[#1E2329] rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 合约列表 */}
            <div className="flex-1 overflow-y-auto">
              {AVAILABLE_SYMBOLS.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    setSymbol(item.symbol);
                    setShowSymbolSelector(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 hover:bg-[#1E2329] transition-colors ${
                    symbol === item.symbol ? 'bg-[#1E2329]' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-left">
                      <div className="font-medium">{item.symbol}</div>
                      <div className="text-sm text-gray-400">{item.name}</div>
                    </div>
                  </div>
                  {symbol === item.symbol && (
                    <svg className="w-5 h-5 text-[#14B8A6]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* 底部说明 */}
            <div className="p-4 border-t border-[#1E2329] bg-[#0A0B0D]">
              <p className="text-xs text-gray-400 text-center">
                支持更多合约交易对，实时价格更新
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

