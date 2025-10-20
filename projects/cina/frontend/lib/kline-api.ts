/**
 * K线数据API工具
 * 
 * 提供K线数据获取接口，支持：
 * 1. 模拟数据（开发环境）
 * 2. Binance API（生产环境）
 * 3. 自定义后端API
 */

import { Time } from 'lightweight-charts';

export interface KlineData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeData {
  time: Time;
  value: number;
  color: string;
}

/**
 * 从 Binance API 获取K线数据
 * 文档：https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data
 */
export async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<{ data: KlineData[]; volumeData: VolumeData[] }> {
  try {
    console.log(`🔄 Fetching K-line from Binance: ${symbol}, interval: ${interval}, limit: ${limit}`);
    
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Binance API error: ${response.status} - ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const rawData = await response.json();
    console.log(`✅ Received ${rawData.length} candles from Binance`);

    // Binance API 返回格式：
    // [
    //   [
    //     1499040000000,      // 开盘时间
    //     "0.01634000",       // 开盘价
    //     "0.80000000",       // 最高价
    //     "0.01575800",       // 最低价
    //     "0.01577100",       // 收盘价
    //     "148976.11427815",  // 成交量
    //     1499644799999,      // 收盘时间
    //     "2434.19055334",    // 成交额
    //     308,                // 成交笔数
    //     "1756.87402397",    // 主动买入成交量
    //     "28.46694368",      // 主动买入成交额
    //     "17928899.62484339" // 忽略
    //   ]
    // ]

    const data: KlineData[] = rawData.map((candle: any[]) => ({
      time: Math.floor(candle[0] / 1000) as Time, // 毫秒转秒
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
    }));

    const volumeData: VolumeData[] = rawData.map((candle: any[]) => {
      const open = parseFloat(candle[1]);
      const close = parseFloat(candle[4]);
      return {
        time: Math.floor(candle[0] / 1000) as Time,
        value: parseFloat(candle[5]),
        color: close >= open ? '#14B8A666' : '#EF444466',
      };
    });

    return { data, volumeData };
  } catch (error) {
    console.error('Failed to fetch Binance kline data:', error);
    throw error;
  }
}

/**
 * 转换时间周期格式
 * 前端格式 -> Binance API 格式
 */
export function convertTimeframe(timeframe: string): string {
  const mapping: { [key: string]: string } = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
  };
  return mapping[timeframe] || '4h';
}

/**
 * 从自定义后端API获取K线数据
 * 替换为你自己的后端API地址
 */
export async function fetchCustomKlines(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<{ data: KlineData[]; volumeData: VolumeData[] }> {
  try {
    // TODO: 替换为你的后端API地址
    const response = await fetch(
      `/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // 假设后端返回格式与 Binance 相同
    return {
      data: result.data,
      volumeData: result.volumeData,
    };
  } catch (error) {
    console.error('Failed to fetch custom kline data:', error);
    throw error;
  }
}

/**
 * 生成固定的模拟K线数据（开发环境使用）
 * 使用固定种子保证每次刷新数据一致
 */
export function generateMockKlines(
  symbol: string,
  basePrice: number,
  timeframe: string,
  count: number = 200
): { data: KlineData[]; volumeData: VolumeData[] } {
  const data: KlineData[] = [];
  const volumeData: VolumeData[] = [];
  const priceRange = basePrice * 0.02;
  const now = Math.floor(Date.now() / 1000);
  
  // 时间间隔（秒）
  const intervalMap: { [key: string]: number } = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
    '1w': 604800,
  };
  const interval = intervalMap[timeframe] || 14400;

  // 固定种子随机数生成器
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  let currentPrice = basePrice * 0.98;
  let seed = symbol.charCodeAt(0) * 1000 + timeframe.charCodeAt(0);

  for (let i = count; i >= 1; i--) {
    const time = (now - i * interval) as Time;
    seed++;

    const open = currentPrice + (seededRandom(seed) - 0.5) * priceRange * 0.5;
    seed++;
    const close = open + (seededRandom(seed) - 0.5) * priceRange * 1.5;
    seed++;
    const high = Math.max(open, close) + seededRandom(seed) * priceRange * 0.5;
    seed++;
    const low = Math.min(open, close) - seededRandom(seed) * priceRange * 0.5;
    seed++;
    const volume = seededRandom(seed) * 5000 + 1000;

    data.push({ time, open, high, low, close });
    volumeData.push({
      time,
      value: volume,
      color: close >= open ? '#14B8A666' : '#EF444466',
    });

    currentPrice = close;
  }

  // 最新K线
  const lastTime = now as Time;
  const lastOpen = currentPrice;
  const lastClose = basePrice;
  const lastHigh = Math.max(lastOpen, lastClose);
  const lastLow = Math.min(lastOpen, lastClose);
  const lastVolume = 3000;

  data.push({
    time: lastTime,
    open: lastOpen,
    high: lastHigh,
    low: lastLow,
    close: lastClose,
  });

  volumeData.push({
    time: lastTime,
    value: lastVolume,
    color: lastClose >= lastOpen ? '#14B8A666' : '#EF444466',
  });

  return { data, volumeData };
}

