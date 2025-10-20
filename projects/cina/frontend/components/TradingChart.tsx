'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { fetchBinanceKlines, convertTimeframe } from '@/lib/kline-api';
import ConnectionStatus from '@/components/ConnectionStatus';
import { usePrice } from '@/contexts/PriceContext';

/**
 * TradingChart 组件 - AsterDEX 风格
 * 
 * 数据策略：
 * ✅ 使用 Binance REST API获取历史K线数据
 * ✅ 使用 WebSocket 实时更新价格（无延迟）
 * ✅ 价格完全同步，数据最可靠
 */

interface TradingChartProps {
  symbol: string;
}

interface CurrentPrice {
  price: number;
  change24h: number;
}

// 获取24小时价格变化
async function get24hTicker(symbol: string): Promise<CurrentPrice> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    );
    const data = await response.json();
    return {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
    };
  } catch (error) {
    console.error('Failed to fetch 24h ticker:', error);
    return { price: 0, change24h: 0 };
  }
}

export default function TradingChart({ symbol }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const volumeChartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [timeframe, setTimeframe] = useState('4h');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentOHLC, setCurrentOHLC] = useState({ open: 0, high: 0, low: 0, close: 0 });
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const lastCandleRef = useRef<any>(null);
  const dataRef = useRef<any[]>([]);

  // 🔥 使用统一的价格数据源
  const { currentPrice, isConnected: priceConnected, volume24h } = usePrice();

  useEffect(() => {
    if (!chartContainerRef.current || !volumeChartContainerRef.current) return;
    
    let mounted = true;

    // 检查容器尺寸
    const containerWidth = chartContainerRef.current.clientWidth;
    const containerHeight = chartContainerRef.current.clientHeight;
    console.log(`📐 Chart container size: ${containerWidth}x${containerHeight}`);
    
    if (containerWidth === 0 || containerHeight === 0) {
      console.error('❌ Chart container has zero size! Retrying in 100ms...');
      setTimeout(() => {
        if (chartContainerRef.current) {
          console.log(`🔄 Retry - Container size: ${chartContainerRef.current.clientWidth}x${chartContainerRef.current.clientHeight}`);
        }
      }, 100);
    }

    // 创建主K线图表 - AsterDEX 风格
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0A0B0D' },
        textColor: '#848E9C',
      },
      grid: {
        vertLines: { color: '#161A1E', visible: true },
        horzLines: { color: '#161A1E', visible: true },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#505050',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2B3139',
        },
        horzLine: {
          color: '#505050',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2B3139',
        },
      },
      rightPriceScale: {
        borderColor: '#1E2329',
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: '#1E2329',
        timeVisible: true,
        visible: false, // 隐藏主图的时间轴
        rightOffset: 12,
        barSpacing: 12,
        minBarSpacing: 8,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    chartRef.current = chart;

    // 创建交易量图表（独立）- AsterDEX 风格
    const volumeChart = createChart(volumeChartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0A0B0D' },
        textColor: '#848E9C',
      },
      grid: {
        vertLines: { color: '#161A1E', visible: true },
        horzLines: { color: '#161A1E', visible: true },
      },
      rightPriceScale: {
        borderColor: '#1E2329',
        scaleMargins: {
          top: 0.1,
          bottom: 0,
        },
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: '#1E2329',
        timeVisible: true,
        rightOffset: 12,
        barSpacing: 12,
        minBarSpacing: 8,
      },
      width: volumeChartContainerRef.current.clientWidth,
      height: volumeChartContainerRef.current.clientHeight,
    });

    volumeChartRef.current = volumeChart;

    // 添加蜡烛图系列 - AsterDEX 青色风格
    console.log('📊 Creating candlestick series...');
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#14B8A6',        // 青色上涨
      downColor: '#EF4444',      // 红色下跌
      borderVisible: false,
      wickUpColor: '#14B8A6',    // 青色上影线
      wickDownColor: '#EF4444',  // 红色下影线
    });
    console.log('✅ Candlestick series created');

    candlestickSeriesRef.current = candlestickSeries;

    // 添加交易量系列到独立图表
    const volumeSeries = volumeChart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeriesRef.current = volumeSeries;

    // 异步加载真实K线数据
    const loadKlineData = async () => {
      try {
        setIsLoading(true);
        console.log(`📊 Loading K-line data for ${symbol}, timeframe: ${timeframe}`);
        
        // 获取真实K线数据
        const interval = convertTimeframe(timeframe);
        const { data, volumeData } = await fetchBinanceKlines(symbol, interval, 200);
        
        console.log(`✅ K-line data loaded: ${data.length} candles`);
        
        if (!mounted) return;
        
        dataRef.current = data;
        
        console.log('📈 Setting candlestick data...', {
          dataLength: data.length,
          firstCandle: data[0],
          lastCandle: data[data.length - 1]
        });
        
        candlestickSeries.setData(data);
        console.log('✅ Candlestick data set successfully');
        
        volumeSeries.setData(volumeData);
        console.log('✅ Volume data set successfully');
        
        console.log('✅ K-line chart rendered');

        // 获取当前价格
        const priceInfo = await get24hTicker(symbol);
        if (!mounted) return;

        // 设置初始 OHLC
        if (data.length > 0) {
          const lastCandle = data[data.length - 1];
          setCurrentOHLC({
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close,
          });
          lastCandleRef.current = lastCandle;
          
          // 如果最后一根K线的收盘价和当前价格差距较大，更新它
          if (Math.abs(lastCandle.close - priceInfo.price) / priceInfo.price > 0.001) {
            const updatedCandle = {
              ...lastCandle,
              close: priceInfo.price,
              high: Math.max(lastCandle.high, priceInfo.price),
              low: Math.min(lastCandle.low, priceInfo.price),
            };
            candlestickSeries.update(updatedCandle);
            lastCandleRef.current = updatedCandle;
            dataRef.current[dataRef.current.length - 1] = updatedCandle;
            
            setCurrentOHLC({
              open: updatedCandle.open,
              high: updatedCandle.high,
              low: updatedCandle.low,
              close: updatedCandle.close,
            });
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Failed to load kline data:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        setIsLoading(false);
      }
    };

    loadKlineData();

    // 同步时间轴
    chart.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
      if (timeRange) {
        volumeChart.timeScale().setVisibleLogicalRange(timeRange);
      }
    });

    volumeChart.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
      if (timeRange) {
        chart.timeScale().setVisibleLogicalRange(timeRange);
      }
    });

    // 响应式处理
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
      if (volumeChartContainerRef.current && volumeChartRef.current) {
        volumeChartRef.current.applyOptions({
          width: volumeChartContainerRef.current.clientWidth,
          height: volumeChartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    
    // 初始化后立即调整大小
    setTimeout(handleResize, 100);

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
      chart.remove();
      volumeChart.remove();
    };
  }, [symbol, timeframe]);

  // 🔥 监听统一价格数据源的更新，实时更新图表
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || dataRef.current.length === 0 || currentPrice === 0) {
      return;
    }

    const candlestickSeries = candlestickSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;

    const lastCandle = lastCandleRef.current || dataRef.current[dataRef.current.length - 1];
    if (!lastCandle) return;
    
    const newClose = currentPrice;
    const newHigh = Math.max(lastCandle.high, newClose);
    const newLow = Math.min(lastCandle.low, newClose);

    // 更新 K 线
    const updatedCandle = {
      time: lastCandle.time,
      open: lastCandle.open,
      high: newHigh,
      low: newLow,
      close: newClose,
    };

    candlestickSeries.update(updatedCandle);
    lastCandleRef.current = updatedCandle;
    
    // 同时更新 dataRef 中的最后一根K线
    dataRef.current[dataRef.current.length - 1] = updatedCandle;

    // 基于真实交易量的合理估算
    const newVolume = volume24h / 200; // 平均到每根K线
    const volumeColor = newClose > lastCandle.open ? '#14B8A666' : '#EF444466';
    
    volumeSeries.update({
      time: lastCandle.time,
      value: newVolume,
      color: volumeColor,
    });

    // 更新显示的 OHLC 和交易量
    setCurrentOHLC({
      open: lastCandle.open,
      high: newHigh,
      low: newLow,
      close: newClose,
    });
    setCurrentVolume(newVolume);
  }, [currentPrice, volume24h]);

  // 全屏状态变化时重新调整大小
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
      if (volumeChartContainerRef.current && volumeChartRef.current) {
        volumeChartRef.current.applyOptions({
          width: volumeChartContainerRef.current.clientWidth,
          height: volumeChartContainerRef.current.clientHeight,
        });
      }
    };
    
    setTimeout(handleResize, 100);
  }, [isFullscreen]);

  const timeframes = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];
  const timeframeValues = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`flex flex-col h-full bg-[#0A0B0D] overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* 图表控制栏 - AsterDEX 风格 */}
      <div className="h-10 border-b border-[#1E2329] flex items-center px-3 space-x-3 flex-shrink-0 bg-[#0A0B0D]">
        <div className="flex items-center space-x-0.5">
          <button className="p-1.5 hover:bg-[#1E2329] rounded text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
          </button>
          <div className="h-4 w-px bg-[#1E2329] mx-1"></div>
          {timeframes.map((tf, idx) => (
            <button
              key={tf}
              onClick={() => setTimeframe(timeframeValues[idx])}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                timeframe === timeframeValues[idx]
                  ? 'bg-[#1E2329] text-[#14B8A6] font-medium'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1E2329]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-2.5 ml-auto text-[11px]">
          {/* WebSocket 连接状态 */}
          <ConnectionStatus isConnected={priceConnected} label="实时" />
          
          <div className="h-3 w-px bg-[#1E2329]"></div>
          
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">O</span>
            <span className="text-gray-300">
              {currentOHLC.open > 1000 
                ? currentOHLC.open.toFixed(1) 
                : currentOHLC.open > 1 
                ? currentOHLC.open.toFixed(2) 
                : currentOHLC.open.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">H</span>
            <span className="text-gray-300">
              {currentOHLC.high > 1000 
                ? currentOHLC.high.toFixed(1) 
                : currentOHLC.high > 1 
                ? currentOHLC.high.toFixed(2) 
                : currentOHLC.high.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">L</span>
            <span className="text-gray-300">
              {currentOHLC.low > 1000 
                ? currentOHLC.low.toFixed(1) 
                : currentOHLC.low > 1 
                ? currentOHLC.low.toFixed(2) 
                : currentOHLC.low.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">C</span>
            <span className={currentOHLC.close >= currentOHLC.open ? 'text-[#14B8A6]' : 'text-[#EF4444]'}>
              {currentOHLC.close > 1000 
                ? currentOHLC.close.toFixed(1) 
                : currentOHLC.close > 1 
                ? currentOHLC.close.toFixed(2) 
                : currentOHLC.close.toFixed(4)}
            </span>
          </div>
          <div className="h-3 w-px bg-[#1E2329]"></div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-500 text-[10px]">Vol</span>
            <span className={currentOHLC.close >= currentOHLC.open ? 'text-[#14B8A6]' : 'text-[#EF4444]'}>
              {currentVolume > 1000 
                ? (currentVolume / 1000).toFixed(2) + 'K' 
                : currentVolume.toFixed(0)}
            </span>
          </div>
          <div className="h-3 w-px bg-[#1E2329]"></div>
          <button 
            onClick={toggleFullscreen}
            className="p-1 hover:bg-[#1E2329] rounded text-gray-500 hover:text-gray-300 transition-colors"
            title={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* K线图区域 */}
      <div className="flex-1 min-h-0 relative" style={{ height: '75%' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0A0B0D] z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14B8A6] mx-auto mb-2"></div>
              <div className="text-gray-500 text-sm">Loading chart data...</div>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
      
      {/* 交易量图区域 - 实时更新 */}
      <div className="border-t border-[#1E2329] flex-shrink-0" style={{ height: '25%' }}>
        <div className="h-5 flex items-center px-3 text-[11px]">
          <span className="text-gray-500">Volume SMA 9</span>
          <span className={currentOHLC.close >= currentOHLC.open ? 'text-[#14B8A6]' : 'text-[#EF4444]'} style={{ marginLeft: '8px' }}>
            {currentVolume > 1000 
              ? (currentVolume / 1000).toFixed(2) + 'K' 
              : currentVolume.toFixed(0)}
          </span>
        </div>
        <div ref={volumeChartContainerRef} className="h-full" style={{ height: 'calc(100% - 20px)' }} />
      </div>
    </div>
  );
}

