#!/usr/bin/env python3
"""
API集成适配器
API Integration Adapter

将新的统一API客户端集成到现有交易系统中，提供无缝升级路径
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional

from polymarket.api.unified_api_client import get_unified_api_client, UnifiedAPIClient
from polymarket.utils.logging_utils import get_logger, async_log_execution_time

logger = get_logger(__name__)

class EnhancedAPIIntegrationAdapter:
    """增强API集成适配器"""
    
    def __init__(self, enable_new_api: bool = True, fallback_to_legacy: bool = True):
        self.enable_new_api = enable_new_api
        self.fallback_to_legacy = fallback_to_legacy
        
        # API客户端
        self.unified_client: Optional[UnifiedAPIClient] = None
        self.legacy_clients = {}
        
        # 统计信息
        self.api_usage_stats = {
            'unified_api_calls': 0,
            'legacy_api_calls': 0,
            'fallback_activations': 0,
            'total_errors': 0
        }
        
        logger.info("API集成适配器初始化完成")
    
    async def initialize(self):
        """初始化适配器"""
        
        if self.enable_new_api:
            try:
                self.unified_client = await get_unified_api_client()
                logger.info("统一API客户端已启用")
            except Exception as e:
                logger.error(f"统一API客户端初始化失败: {e}")
                if not self.fallback_to_legacy:
                    raise
        
        # 如果需要，初始化传统客户端
        if self.fallback_to_legacy or not self.enable_new_api:
            await self._initialize_legacy_clients()
            logger.info("传统API客户端已准备")
    
    async def _initialize_legacy_clients(self):
        """初始化传统客户端"""
        
        try:
            # 导入现有的数据获取器
            from enhanced_simulation_trading import EnhancedPolymarketDataFetcher
            from hybrid_data_fetcher import HybridPolymarketDataFetcher
            from polymarket.data.graphql_client import PolymarketGraphQLClient
            
            # 创建传统客户端实例（但不立即初始化）
            self.legacy_clients = {
                'enhanced': EnhancedPolymarketDataFetcher,
                'hybrid': HybridPolymarketDataFetcher,
                'graphql': PolymarketGraphQLClient
            }
            
        except ImportError as e:
            logger.warning(f"部分传统客户端不可用: {e}")
    
    @async_log_execution_time
    async def fetch_active_markets(self, limit: int = 20, **kwargs) -> List[Dict]:
        """获取活跃市场数据 - 统一接口"""
        
        # 尝试使用新的统一API
        if self.enable_new_api and self.unified_client:
            try:
                markets = await self.unified_client.fetch_markets(limit=limit)
                
                if markets:
                    self.api_usage_stats['unified_api_calls'] += 1
                    logger.debug(f"统一API成功获取 {len(markets)} 个市场")
                    return self._normalize_market_data(markets, 'unified')
                
            except Exception as e:
                logger.warning(f"统一API获取失败: {e}")
                self.api_usage_stats['total_errors'] += 1
                
                if not self.fallback_to_legacy:
                    raise
        
        # 回退到传统API
        if self.fallback_to_legacy:
            return await self._fetch_markets_legacy(limit, **kwargs)
        
        return []
    
    async def _fetch_markets_legacy(self, limit: int, **kwargs) -> List[Dict]:
        """使用传统API获取市场数据"""
        
        self.api_usage_stats['fallback_activations'] += 1
        logger.info("启用传统API回退机制")
        
        # 尝试混合数据获取器
        try:
            if 'hybrid' in self.legacy_clients:
                async with self.legacy_clients['hybrid'](
                    use_proxy=kwargs.get('use_proxy', True),
                    offline_mode=kwargs.get('offline_mode', False),
                    proxy_manager_port=kwargs.get('proxy_manager_port', 33335)
                ) as fetcher:
                    
                    markets = await fetcher.fetch_active_markets(limit)
                    
                    if markets:
                        self.api_usage_stats['legacy_api_calls'] += 1
                        logger.debug(f"混合API成功获取 {len(markets)} 个市场")
                        return self._normalize_market_data(markets, 'hybrid')
        
        except Exception as e:
            logger.warning(f"混合API获取失败: {e}")
            self.api_usage_stats['total_errors'] += 1
        
        # 尝试增强数据获取器
        try:
            if 'enhanced' in self.legacy_clients:
                async with self.legacy_clients['enhanced'](
                    use_proxy=kwargs.get('use_proxy', True),
                    offline_mode=kwargs.get('offline_mode', False),
                    proxy_manager_port=kwargs.get('proxy_manager_port', 33335)
                ) as fetcher:
                    
                    markets = await fetcher.fetch_active_markets(limit)
                    
                    if markets:
                        self.api_usage_stats['legacy_api_calls'] += 1
                        logger.debug(f"增强API成功获取 {len(markets)} 个市场")
                        return self._normalize_market_data(markets, 'enhanced')
        
        except Exception as e:
            logger.warning(f"增强API获取失败: {e}")
            self.api_usage_stats['total_errors'] += 1
        
        logger.error("所有API获取方式都失败")
        return []
    
    def _normalize_market_data(self, markets: List[Dict], source: str) -> List[Dict]:
        """标准化市场数据格式"""
        
        normalized_markets = []
        
        for market in markets:
            normalized_market = {
                'market_id': market.get('id', market.get('market_id', 'unknown')),
                'title': market.get('title', market.get('question', 'Unknown Market')),
                'price': market.get('price', 0.5),
                'volume_24h': market.get('volume_24h', market.get('volume', 0)),
                'category': market.get('category', 'Unknown'),
                'outcomes': market.get('outcomes', []),
                'end_date': market.get('end_date', market.get('end_date_iso')),
                'liquidity': market.get('liquidity', 0),
                'metadata': {
                    'source': source,
                    'timestamp': datetime.now().isoformat(),
                    'original_data': market
                }
            }
            
            # 确保价格字段的有效性
            if not normalized_market['price'] or normalized_market['price'] <= 0:
                if normalized_market['outcomes']:
                    # 尝试从outcomes获取价格
                    try:
                        first_outcome = normalized_market['outcomes'][0]
                        if isinstance(first_outcome, dict) and 'price' in first_outcome:
                            normalized_market['price'] = float(first_outcome['price'])
                    except (IndexError, KeyError, ValueError):
                        pass
                
                # 如果还是没有有效价格，使用默认值
                if not normalized_market['price'] or normalized_market['price'] <= 0:
                    normalized_market['price'] = 0.5
            
            normalized_markets.append(normalized_market)
        
        logger.debug(f"标准化了 {len(normalized_markets)} 个市场数据 (来源: {source})")
        return normalized_markets
    
    async def get_market_details(self, market_id: str, **kwargs) -> Optional[Dict]:
        """获取市场详细信息"""
        
        # 尝试统一API
        if self.enable_new_api and self.unified_client:
            try:
                # 统一API暂时不支持单个市场详情，使用传统方式
                pass
            except Exception as e:
                logger.warning(f"统一API获取市场详情失败: {e}")
        
        # 使用传统API
        try:
            if 'enhanced' in self.legacy_clients:
                async with self.legacy_clients['enhanced'](
                    use_proxy=kwargs.get('use_proxy', True),
                    offline_mode=kwargs.get('offline_mode', False)
                ) as fetcher:
                    
                    # 获取所有市场并筛选
                    markets = await fetcher.fetch_active_markets(100)
                    
                    for market in markets:
                        if market.get('id') == market_id or market.get('market_id') == market_id:
                            return self._normalize_market_data([market], 'enhanced')[0]
        
        except Exception as e:
            logger.error(f"获取市场详情失败: {e}")
        
        return None
    
    async def get_api_performance_report(self) -> Dict:
        """获取API性能报告"""
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "usage_statistics": self.api_usage_stats.copy(),
            "api_status": {
                "unified_api_enabled": self.enable_new_api,
                "legacy_fallback_enabled": self.fallback_to_legacy,
                "unified_api_healthy": False,
                "legacy_api_available": len(self.legacy_clients) > 0
            },
            "performance_metrics": {}
        }
        
        # 获取统一API性能指标
        if self.unified_client:
            try:
                unified_report = await self.unified_client.get_performance_report()
                report["performance_metrics"]["unified_api"] = unified_report
                report["api_status"]["unified_api_healthy"] = (
                    unified_report["summary"]["overall_success_rate"] > 0.8
                )
            except Exception as e:
                logger.warning(f"获取统一API性能报告失败: {e}")
        
        # 计算成功率
        total_calls = (
            self.api_usage_stats['unified_api_calls'] + 
            self.api_usage_stats['legacy_api_calls']
        )
        
        if total_calls > 0:
            success_rate = (total_calls - self.api_usage_stats['total_errors']) / total_calls
            report["overall_success_rate"] = success_rate
        else:
            report["overall_success_rate"] = 0.0
        
        # 建议
        recommendations = []
        
        if self.api_usage_stats['fallback_activations'] > 5:
            recommendations.append("统一API频繁失败，建议检查网络连接或端点配置")
        
        if self.api_usage_stats['total_errors'] > 10:
            recommendations.append("错误数较高，建议检查API配置和网络状态")
        
        if not self.enable_new_api:
            recommendations.append("建议启用统一API以获得更好的性能")
        
        report["recommendations"] = recommendations
        
        return report
    
    async def test_all_apis(self) -> Dict[str, bool]:
        """测试所有API的可用性"""
        
        results = {}
        
        # 测试统一API
        if self.unified_client:
            try:
                markets = await self.unified_client.fetch_markets(limit=1)
                results["unified_api"] = len(markets) > 0
            except Exception as e:
                logger.debug(f"统一API测试失败: {e}")
                results["unified_api"] = False
        else:
            results["unified_api"] = False
        
        # 测试传统API
        for api_name, api_class in self.legacy_clients.items():
            try:
                if api_name == 'hybrid':
                    async with api_class(use_proxy=False, offline_mode=True) as client:
                        markets = await client.fetch_active_markets(1)
                        results[f"legacy_{api_name}"] = len(markets) > 0
                
                elif api_name == 'enhanced':
                    async with api_class(use_proxy=False, offline_mode=True) as client:
                        markets = await client.fetch_active_markets(1)
                        results[f"legacy_{api_name}"] = len(markets) > 0
                
                else:
                    # GraphQL或其他客户端
                    results[f"legacy_{api_name}"] = False  # 暂时跳过复杂测试
                    
            except Exception as e:
                logger.debug(f"传统API {api_name} 测试失败: {e}")
                results[f"legacy_{api_name}"] = False
        
        logger.info(f"API可用性测试完成: {results}")
        return results
    
    async def shutdown(self):
        """关闭适配器"""
        
        if self.unified_client:
            try:
                await self.unified_client.shutdown()
                logger.info("统一API客户端已关闭")
            except Exception as e:
                logger.error(f"关闭统一API客户端失败: {e}")
        
        # 传统客户端会在上下文管理器中自动关闭
        logger.info("API集成适配器已关闭")

# 便捷接口函数
async def get_enhanced_api_adapter(**kwargs) -> EnhancedAPIIntegrationAdapter:
    """获取增强API集成适配器实例"""
    
    adapter = EnhancedAPIIntegrationAdapter(**kwargs)
    await adapter.initialize()
    return adapter

async def fetch_markets_unified(limit: int = 20, **kwargs) -> List[Dict]:
    """统一的市场数据获取接口"""
    
    adapter = await get_enhanced_api_adapter()
    
    try:
        return await adapter.fetch_active_markets(limit=limit, **kwargs)
    finally:
        await adapter.shutdown()

async def main():
    """演示和测试"""
    print("=== API集成适配器测试 ===")
    
    # 创建适配器
    adapter = await get_enhanced_api_adapter(
        enable_new_api=True,
        fallback_to_legacy=True
    )
    
    try:
        # 测试所有API
        print("[1] 测试API可用性...")
        api_status = await adapter.test_all_apis()
        for api_name, available in api_status.items():
            status = "✓" if available else "✗"
            print(f"  {api_name}: {status}")
        
        # 获取市场数据
        print("[2] 获取市场数据...")
        markets = await adapter.fetch_active_markets(limit=3)
        print(f"获取到 {len(markets)} 个市场")
        
        # 显示第一个市场的详细信息
        if markets:
            market = markets[0]
            print(f"示例市场:")
            print(f"  ID: {market['market_id']}")
            print(f"  标题: {market['title'][:50]}...")
            print(f"  价格: {market['price']}")
            print(f"  成交量: {market['volume_24h']}")
            print(f"  数据源: {market['metadata']['source']}")
        
        # 获取性能报告
        print("[3] 性能报告...")
        report = await adapter.get_api_performance_report()
        print(f"统一API调用: {report['usage_statistics']['unified_api_calls']}")
        print(f"传统API调用: {report['usage_statistics']['legacy_api_calls']}")
        print(f"回退激活: {report['usage_statistics']['fallback_activations']}")
        print(f"总体成功率: {report['overall_success_rate']:.1%}")
        
        if report['recommendations']:
            print("建议:")
            for rec in report['recommendations']:
                print(f"  - {rec}")
    
    finally:
        await adapter.shutdown()
    
    print("\n=== API集成适配器测试完成 ===")

if __name__ == "__main__":
    asyncio.run(main())