/**
 * @file 应用引导程序
 * @description 负责在应用启动时初始化所有必要的模块、服务和事件监听器。
 */
import 'reflect-metadata'; // 必须首先导入以支持 tsyringe
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import logger from './lib/logger';
import { httpClient } from './lib/axios';
import { config } from './config';

// AquaFlux DeFi Services
import { AssetService } from './modules/asset/asset.service';

/**
 * 初始化应用程序级别的服务和监听器。
 * 使用 tsyringe DI 容器来自动管理依赖关系。
 * 只应在应用程序启动时调用一次。
 */
export function bootstrapApp(): void {
  // 1. 注册需要手动创建或配置的实例 (单例)
  container.register<PrismaClient>('PrismaClient', { useValue: new PrismaClient() });
  container.register('Logger', { useValue: logger });
  container.register('EventEmitter', { useValue: new EventEmitter() });
  container.register('HttpClient', { useValue: httpClient });
  container.register('AppConfig', { useValue: config });

  // 3. 注册 AquaFlux DeFi 服务
  container.registerSingleton(AssetService);

  logger.info('🚀 AquaFlux DeFi application bootstrapped with DI container.');
  logger.info('✅ Authentication service registered: User');
  logger.info('✅ DeFi services registered: Assets, Swap, Structure, Portfolio');
}
