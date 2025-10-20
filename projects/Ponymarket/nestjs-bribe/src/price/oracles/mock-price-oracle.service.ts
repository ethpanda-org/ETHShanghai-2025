import { Injectable } from '@nestjs/common';
import { IPriceOracle } from '../interfaces/price-oracle.interface';

/**
 * Mock 价格预言机
 *
 * 测试环境使用，可以手动控制价格
 * 用于测试价格变动触发的业务逻辑
 */
@Injectable()
export class MockPriceOracle implements IPriceOracle {
  /**
   * 内存中存储的价格数据
   * 测试时可以通过 setPrice() 方法修改
   */
  private prices: Map<string, number> = new Map([
    ['BTC', 50000], // 默认测试价格
    ['ETH', 3000],
    ['SOL', 100],
  ]);

  /**
   * 获取价格（从内存读取）
   * 不会有网络延迟，测试更快
   */
  async getPrice(symbol: string): Promise<number> {
    const price = this.prices.get(symbol.toUpperCase());

    if (price === undefined) {
      throw new Error(`Price not found for symbol: ${symbol}`);
    }

    return price;
  }

  /**
   * 手动设置价格
   *
   * 这是 Mock 版本独有的方法
   * 测试时可以用来触发价格变动相关的逻辑
   *
   * @example
   * mockOracle.setPrice('BTC', 70000); // 模拟价格上涨
   * mockOracle.setPrice('ETH', 2000);  // 模拟价格下跌
   */
  setPrice(symbol: string, price: number): void {
    this.prices.set(symbol.toUpperCase(), price);
  }

  /**
   * 批量设置价格
   */
  setPrices(prices: Record<string, number>): void {
    Object.entries(prices).forEach(([symbol, price]) => {
      this.setPrice(symbol, price);
    });
  }

  /**
   * 重置所有价格到默认值
   */
  reset(): void {
    this.prices.clear();
    this.prices.set('BTC', 50000);
    this.prices.set('ETH', 3000);
    this.prices.set('SOL', 100);
  }
}
