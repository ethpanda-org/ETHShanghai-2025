import { Injectable, Inject } from '@nestjs/common';
import { IPriceOracle, PRICE_ORACLE } from './interfaces/price-oracle.interface';

/**
 * 价格服务
 *
 * 业务逻辑层，提供价格相关的业务功能
 * 依赖 IPriceOracle 接口，不关心具体实现是真实还是 Mock
 */
@Injectable()
export class PriceService {
  constructor(
    /**
     * 注入 PriceOracle
     *
     * 关键点：
     * 1. 使用 @Inject(PRICE_ORACLE) 告诉 NestJS 注入哪个 Provider
     * 2. 类型声明为 IPriceOracle 接口，而不是具体实现类
     * 3. 运行时会根据 Module 配置注入 RealPriceOracle 或 MockPriceOracle
     */
    @Inject(PRICE_ORACLE) private readonly priceOracle: IPriceOracle,
  ) {}

  /**
   * 获取单个资产价格
   */
  async getPrice(symbol: string): Promise<number> {
    return this.priceOracle.getPrice(symbol);
  }

  /**
   * 获取多个资产价格
   */
  async getPrices(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    // 并发获取所有价格
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          prices[symbol] = await this.priceOracle.getPrice(symbol);
        } catch (error) {
          // 某个资产获取失败不影响其他资产
          console.error(`Failed to get price for ${symbol}:`, error);
        }
      }),
    );

    return prices;
  }

  /**
   * 计算资产总价值
   *
   * @param holdings 持仓数据，例如 { BTC: 2, ETH: 10 }
   * @returns 总价值（美元）
   */
  async calculatePortfolioValue(
    holdings: Record<string, number>,
  ): Promise<number> {
    let totalValue = 0;

    for (const [symbol, amount] of Object.entries(holdings)) {
      try {
        const price = await this.priceOracle.getPrice(symbol);
        totalValue += price * amount;
      } catch (error) {
        console.error(`Failed to calculate value for ${symbol}:`, error);
      }
    }

    return totalValue;
  }

  /**
   * 检查价格是否超过阈值
   * 这种业务逻辑在测试时需要手动控制价格来触发
   */
  async isPriceAboveThreshold(
    symbol: string,
    threshold: number,
  ): Promise<boolean> {
    const price = await this.priceOracle.getPrice(symbol);
    return price > threshold;
  }
}
