import { Router } from 'express';

// AquaFlux DeFi 模块路由
import { configureAssetRoutes } from '@/modules/asset/asset.routes';
import { configureStructureRoutes } from '@/modules/structure/structure.routes';
import { configurePortfolioRoutes } from '@/modules/portfolio/portfolio.routes';

// 定义一个类型，让我们的配置更安全
type RouteConfig = {
  path: string;
  configure: (router: Router) => void;
};

// 所有的 v1 路由配置
const v1Routes: RouteConfig[] = [
  // AquaFlux DeFi 核心模块
  { path: '/assets', configure: configureAssetRoutes },
  { path: '/structure', configure: configureStructureRoutes },
  { path: '/portfolio', configure: configurePortfolioRoutes },
];

/**
 * 将所有 v1 版本的路由应用到主路由器上
 * @param router - 主 v1 路由器
 */
export const applyV1Routes = (router: Router): void => {
  v1Routes.forEach(route => {
    // 为每个模块创建一个专用的子路由器，以保持路径隔离
    const moduleRouter = Router();
    route.configure(moduleRouter);
    router.use(route.path, moduleRouter);
  });
};
