#!/usr/bin/env python3
"""
Polymarket GraphQL客户端

用于替换REST API，通过GraphQL子图获取Polymarket数据
"""

import logging
from datetime import datetime, timedelta
from gql import Client, gql
from gql.transport.aiohttp import AIOHTTPTransport
from typing import Any, Dict, List, Optional

import aiohttp
import asyncio
import json


logger = logging.getLogger(__name__)

class PolymarketGraphQLClient:
    """Polymarket GraphQL客户端"""
    
    def __init__(self, use_proxy: bool = True, proxy_config: Optional[Dict] = None):
        """
        初始化GraphQL客户端
        
        Args:
            use_proxy: 是否使用代理
            proxy_config: 代理配置字典
        """
        self.use_proxy = use_proxy
        self.proxy_config = proxy_config or {}
        
        # Polymarket GraphQL Subgraph端点
        self.endpoints = {
            'orders': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn',
            'activity': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/activity-subgraph/0.0.4/gn',
            'positions': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/positions-subgraph/0.0.7/gn',
            'oi': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/oi-subgraph/0.0.6/gn',
            'pnl': 'https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/pnl-subgraph/0.0.14/gn'
        }
        
        self.clients = {}
        self.session = None
        
        logger.info(f"[GraphQL] 初始化Polymarket GraphQL客户端")
        logger.info(f"[GraphQL] 可用端点: {len(self.endpoints)}个")
        
    async def __aenter__(self):
        """异步上下文管理器入口"""
        await self._initialize_clients()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self._close_clients()
    
    async def _initialize_clients(self):
        """初始化GraphQL客户端"""
        connector_kwargs = {
            'limit': 10,
            'limit_per_host': 2,
            'ttl_dns_cache': 300,
            'force_close': True
        }
        
        # 配置代理
        headers = {
            'User-Agent': 'GraphQL Client/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        if self.use_proxy and self.proxy_config:
            # 添加代理配置
            connector_kwargs['trust_env'] = True
            logger.info(f"[GraphQL] 启用代理模式")
        
        connector = aiohttp.TCPConnector(**connector_kwargs)
        
        timeout = aiohttp.ClientTimeout(total=30, connect=15, sock_read=15)
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        )
        
        # 为每个端点创建GraphQL客户端
        for name, url in self.endpoints.items():
            try:
                # 使用简化的transport配置，不传递session
                transport = AIOHTTPTransport(url=url)
                
                client = Client(
                    transport=transport,
                    fetch_schema_from_transport=False  # 跳过schema获取以提高速度
                )
                
                self.clients[name] = client
                logger.debug(f"[GraphQL] 初始化 {name} 客户端: {url}")
                
            except Exception as e:
                logger.error(f"[GraphQL] 初始化 {name} 客户端失败: {e}")
        
        logger.info(f"[GraphQL] 成功初始化 {len(self.clients)} 个GraphQL客户端")
    
    async def _close_clients(self):
        """关闭所有客户端"""
        if self.session:
            await self.session.close()
            logger.info("[GraphQL] 客户端连接已关闭")
    
    async def test_endpoint_connectivity(self) -> Dict[str, bool]:
        """测试所有端点的连通性"""
        connectivity_results = {}
        
        logger.info("[GraphQL] 测试端点连通性...")
        
        for name, url in self.endpoints.items():
            try:
                # 简单的health check查询
                health_query = gql("""
                    query HealthCheck {
                        _meta {
                            block {
                                number
                                timestamp
                            }
                        }
                    }
                """)
                
                if name in self.clients:
                    result = await self.clients[name].execute_async(health_query)
                    connectivity_results[name] = True
                    
                    if result.get('_meta'):
                        block_info = result['_meta']['block']
                        logger.info(f"[GraphQL] {name}: 连接正常 (Block #{block_info['number']})")
                    else:
                        logger.info(f"[GraphQL] {name}: 连接正常")
                else:
                    connectivity_results[name] = False
                    logger.warning(f"[GraphQL] {name}: 客户端未初始化")
                    
            except Exception as e:
                connectivity_results[name] = False
                logger.error(f"[GraphQL] {name}: 连接失败 - {e}")
        
        working_endpoints = sum(connectivity_results.values())
        logger.info(f"[GraphQL] 连通性测试完成: {working_endpoints}/{len(self.endpoints)} 个端点可用")
        
        return connectivity_results
    
    async def fetch_market_data(self, limit: int = 20) -> List[Dict]:
        """
        获取市场数据 - 从多个子图聚合
        
        Args:
            limit: 返回市场数量限制
            
        Returns:
            市场数据列表，格式兼容现有REST API
        """
        try:
            # 尝试从orders子图获取市场数据
            market_data = await self._fetch_markets_from_orders(limit)
            
            if not market_data:
                # 备用：从activity子图获取
                market_data = await self._fetch_markets_from_activity(limit)
            
            if not market_data:
                logger.warning("[GraphQL] 所有子图均无法获取市场数据")
                return []
            
            # 数据格式转换
            converted_data = self._convert_to_rest_format(market_data)
            
            logger.info(f"[GraphQL] 成功获取 {len(converted_data)} 个市场数据")
            return converted_data
            
        except Exception as e:
            logger.error(f"[GraphQL] 获取市场数据失败: {e}")
            return []
    
    async def _fetch_markets_from_orders(self, limit: int) -> List[Dict]:
        """从orders子图获取市场数据"""
        if 'orders' not in self.clients:
            return []
        
        try:
            # 修正查询字段名，使用正确的schema
            query = gql(f"""
                query GetMarkets {{
                    markets(
                        first: {limit}
                        orderBy: volume
                        orderDirection: desc
                    ) {{
                        id
                        name
                        description
                        category
                        outcomes {{
                            id
                            name
                            price
                        }}
                        volume
                        liquidity
                        creator
                        createdAt
                    }}
                }}
            """)
            
            result = await self.clients['orders'].execute_async(query)
            return result.get('markets', [])
            
        except Exception as e:
            logger.error(f"[GraphQL] orders子图查询失败: {e}")
            # 尝试简化查询
            try:
                simple_query = gql(f"""
                    query GetSimpleMarkets {{
                        markets(first: {limit}) {{
                            id
                        }}
                    }}
                """)
                result = await self.clients['orders'].execute_async(simple_query)
                return result.get('markets', [])
            except Exception as e2:
                logger.error(f"[GraphQL] 简化查询也失败: {e2}")
                return []
    
    async def _fetch_markets_from_activity(self, limit: int) -> List[Dict]:
        """从activity子图获取市场数据"""
        if 'activity' not in self.clients:
            return []
        
        try:
            # 修正查询字段名
            query = gql(f"""
                query GetRecentActivity {{
                    trades(
                        first: {limit}
                        orderBy: timestamp
                        orderDirection: desc
                    ) {{
                        id
                        market {{
                            id
                            name
                        }}
                        outcome
                        side
                        size
                        price
                        timestamp
                        transactionHash
                    }}
                }}
            """)
            
            result = await self.clients['activity'].execute_async(query)
            return result.get('trades', [])
            
        except Exception as e:
            logger.error(f"[GraphQL] activity子图查询失败: {e}")
            # 尝试简化查询
            try:
                simple_query = gql(f"""
                    query GetSimpleTrades {{
                        trades(first: {limit}) {{
                            id
                            price
                        }}
                    }}
                """)
                result = await self.clients['activity'].execute_async(simple_query)
                return result.get('trades', [])
            except Exception as e2:
                logger.error(f"[GraphQL] 简化查询也失败: {e2}")
                return []
    
    def _convert_to_rest_format(self, graphql_data: List[Dict]) -> List[Dict]:
        """
        将GraphQL数据转换为REST API格式
        
        Args:
            graphql_data: GraphQL查询结果
            
        Returns:
            转换后的数据，兼容现有系统
        """
        converted_markets = []
        
        for item in graphql_data:
            try:
                # 检测数据类型并转换
                if 'market' in item and 'volume' in item:
                    # orders子图数据格式
                    market_info = self._convert_market_data(item)
                elif 'market' in item and 'price' in item:
                    # activity子图数据格式
                    market_info = self._convert_activity_data(item)
                else:
                    logger.warning(f"[GraphQL] 未知数据格式: {item}")
                    continue
                
                if market_info:
                    converted_markets.append(market_info)
                    
            except Exception as e:
                logger.error(f"[GraphQL] 数据转换失败: {e}")
                continue
        
        return converted_markets
    
    def _convert_market_data(self, market_data: Dict) -> Dict:
        """转换市场数据格式"""
        try:
            market_id = market_data.get('id')
            volume = float(market_data.get('volume', 0))
            name = market_data.get('name', f"Market {market_id[:8]}...")
            
            # 处理outcomes
            outcomes = market_data.get('outcomes', [])
            processed_outcomes = []
            
            default_price = 0.5
            if outcomes:
                yes_outcome = outcomes[0] if len(outcomes) > 0 else {}
                no_outcome = outcomes[1] if len(outcomes) > 1 else {}
                
                yes_price = float(yes_outcome.get('price', 0.5))
                no_price = float(no_outcome.get('price', 1 - yes_price))
                
                processed_outcomes = [
                    {
                        "name": yes_outcome.get('name', 'Yes'),
                        "price": yes_price,
                        "volume_24h": volume / 2,
                        "bid": yes_price * 0.98,
                        "ask": yes_price * 1.02,
                        "last_trade_price": yes_price
                    },
                    {
                        "name": no_outcome.get('name', 'No'),
                        "price": no_price,
                        "volume_24h": volume / 2,
                        "bid": no_price * 0.98,
                        "ask": no_price * 1.02,
                        "last_trade_price": no_price
                    }
                ]
                default_price = yes_price
            else:
                # 没有outcomes数据时的默认处理
                processed_outcomes = [
                    {
                        "name": "Yes",
                        "price": 0.5,
                        "volume_24h": volume / 2,
                        "bid": 0.49,
                        "ask": 0.51,
                        "last_trade_price": 0.5
                    },
                    {
                        "name": "No", 
                        "price": 0.5,
                        "volume_24h": volume / 2,
                        "bid": 0.49,
                        "ask": 0.51,
                        "last_trade_price": 0.5
                    }
                ]
            
            return {
                "market_id": market_id,
                "title": name,
                "description": market_data.get('description', ''),
                "category": market_data.get('category', 'Prediction'),
                "end_date": market_data.get('createdAt'),
                "volume": volume,
                "liquidity": float(market_data.get('liquidity', volume * 0.1)),
                "outcomes": processed_outcomes,
                "tags": [],
                "creator": market_data.get('creator', ''),
                "created_at": market_data.get('createdAt'),
                "price": default_price,
                "volume_24h": volume,
                "volatility": 0.3,
                "time_to_expiry": 30,
                "bid": default_price * 0.98,
                "ask": default_price * 1.02,
                "spread": default_price * 0.04
            }
            
        except Exception as e:
            logger.error(f"[GraphQL] 市场数据转换失败: {e}")
            return None
    
    def _convert_activity_data(self, activity_data: Dict) -> Dict:
        """转换活动数据格式"""
        try:
            # 处理新的trade数据结构
            market_info = activity_data.get('market', {})
            market_id = market_info.get('id') if isinstance(market_info, dict) else str(market_info)
            market_name = market_info.get('name', f"Market {market_id[:8]}...") if isinstance(market_info, dict) else f"Market {market_id[:8]}..."
            
            price = float(activity_data.get('price', 0.5))
            size = float(activity_data.get('size', 0))
            
            return {
                "market_id": market_id,
                "title": market_name,
                "description": "",
                "category": "Prediction",
                "end_date": None,
                "volume": size,
                "liquidity": size * 0.1,
                "outcomes": [
                    {
                        "name": "Yes",
                        "price": price,
                        "volume_24h": size,
                        "bid": price * 0.98,
                        "ask": price * 1.02,
                        "last_trade_price": price
                    },
                    {
                        "name": "No",
                        "price": 1 - price,
                        "volume_24h": size,
                        "bid": (1 - price) * 0.98,
                        "ask": (1 - price) * 1.02,
                        "last_trade_price": 1 - price
                    }
                ],
                "tags": [],
                "creator": "",
                "created_at": activity_data.get('timestamp'),
                "price": price,
                "volume_24h": size,
                "volatility": 0.3,
                "time_to_expiry": 30,
                "bid": price * 0.98,
                "ask": price * 1.02,
                "spread": price * 0.04
            }
            
        except Exception as e:
            logger.error(f"[GraphQL] 活动数据转换失败: {e}")
            return None
    
    async def get_market_positions(self, market_id: str) -> Dict:
        """获取特定市场的持仓数据"""
        if 'positions' not in self.clients:
            return {}
        
        try:
            query = gql(f"""
                query GetMarketPositions {{
                    positions(
                        where: {{
                            market: "{market_id}"
                        }}
                        first: 100
                    ) {{
                        id
                        user
                        market
                        outcomeIndex
                        quantityBought
                        quantitySold
                        avgPrice
                        realizedPnl
                        unrealizedPnl
                    }}
                }}
            """)
            
            result = await self.clients['positions'].execute_async(query)
            return result.get('positions', [])
            
        except Exception as e:
            logger.error(f"[GraphQL] 获取持仓数据失败: {e}")
            return {}
    
    async def get_market_activity(self, market_id: str, hours: int = 24) -> List[Dict]:
        """获取市场的最近活动"""
        if 'activity' not in self.clients:
            return []
        
        try:
            since_timestamp = int((datetime.now() - timedelta(hours=hours)).timestamp())
            
            query = gql(f"""
                query GetMarketActivity {{
                    orderFilledEvents(
                        where: {{
                            market: "{market_id}"
                            timestamp_gte: "{since_timestamp}"
                        }}
                        orderBy: timestamp
                        orderDirection: desc
                        first: 100
                    ) {{
                        id
                        market
                        side
                        size
                        price
                        timestamp
                        outcomeIndex
                        transactionHash
                    }}
                }}
            """)
            
            result = await self.clients['activity'].execute_async(query)
            return result.get('orderFilledEvents', [])
            
        except Exception as e:
            logger.error(f"[GraphQL] 获取市场活动失败: {e}")
            return []

async def test_graphql_client():
    """测试GraphQL客户端功能"""
    print("=== Polymarket GraphQL客户端测试 ===")
    
    async with PolymarketGraphQLClient(use_proxy=False) as client:
        print("\n1. 测试端点连通性...")
        connectivity = await client.test_endpoint_connectivity()
        
        for endpoint, status in connectivity.items():
            status_text = "[OK] 可用" if status else "[ERROR] 不可用"
            print(f"   {endpoint}: {status_text}")
        
        print("\n2. 测试市场数据获取...")
        markets = await client.fetch_market_data(limit=5)
        
        if markets:
            print(f"[SUCCESS] 成功获取 {len(markets)} 个市场数据")
            for i, market in enumerate(markets[:2], 1):
                print(f"   市场 {i}: {market['title']}")
                print(f"     ID: {market['market_id']}")
                print(f"     价格: {market['price']}")
                print(f"     成交量: {market['volume']}")
        else:
            print("[ERROR] 未获取到市场数据")
        
        print("\n3. 测试完成")

if __name__ == "__main__":
    asyncio.run(test_graphql_client())