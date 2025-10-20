import { Test, TestingModule } from '@nestjs/testing';
import { PriceService } from './price.service';
import { MockPriceOracle } from './oracles/mock-price-oracle.service';
import { PRICE_ORACLE } from './interfaces/price-oracle.interface';

/**
 * PriceService 单元测试
 *
 * 演示如何在测试中替换 PriceOracle 实现
 */
describe('PriceService', () => {
  let service: PriceService;
  let mockOracle: MockPriceOracle;

  beforeEach(async () => {
    /**
     * 创建测试模块
     *
     * 这里手动指定使用 MockPriceOracle
     * 而不依赖环境变量
     */
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceService,
        {
          provide: PRICE_ORACLE, // 提供 Token
          useClass: MockPriceOracle, // 强制使用 Mock 实现
        },
      ],
    }).compile();

    service = module.get<PriceService>(PriceService);

    // 获取 MockOracle 实例，用于手动设置价格
    mockOracle = module.get<MockPriceOracle>(PRICE_ORACLE);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * 测试基本功能：获取价格
   */
  it('should get price from oracle', async () => {
    const price = await service.getPrice('BTC');
    expect(price).toBe(50000); // Mock 默认价格
  });

  /**
   * 测试核心功能：手动控制价格
   *
   * 这是使用 Mock 的关键优势
   */
  it('should allow manual price control in tests', async () => {
    // 1. 设置价格
    mockOracle.setPrice('BTC', 70000);

    // 2. 验证价格已改变
    const price = await service.getPrice('BTC');
    expect(price).toBe(70000);

    // 3. 再次修改
    mockOracle.setPrice('BTC', 40000);
    const newPrice = await service.getPrice('BTC');
    expect(newPrice).toBe(40000);
  });

  /**
   * 测试业务逻辑：价格阈值检查
   *
   * 通过手动控制价格来测试不同场景
   */
  describe('isPriceAboveThreshold', () => {
    it('should return true when price is above threshold', async () => {
      // 设置 BTC 价格为 70000
      mockOracle.setPrice('BTC', 70000);

      // 检查是否超过 60000
      const result = await service.isPriceAboveThreshold('BTC', 60000);
      expect(result).toBe(true);
    });

    it('should return false when price is below threshold', async () => {
      // 设置 BTC 价格为 40000
      mockOracle.setPrice('BTC', 40000);

      // 检查是否超过 60000
      const result = await service.isPriceAboveThreshold('BTC', 60000);
      expect(result).toBe(false);
    });
  });

  /**
   * 测试投资组合计算
   */
  it('should calculate portfolio value correctly', async () => {
    // 设置测试价格
    mockOracle.setPrices({
      BTC: 50000,
      ETH: 3000,
    });

    // 计算组合价值：2 BTC + 10 ETH
    const value = await service.calculatePortfolioValue({
      BTC: 2,
      ETH: 10,
    });

    // 2 * 50000 + 10 * 3000 = 130000
    expect(value).toBe(130000);
  });

  /**
   * 测试价格变动场景
   *
   * 模拟价格从低到高的变化
   */
  it('should handle price changes over time', async () => {
    const prices: number[] = [];

    // 模拟价格上涨
    for (const price of [45000, 50000, 55000, 60000]) {
      mockOracle.setPrice('BTC', price);
      prices.push(await service.getPrice('BTC'));
    }

    expect(prices).toEqual([45000, 50000, 55000, 60000]);
  });
});
