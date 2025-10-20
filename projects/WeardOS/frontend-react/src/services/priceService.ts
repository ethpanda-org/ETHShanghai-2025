import axios from 'axios';

interface TokenPrice {
  usd: number;
  usd_24h_change: number;
}

interface PriceResponse {
  [key: string]: TokenPrice;
}

class PriceService {
  private baseURL = 'https://api.coingecko.com/api/v3';
  private cache = new Map<string, { price: TokenPrice; timestamp: number }>();
  private cacheTimeout = 60000; // 1分钟缓存

  // CoinGecko代币ID映射
  private tokenIdMap: { [key: string]: string } = {
    'ETH': 'ethereum',
    'BTC': 'bitcoin',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'MATIC': 'matic-network',
    'UNI': 'uniswap',
    'LINK': 'chainlink',
    'AAVE': 'aave',
    'COMP': 'compound-governance-token',
    'MKR': 'maker',
    'SNX': 'havven',
    'CRV': 'curve-dao-token',
    'YFI': 'yearn-finance',
    'SUSHI': 'sushi',
    'CAKE': 'pancakeswap-token',
    'BUSD': 'binance-usd'
  };

  /**
   * 获取单个代币价格
   */
  async getTokenPrice(symbol: string): Promise<TokenPrice | null> {
    const tokenId = this.tokenIdMap[symbol.toUpperCase()];
    if (!tokenId) {
      console.warn(`未找到代币 ${symbol} 的价格映射`);
      return null;
    }

    // 检查缓存
    const cached = this.cache.get(tokenId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.price;
    }

    try {
      const response = await axios.get<PriceResponse>(
        `${this.baseURL}/simple/price`,
        {
          params: {
            ids: tokenId,
            vs_currencies: 'usd',
            include_24hr_change: true
          },
          timeout: 10000
        }
      );

      const priceData = response.data[tokenId];
      if (priceData) {
        // 更新缓存
        this.cache.set(tokenId, {
          price: priceData,
          timestamp: Date.now()
        });
        return priceData;
      }
    } catch (error) {
      console.error(`获取 ${symbol} 价格失败:`, error);
    }

    return null;
  }

  /**
   * 批量获取代币价格
   */
  async getMultipleTokenPrices(symbols: string[]): Promise<{ [symbol: string]: TokenPrice }> {
    const tokenIds = symbols
      .map(symbol => this.tokenIdMap[symbol.toUpperCase()])
      .filter(Boolean);

    if (tokenIds.length === 0) {
      return {};
    }

    try {
      const response = await axios.get<PriceResponse>(
        `${this.baseURL}/simple/price`,
        {
          params: {
            ids: tokenIds.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true
          },
          timeout: 15000
        }
      );

      const result: { [symbol: string]: TokenPrice } = {};
      
      // 将结果映射回原始符号
      Object.entries(this.tokenIdMap).forEach(([symbol, tokenId]) => {
        if (response.data[tokenId]) {
          result[symbol] = response.data[tokenId];
          
          // 更新缓存
          this.cache.set(tokenId, {
            price: response.data[tokenId],
            timestamp: Date.now()
          });
        }
      });

      return result;
    } catch (error) {
      console.error('批量获取代币价格失败:', error);
      return {};
    }
  }

  /**
   * 获取ETH价格（最常用）
   */
  async getETHPrice(): Promise<number> {
    const priceData = await this.getTokenPrice('ETH');
    return priceData?.usd || 0;
  }

  /**
   * 计算代币的USD价值
   */
  calculateTokenValue(balance: number, price: number): number {
    return balance * price;
  }

  /**
   * 清除价格缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取支持的代币列表
   */
  getSupportedTokens(): string[] {
    return Object.keys(this.tokenIdMap);
  }
}

export const priceService = new PriceService();
export default priceService;