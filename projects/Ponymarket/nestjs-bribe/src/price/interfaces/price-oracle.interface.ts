/**
 * 价格预言机接口
 *
 * 定义获取资产价格的标准方法
 * 生产环境和测试环境会有不同的实现
 */
export interface IPriceOracle {
  /**
   * 获取指定资产的当前价格
   * @param symbol 资产符号，例如 'BTC', 'ETH'
   * @returns 价格（美元）
   */
  getPrice(symbol: string): Promise<number>;
}

/**
 * Provider Token
 * 用于依赖注入时标识 PriceOracle
 */
export const PRICE_ORACLE = 'PRICE_ORACLE';
