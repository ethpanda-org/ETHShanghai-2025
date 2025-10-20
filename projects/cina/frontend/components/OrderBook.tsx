'use client';

import { useEffect, useState, useRef } from 'react';
import { BinanceWebSocket } from '@/lib/binance-websocket';
import { usePrice } from '@/contexts/PriceContext';

interface OrderBookProps {
  symbol: string;
}

// 获取初始订单簿快照（仅首次加载）
async function fetchOrderBookSnapshot(symbol: string, limit: number = 100) {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`
    );
    const data = await response.json();
    return {
      bids: data.bids, // [[price, amount], ...]
      asks: data.asks,
    };
  } catch (error) {
    console.error('Failed to fetch order book snapshot:', error);
    return { bids: [], asks: [] };
  }
}

interface Order {
  price: number;
  amount: number;
  total: number;
}

// 不同合约的基础价格
const getBasePrice = (symbol: string): number => {
  const prices: { [key: string]: number } = {
    'BTCUSDT': 106961.2,
    'ETHUSDT': 3889.08,
    'BNBUSDT': 689.45,
    'SOLUSDT': 238.67,
    'XRPUSDT': 2.84,
    'ADAUSDT': 1.08,
    'DOGEUSDT': 0.38,
    'AVAXUSDT': 42.5,
    'MATICUSDT': 0.52,
    'DOTUSDT': 7.25,
    'LINKUSDT': 23.8,
    'UNIUSDT': 14.5,
    'ATOMUSDT': 10.2,
    'LTCUSDT': 108.5,
    'ETCUSDT': 28.9,
    'NEARUSDT': 5.45,
    'APTUSDT': 12.3,
    'ARBUSDT': 0.89,
    'OPUSDT': 2.15,
    'SUIUSDT': 4.28,
  };
  return prices[symbol] || 100;
};

export default function OrderBook({ symbol }: OrderBookProps) {
  const [asks, setAsks] = useState<Order[]>([]);
  const [bids, setBids] = useState<Order[]>([]);
  const orderbookRef = useRef<{ bids: Map<string, string>, asks: Map<string, string> }>({
    bids: new Map(),
    asks: new Map(),
  });

  // 🔥 使用统一的价格数据源
  const { currentPrice } = usePrice();

  useEffect(() => {
    let mounted = true;
    let orderbookWs: BinanceWebSocket | null = null;

    // 初始化：获取订单簿快照
    const initOrderBook = async () => {
      try {
        const snapshot = await fetchOrderBookSnapshot(symbol, 100);
        
        if (!mounted) return;

        // 初始化本地订单簿
        orderbookRef.current.bids.clear();
        orderbookRef.current.asks.clear();

        snapshot.bids.forEach(([price, amount]: [string, string]) => {
          orderbookRef.current.bids.set(price, amount);
        });

        snapshot.asks.forEach(([price, amount]: [string, string]) => {
          orderbookRef.current.asks.set(price, amount);
        });

        updateOrderBookDisplay();

        // 🚀 订阅WebSocket实时更新（100ms刷新）
        orderbookWs = new BinanceWebSocket(symbol);
        
        orderbookWs.connectOrderBook((update) => {
          if (!mounted) return;

          // 更新买单
          update.bids.forEach(([price, amount]: [string, string]) => {
            if (parseFloat(amount) === 0) {
              orderbookRef.current.bids.delete(price);
            } else {
              orderbookRef.current.bids.set(price, amount);
            }
          });

          // 更新卖单
          update.asks.forEach(([price, amount]: [string, string]) => {
            if (parseFloat(amount) === 0) {
              orderbookRef.current.asks.delete(price);
            } else {
              orderbookRef.current.asks.set(price, amount);
            }
          });

          updateOrderBookDisplay();
        }, '100ms');

        orderbookWs.onConnect(() => {
          console.log('✅ OrderBook WebSocket connected');
        });

        orderbookWs.onError((error) => {
          console.error('❌ OrderBook feed error:', error);
        });

      } catch (error) {
        console.error('Failed to initialize order book:', error);
      }
    };

    // 更新显示
    const updateOrderBookDisplay = () => {
      // 转换为数组并排序
      const bidsArray = Array.from(orderbookRef.current.bids.entries())
        .map(([price, amount]) => {
          const p = parseFloat(price);
          const a = parseFloat(amount);
          return { price: p, amount: a, total: p * a };
        })
        .sort((a, b) => b.price - a.price) // 买单从高到低
        .slice(0, 30);

      const asksArray = Array.from(orderbookRef.current.asks.entries())
        .map(([price, amount]) => {
          const p = parseFloat(price);
          const a = parseFloat(amount);
          return { price: p, amount: a, total: p * a };
        })
        .sort((a, b) => b.price - a.price) // 卖单从高到低
        .slice(0, 30);

      setBids(bidsArray);
      setAsks(asksArray);
    };

    // 启动订单簿订阅
    initOrderBook();

    return () => {
      mounted = false;
      if (orderbookWs) orderbookWs.close();
    };
  }, [symbol]);

  const maxTotal = Math.max(
    ...asks.map(o => o.total),
    ...bids.map(o => o.total)
  );

  const OrderRow = ({ 
    order, 
    type 
  }: { 
    order: Order; 
    type: 'ask' | 'bid' 
  }) => {
    const percentage = (order.total / maxTotal) * 100;
    
    return (
      <div className="relative h-[17px] hover:bg-[#1E2329]/50 cursor-pointer group transition-colors">
        {/* 背景条 - AsterDEX 青色/红色 */}
        <div
          className={`absolute inset-y-0 right-0 transition-all ${
            type === 'ask' ? 'bg-[#EF4444]/10' : 'bg-[#14B8A6]/10'
          }`}
          style={{ width: `${percentage}%` }}
        />
        
        {/* 内容 */}
        <div className="relative flex items-center justify-between px-2.5 text-[10.5px] h-full leading-none">
          <span className={`font-medium ${type === 'ask' ? 'text-[#EF4444]' : 'text-[#14B8A6]'}`}>
            {order.price > 1000 ? order.price.toFixed(1) : 
             order.price > 1 ? order.price.toFixed(2) : 
             order.price.toFixed(4)}
          </span>
          <span className="text-gray-400 text-right min-w-[55px]">
            {order.amount.toFixed(3)}
          </span>
          <span className="text-gray-500 text-right min-w-[48px]">
            {order.total.toFixed(0)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0B0D]">
      {/* 头部 - 紧凑设计 */}
      <div className="h-8 border-b border-[#1E2329] flex items-center justify-between px-2.5 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-medium text-white">订单簿</span>
          <button className="text-[9px] text-gray-400 hover:text-white px-1.5 py-0.5 bg-[#1E2329]/50 hover:bg-[#1E2329] rounded transition-colors">
            0.01
          </button>
        </div>
        
        <div className="flex items-center space-x-1">
          <button className="p-1 hover:bg-[#1E2329] rounded transition-colors">
            <div className="w-2.5 h-2.5 flex flex-col justify-center space-y-0.5">
              <div className="h-0.5 bg-[#EF4444]"></div>
              <div className="h-0.5 bg-[#14B8A6]"></div>
            </div>
          </button>
        </div>
      </div>

      {/* 表头 - 更紧凑 */}
      <div className="h-6 flex items-center justify-between px-2.5 text-[9.5px] text-gray-500 border-b border-[#1E2329]/50 flex-shrink-0">
        <span>价格(USDT)</span>
        <span>数量</span>
        <span>总额</span>
      </div>

      {/* 订单簿内容 */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* 卖单区域 */}
        <div className="flex-1 flex flex-col-reverse overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          {asks.map((order, idx) => (
            <OrderRow key={`ask-${idx}`} order={order} type="ask" />
          ))}
        </div>

        {/* 当前价格 - AsterDEX 风格 */}
        <div className="h-7 border-y border-[#1E2329] flex items-center justify-between px-2.5 bg-[#0E1013] flex-shrink-0">
          <div className="flex items-center space-x-1">
            <span className="text-[#14B8A6] text-[14px] font-bold">
              {currentPrice > 1000 ? currentPrice.toFixed(1) : 
               currentPrice > 1 ? currentPrice.toFixed(2) : 
               currentPrice.toFixed(4)}
            </span>
            <svg className="w-2.5 h-2.5 text-[#14B8A6]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-[9px] text-gray-500">
            ≈${currentPrice > 1000 ? currentPrice.toFixed(1) : 
              currentPrice > 1 ? currentPrice.toFixed(2) : 
              currentPrice.toFixed(4)}
          </span>
        </div>

        {/* 买单区域 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          {bids.map((order, idx) => (
            <OrderRow key={`bid-${idx}`} order={order} type="bid" />
          ))}
        </div>
      </div>

    </div>
  );
}

