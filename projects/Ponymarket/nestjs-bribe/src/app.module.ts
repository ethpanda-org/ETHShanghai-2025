import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HelloModule } from './hello/hello.module';
import { PriceModule } from './price/price.module';
import { MarketsModule } from './markets/markets.module';
import { PonyModule } from './pony/pony.module';

/**
 * 应用根模块
 *
 * 只负责导入功能模块，保持简洁
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HelloModule,
    PriceModule,
    MarketsModule,
    PonyModule,
  ],
})
export class AppModule {}
