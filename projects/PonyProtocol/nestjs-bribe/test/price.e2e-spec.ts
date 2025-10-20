import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MockPriceOracle } from '../src/price/oracles/mock-price-oracle.service';
import { PRICE_ORACLE } from '../src/price/interfaces/price-oracle.interface';

/**
 * Price API 端到端测试
 *
 * 正确的 E2E 测试写法：
 * 1. 通过 module.get() 直接获取 MockOracle 实例
 * 2. 用实例的方法控制测试数据
 * 3. 不需要暴露测试专用的 HTTP 接口
 */
describe('Price API (e2e)', () => {
  let app: INestApplication;
  let mockOracle: MockPriceOracle;

  beforeAll(async () => {
    /**
     * 设置测试环境
     * 确保使用 MockPriceOracle
     */
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    /**
     * 关键：直接从容器获取 MockOracle 实例
     * 这样就能调用 setPrice() 等测试方法
     */
    mockOracle = moduleFixture.get<MockPriceOracle>(PRICE_ORACLE);
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * 测试获取单个价格
   */
  it('/price?symbol=BTC (GET)', () => {
    return request(app.getHttpServer())
      .get('/price?symbol=BTC')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('price');
        expect(typeof res.body.price).toBe('number');
      });
  });

  /**
   * 测试获取多个价格
   */
  it('/price/multiple?symbols=BTC,ETH (GET)', () => {
    return request(app.getHttpServer())
      .get('/price/multiple?symbols=BTC,ETH')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('BTC');
        expect(res.body).toHaveProperty('ETH');
      });
  });

  /**
   * 测试计算投资组合
   */
  it('/price/portfolio (POST)', () => {
    return request(app.getHttpServer())
      .post('/price/portfolio')
      .send({ BTC: 2, ETH: 10 })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('totalValue');
        expect(typeof res.body.totalValue).toBe('number');
        expect(res.body.totalValue).toBeGreaterThan(0);
      });
  });

  /**
   * 测试手动控制价格（正确的 E2E 写法）
   *
   * 关键：直接调用 mockOracle.setPrice()
   * 而不是通过 HTTP 接口
   */
  it('should allow controlling price via mock oracle', async () => {
    // 1. 先获取原始价格
    const originalPrice = await request(app.getHttpServer())
      .get('/price?symbol=BTC')
      .expect(200);

    // 2. 直接调用实例方法设置价格（不走 HTTP）
    mockOracle.setPrice('BTC', 99999);

    // 3. 验证价格已改变
    const newPrice = await request(app.getHttpServer())
      .get('/price?symbol=BTC')
      .expect(200);

    expect(newPrice.body.price).toBe(99999);
    expect(newPrice.body.price).not.toBe(originalPrice.body.price);
  });

  /**
   * 测试完整的业务流程
   *
   * 模拟：价格变动 → 触发阈值检查 → 重新计算组合价值
   * 使用 mockOracle 直接控制价格，测试真实的业务接口
   */
  it('should handle complete price change workflow', async () => {
    // 1. 直接设置初始价格（不走 HTTP）
    mockOracle.setPrice('BTC', 50000);

    // 2. 计算初始组合价值（测试真实接口）
    const initialValue = await request(app.getHttpServer())
      .post('/price/portfolio')
      .send({ BTC: 1 });

    expect(initialValue.body.totalValue).toBe(50000);

    // 3. 模拟价格上涨（直接调用实例方法）
    mockOracle.setPrice('BTC', 70000);

    // 4. 重新计算，价值应该增加（测试真实接口）
    const newValue = await request(app.getHttpServer())
      .post('/price/portfolio')
      .send({ BTC: 1 });

    expect(newValue.body.totalValue).toBe(70000);
    expect(newValue.body.totalValue).toBeGreaterThan(
      initialValue.body.totalValue,
    );
  });
});
