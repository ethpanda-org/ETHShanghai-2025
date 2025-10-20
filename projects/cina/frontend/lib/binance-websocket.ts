/**
 * Binance WebSocket 实时数据流
 * 
 * 提供比REST API更快的实时数据更新
 * 文档: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
 */

export interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

export interface OrderBookUpdate {
  lastUpdateId: number;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][];
}

export interface TradeData {
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

/**
 * Binance WebSocket 管理器
 */
export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private symbol: string;
  private baseUrl = 'wss://stream.binance.com:9443/ws';
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isIntentionallyClosed = false;

  // 回调函数
  private onTickerCallback?: (data: TickerData) => void;
  private onOrderBookCallback?: (data: OrderBookUpdate) => void;
  private onTradeCallback?: (data: TradeData) => void;
  private onConnectCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(symbol: string) {
    this.symbol = symbol.toLowerCase();
  }

  /**
   * 连接到24小时Ticker流（实时价格）
   */
  connectTicker(callback: (data: TickerData) => void) {
    this.onTickerCallback = callback;
    const stream = `${this.symbol}@ticker`;
    this.connect(stream);
  }

  /**
   * 连接到订单簿深度流
   */
  connectOrderBook(callback: (data: OrderBookUpdate) => void, updateSpeed: '100ms' | '1000ms' = '100ms') {
    this.onOrderBookCallback = callback;
    const stream = updateSpeed === '100ms' 
      ? `${this.symbol}@depth@100ms` 
      : `${this.symbol}@depth`;
    this.connect(stream);
  }

  /**
   * 连接到交易流
   */
  connectTrade(callback: (data: TradeData) => void) {
    this.onTradeCallback = callback;
    const stream = `${this.symbol}@trade`;
    this.connect(stream);
  }

  /**
   * 连接到多个流
   */
  connectMultipleStreams(streams: string[]) {
    const url = `${this.baseUrl.replace('/ws', '/stream')}?streams=${streams.join('/')}`;
    this.connectToUrl(url);
  }

  /**
   * 设置回调函数
   */
  onConnect(callback: () => void) {
    this.onConnectCallback = callback;
  }

  onError(callback: (error: Error) => void) {
    this.onErrorCallback = callback;
  }

  /**
   * 基础连接方法
   */
  private connect(stream: string) {
    const url = `${this.baseUrl}/${stream}`;
    this.connectToUrl(url);
  }

  private connectToUrl(url: string) {
    try {
      this.isIntentionallyClosed = false;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`✅ Binance WebSocket connected: ${url}`);
        this.reconnectAttempts = 0;
        this.onConnectCallback?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Binance WebSocket error:', error);
        this.onErrorCallback?.(new Error('WebSocket error'));
      };

      this.ws.onclose = () => {
        console.log('🔌 Binance WebSocket closed');
        
        if (!this.isIntentionallyClosed) {
          this.attemptReconnect(url);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.onErrorCallback?.(error as Error);
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: any) {
    // 多流格式
    if (data.stream) {
      data = data.data;
    }

    // 24小时Ticker
    if (data.e === '24hrTicker') {
      const tickerData: TickerData = {
        symbol: data.s,
        price: parseFloat(data.c),
        priceChange: parseFloat(data.p),
        priceChangePercent: parseFloat(data.P),
        volume: parseFloat(data.v),
        high: parseFloat(data.h),
        low: parseFloat(data.l),
        open: parseFloat(data.o),
      };
      this.onTickerCallback?.(tickerData);
    }

    // 订单簿深度
    if (data.e === 'depthUpdate') {
      const orderBookData: OrderBookUpdate = {
        lastUpdateId: data.u,
        bids: data.b,
        asks: data.a,
      };
      this.onOrderBookCallback?.(orderBookData);
    }

    // 交易流
    if (data.e === 'trade') {
      const tradeData: TradeData = {
        price: parseFloat(data.p),
        quantity: parseFloat(data.q),
        time: data.T,
        isBuyerMaker: data.m,
      };
      this.onTradeCallback?.(tradeData);
    }
  }

  /**
   * 重连机制
   */
  private attemptReconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.onErrorCallback?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectToUrl(url);
    }, delay);
  }

  /**
   * 关闭连接
   */
  close() {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * 便捷方法：创建实时价格订阅
 */
export function subscribeToPrice(
  symbol: string,
  callback: (price: number, change24h: number) => void
): BinanceWebSocket {
  const ws = new BinanceWebSocket(symbol);
  
  ws.connectTicker((data) => {
    callback(data.price, data.priceChangePercent);
  });

  ws.onError((error) => {
    console.error('Price subscription error:', error);
  });

  return ws;
}

/**
 * 便捷方法：创建订单簿订阅
 */
export function subscribeToOrderBook(
  symbol: string,
  callback: (data: OrderBookUpdate) => void,
  updateSpeed: '100ms' | '1000ms' = '100ms'
): BinanceWebSocket {
  const ws = new BinanceWebSocket(symbol);
  
  ws.connectOrderBook(callback, updateSpeed);

  ws.onError((error) => {
    console.error('OrderBook subscription error:', error);
  });

  return ws;
}

/**
 * 便捷方法：创建K线订阅
 */
export function subscribeToKline(
  symbol: string,
  interval: string,
  callback: (data: any) => void
): BinanceWebSocket {
  const ws = new BinanceWebSocket(symbol);
  const stream = `${symbol.toLowerCase()}@kline_${interval}`;
  
  ws.connectMultipleStreams([stream]);

  // 手动添加K线处理
  (ws as any).onKlineCallback = callback;

  ws.onError((error) => {
    console.error('Kline subscription error:', error);
  });

  return ws;
}

