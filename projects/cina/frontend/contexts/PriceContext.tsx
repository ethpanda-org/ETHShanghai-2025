/**
 * 全局价格数据上下文
 * 
 * 确保所有组件（K线图、订单簿、交易面板等）使用完全相同的实时价格
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { BinanceWebSocket, TickerData } from '@/lib/binance-websocket';

interface PriceContextValue {
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  isConnected: boolean;
  symbol: string;
}

const PriceContext = createContext<PriceContextValue | null>(null);

export function PriceProvider({ 
  symbol, 
  children 
}: { 
  symbol: string; 
  children: React.ReactNode 
}) {
  const [tickerData, setTickerData] = useState<TickerData>({
    symbol: symbol,
    price: 0,
    priceChange: 0,
    priceChangePercent: 0,
    high: 0,
    low: 0,
    open: 0,
    volume: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<BinanceWebSocket | null>(null);

  useEffect(() => {
    console.log(`🔄 PriceContext: Connecting to ${symbol}...`);
    
    // 先获取初始价格
    const fetchInitialPrice = async () => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
        );
        const data = await response.json();
        setTickerData({
          symbol: data.symbol,
          price: parseFloat(data.lastPrice),
          priceChange: parseFloat(data.priceChange),
          priceChangePercent: parseFloat(data.priceChangePercent),
          high: parseFloat(data.highPrice),
          low: parseFloat(data.lowPrice),
          open: parseFloat(data.openPrice),
          volume: parseFloat(data.volume),
        });
        console.log(`✅ Initial price loaded: ${data.lastPrice}`);
      } catch (error) {
        console.error('Failed to fetch initial price:', error);
      }
    };

    fetchInitialPrice();

    // 连接 WebSocket
    const ws = new BinanceWebSocket(symbol);
    wsRef.current = ws;

    ws.connectTicker((data) => {
      setTickerData(data);
      console.log(`📊 Price update: ${data.price.toFixed(2)}`);
    });

    ws.onConnect(() => {
      console.log('✅ PriceContext: WebSocket connected');
      setIsConnected(true);
    });

    ws.onError((error) => {
      console.error('❌ PriceContext: WebSocket error', error);
      setIsConnected(false);
    });

    return () => {
      console.log('🔌 PriceContext: Disconnecting...');
      ws.close();
    };
  }, [symbol]);

  const value: PriceContextValue = {
    currentPrice: tickerData.price,
    priceChange24h: tickerData.priceChange,
    priceChangePercent24h: tickerData.priceChangePercent,
    high24h: tickerData.high,
    low24h: tickerData.low,
    volume24h: tickerData.volume,
    isConnected,
    symbol,
  };

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrice() {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePrice must be used within a PriceProvider');
  }
  return context;
}

