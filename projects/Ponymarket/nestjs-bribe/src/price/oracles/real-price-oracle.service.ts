import { Injectable } from '@nestjs/common';
import { IPriceOracle } from '../interfaces/price-oracle.interface';

/**
 * 真实价格预言机
 *
 * 生产环境使用，从真实的 API 获取价格数据
 * 这里用模拟延迟代替真实 API 调用
 */
@Injectable()
export class RealPriceOracle implements IPriceOracle {
  /**
   * 从外部 API 获取价格
   * 实际项目中这里会调用 CoinGecko、Binance 等 API
   */
  async getPrice(symbol: string): Promise<number> {
    // 模拟网络延迟
    await this.delay(100);

    // 模拟从 API 获取的价格数据
    // 实际项目中这里应该是 HTTP 请求
    const mockPrices: Record<string, number> = {
      BTC: 65000,
      ETH: 3500,
      SOL: 150,
    };

    const price = mockPrices[symbol.toUpperCase()];

    if (!price) {
      throw new Error(`Price not found for symbol: ${symbol}`);
    }

    return price;
  }

  /**
   * 工具方法：模拟异步延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
