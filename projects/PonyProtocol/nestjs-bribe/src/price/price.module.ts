import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { RealPriceOracle } from './oracles/real-price-oracle.service';
import { MockPriceOracle } from './oracles/mock-price-oracle.service';
import { PRICE_ORACLE } from './interfaces/price-oracle.interface';

/**
 * 价格模块
 *
 * 核心配置：根据环境变量决定注入哪个 PriceOracle 实现
 */
@Module({
  controllers: [PriceController],
  providers: [
    PriceService,

    /**
     * 条件注入 PriceOracle
     *
     * 工作原理：
     * 1. provide: PRICE_ORACLE - 注册的 Token（就是前面 @Inject 里用的）
     * 2. useClass: 根据 NODE_ENV 选择实现类
     *    - 测试环境：MockPriceOracle（可手动控制价格）
     *    - 生产环境：RealPriceOracle（从 API 获取）
     * 3. NestJS 容器会自动 new 这个类并管理生命周期
     */
    {
      provide: PRICE_ORACLE,
      useClass:
        process.env.NODE_ENV === 'test' ? MockPriceOracle : RealPriceOracle,
    },
  ],
  exports: [
    PriceService,
    /**
     * 导出 PRICE_ORACLE
     * 如果其他模块需要直接访问 Oracle（比如测试模块），可以注入它
     */
    PRICE_ORACLE,
  ],
})
export class PriceModule {}
