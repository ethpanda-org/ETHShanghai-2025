#!/usr/bin/env python3
"""
高性能API集成系统
High-Performance API Integration System

提供统一的API接口，智能路由，连接池管理，缓存策略和错误恢复机制
"""

import asyncio
import json
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
import hashlib

import aiohttp
import aiofiles
from aiohttp_retry import RetryClient, ExponentialRetry

from src.polymarket.utils.logging_utils import get_logger, async_log_execution_time, async_retry_on_failure

logger = get_logger(__name__)

class APIEndpointType(Enum):
    """API端点类型"""
    REST = "rest"
    GRAPHQL = "graphql"
    WEBSOCKET = "websocket"
    CLOB = "clob"

class APIHealth(Enum):
    """API健康状态"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    UNKNOWN = "unknown"

@dataclass
class APIEndpoint:
    """API端点配置"""
    name: str
    url: str
    endpoint_type: APIEndpointType
    priority: int = 0  # 数字越小优先级越高
    max_concurrent: int = 10
    timeout: float = 30.0
    retry_attempts: int = 3
    retry_delay: float = 1.0
    rate_limit: int = 100  # 每分钟请求数
    headers: Dict[str, str] = field(default_factory=dict)
    auth_required: bool = False
    health_check_path: str = ""
    cache_ttl: int = 60  # 缓存TTL秒数

@dataclass
class RequestMetrics:
    """请求指标"""
    endpoint_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    success: bool = False
    response_time: float = 0.0
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    cache_hit: bool = False

@dataclass
class CacheEntry:
    """缓存条目"""
    data: Any
    timestamp: datetime
    ttl: int
    access_count: int = 0
    
    @property
    def is_expired(self) -> bool:
        return datetime.now() > self.timestamp + timedelta(seconds=self.ttl)

class ConnectionPoolManager:
    """连接池管理器"""
    
    def __init__(self, max_connections: int = 100, max_connections_per_host: int = 20):
        self.max_connections = max_connections
        self.max_connections_per_host = max_connections_per_host
        self.connectors: Dict[str, aiohttp.TCPConnector] = {}
        self.sessions: Dict[str, aiohttp.ClientSession] = {}
        
    async def get_session(self, endpoint_name: str, **session_kwargs) -> aiohttp.ClientSession:
        """获取或创建会话"""
        
        if endpoint_name not in self.sessions:
            # 创建连接器
            connector = aiohttp.TCPConnector(
                limit=self.max_connections,
                limit_per_host=self.max_connections_per_host,
                ttl_dns_cache=300,
                use_dns_cache=True,
                enable_cleanup_closed=True
            )
            
            self.connectors[endpoint_name] = connector
            
            # 创建会话
            session = aiohttp.ClientSession(
                connector=connector,
                timeout=aiohttp.ClientTimeout(total=30),
                **session_kwargs
            )
            
            self.sessions[endpoint_name] = session
            logger.debug(f"为端点 {endpoint_name} 创建新会话")
        
        return self.sessions[endpoint_name]
    
    async def close_all(self):
        """关闭所有会话和连接器"""
        for session in self.sessions.values():
            await session.close()
        
        for connector in self.connectors.values():
            await connector.close()
        
        self.sessions.clear()
        self.connectors.clear()

class IntelligentCache:
    """智能缓存系统"""
    
    def __init__(self, max_size: int = 10000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: Dict[str, CacheEntry] = {}
        self.access_times: deque = deque()
        
        # 缓存统计
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'total_requests': 0
        }
    
    def _generate_key(self, endpoint: str, method: str, url: str, params: Dict = None, data: Any = None) -> str:
        """生成缓存键"""
        key_data = {
            'endpoint': endpoint,
            'method': method,
            'url': url,
            'params': params or {},
            'data': str(data) if data else ""
        }
        
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]
    
    def get(self, endpoint: str, method: str, url: str, params: Dict = None, data: Any = None) -> Optional[Any]:
        """获取缓存数据"""
        key = self._generate_key(endpoint, method, url, params, data)
        self.stats['total_requests'] += 1
        
        if key in self.cache:
            entry = self.cache[key]
            
            if not entry.is_expired:
                entry.access_count += 1
                self.access_times.append((key, datetime.now()))
                self.stats['hits'] += 1
                
                logger.debug(f"缓存命中: {key[:8]}...")
                return entry.data
            else:
                # 缓存过期，删除
                del self.cache[key]
        
        self.stats['misses'] += 1
        return None
    
    def set(self, endpoint: str, method: str, url: str, data: Any, ttl: int = None, 
            params: Dict = None, request_data: Any = None):
        """设置缓存数据"""
        key = self._generate_key(endpoint, method, url, params, request_data)
        ttl = ttl or self.default_ttl
        
        # 检查缓存大小限制
        if len(self.cache) >= self.max_size:
            self._evict_least_recently_used()
        
        self.cache[key] = CacheEntry(
            data=data,
            timestamp=datetime.now(),
            ttl=ttl,
            access_count=1
        )
        
        logger.debug(f"缓存设置: {key[:8]}... (TTL: {ttl}s)")
    
    def _evict_least_recently_used(self):
        """淘汰最少使用的缓存项"""
        if not self.cache:
            return
        
        # 找到访问次数最少且最久未访问的项
        lru_key = min(
            self.cache.keys(),
            key=lambda k: (self.cache[k].access_count, self.cache[k].timestamp)
        )
        
        del self.cache[lru_key]
        self.stats['evictions'] += 1
        
        logger.debug(f"缓存淘汰: {lru_key[:8]}...")
    
    def clear_expired(self):
        """清理过期缓存"""
        expired_keys = [
            key for key, entry in self.cache.items()
            if entry.is_expired
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.debug(f"清理了 {len(expired_keys)} 个过期缓存项")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计"""
        hit_rate = self.stats['hits'] / max(self.stats['total_requests'], 1)
        
        return {
            **self.stats,
            'hit_rate': hit_rate,
            'cache_size': len(self.cache),
            'max_size': self.max_size
        }

class APIHealthMonitor:
    """API健康状态监控"""
    
    def __init__(self, check_interval: int = 60):
        self.check_interval = check_interval
        self.health_status: Dict[str, APIHealth] = {}
        self.response_times: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.error_counts: Dict[str, int] = defaultdict(int)
        self.last_health_check: Dict[str, datetime] = {}
        self.monitoring_task: Optional[asyncio.Task] = None
        
    async def start_monitoring(self, endpoints: List[APIEndpoint], session_manager: ConnectionPoolManager):
        """开始健康监控"""
        self.endpoints = endpoints
        self.session_manager = session_manager
        
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("API健康监控已启动")
    
    async def stop_monitoring(self):
        """停止健康监控"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("API健康监控已停止")
    
    async def _monitoring_loop(self):
        """监控循环"""
        while True:
            try:
                for endpoint in self.endpoints:
                    await self._check_endpoint_health(endpoint)
                
                await asyncio.sleep(self.check_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"健康监控循环错误: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _check_endpoint_health(self, endpoint: APIEndpoint):
        """检查端点健康状态"""
        try:
            session = await self.session_manager.get_session(endpoint.name)
            
            # 健康检查请求
            health_url = endpoint.url
            if endpoint.health_check_path:
                health_url = f"{endpoint.url.rstrip('/')}/{endpoint.health_check_path.lstrip('/')}"
            
            start_time = time.time()
            
            async with session.get(health_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                response_time = time.time() - start_time
                
                # 记录响应时间
                self.response_times[endpoint.name].append(response_time)
                
                # 判断健康状态
                if response.status == 200:
                    if response_time < 2.0:  # 2秒内响应为健康
                        self.health_status[endpoint.name] = APIHealth.HEALTHY
                    else:
                        self.health_status[endpoint.name] = APIHealth.DEGRADED
                    
                    # 重置错误计数
                    self.error_counts[endpoint.name] = 0
                else:
                    self._handle_health_check_error(endpoint.name)
                
                self.last_health_check[endpoint.name] = datetime.now()
                
        except Exception as e:
            logger.warning(f"端点 {endpoint.name} 健康检查失败: {e}")
            self._handle_health_check_error(endpoint.name)
    
    def _handle_health_check_error(self, endpoint_name: str):
        """处理健康检查错误"""
        self.error_counts[endpoint_name] += 1
        
        if self.error_counts[endpoint_name] >= 3:
            self.health_status[endpoint_name] = APIHealth.DOWN
        else:
            self.health_status[endpoint_name] = APIHealth.DEGRADED
    
    def get_endpoint_health(self, endpoint_name: str) -> APIHealth:
        """获取端点健康状态"""
        return self.health_status.get(endpoint_name, APIHealth.UNKNOWN)
    
    def get_avg_response_time(self, endpoint_name: str) -> float:
        """获取平均响应时间"""
        times = self.response_times.get(endpoint_name, deque())
        return sum(times) / len(times) if times else 0.0
    
    def get_health_summary(self) -> Dict[str, Any]:
        """获取健康状态摘要"""
        summary = {
            'total_endpoints': len(self.health_status),
            'healthy': 0,
            'degraded': 0,
            'down': 0,
            'unknown': 0,
            'endpoints': {}
        }
        
        for endpoint_name, health in self.health_status.items():
            summary[health.value] += 1
            summary['endpoints'][endpoint_name] = {
                'health': health.value,
                'avg_response_time': self.get_avg_response_time(endpoint_name),
                'error_count': self.error_counts.get(endpoint_name, 0),
                'last_check': self.last_health_check.get(endpoint_name)
            }
        
        return summary

class RateLimiter:
    """速率限制器"""
    
    def __init__(self):
        self.requests: Dict[str, deque] = defaultdict(lambda: deque())
    
    async def can_proceed(self, endpoint_name: str, rate_limit: int) -> bool:
        """检查是否可以继续请求"""
        now = datetime.now()
        minute_ago = now - timedelta(minutes=1)
        
        # 清理一分钟前的请求记录
        requests = self.requests[endpoint_name]
        while requests and requests[0] < minute_ago:
            requests.popleft()
        
        # 检查速率限制
        if len(requests) >= rate_limit:
            return False
        
        # 记录请求
        requests.append(now)
        return True

class UnifiedAPIClient:
    """统一API客户端"""
    
    def __init__(self):
        self.endpoints: Dict[str, APIEndpoint] = {}
        self.pool_manager = ConnectionPoolManager()
        self.cache = IntelligentCache()
        self.health_monitor = APIHealthMonitor()
        self.rate_limiter = RateLimiter()
        self.metrics: List[RequestMetrics] = []
        
        # 运行状态
        self.is_running = False
    
    async def initialize(self):
        """初始化客户端"""
        # 注册默认端点
        await self._register_default_endpoints()
        
        # 启动健康监控
        await self.health_monitor.start_monitoring(
            list(self.endpoints.values()),
            self.pool_manager
        )
        
        self.is_running = True
        logger.info("统一API客户端初始化完成")
    
    async def shutdown(self):
        """关闭客户端"""
        await self.health_monitor.stop_monitoring()
        await self.pool_manager.close_all()
        self.is_running = False
        logger.info("统一API客户端已关闭")
    
    async def _register_default_endpoints(self):
        """注册默认端点"""
        
        # Polymarket REST API
        self.register_endpoint(APIEndpoint(
            name="polymarket_rest",
            url="https://clob.polymarket.com",
            endpoint_type=APIEndpointType.REST,
            priority=1,
            max_concurrent=15,
            timeout=30.0,
            retry_attempts=3,
            rate_limit=120,
            cache_ttl=60,
            headers={
                "User-Agent": "PolymarketTradingBot/1.0",
                "Accept": "application/json"
            }
        ))
        
        # Polymarket GraphQL (Goldsky)
        self.register_endpoint(APIEndpoint(
            name="polymarket_graphql_orders",
            url="https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn",
            endpoint_type=APIEndpointType.GRAPHQL,
            priority=0,  # 最高优先级
            max_concurrent=10,
            timeout=45.0,
            retry_attempts=2,
            rate_limit=60,
            cache_ttl=30,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        ))
        
        # Activity GraphQL
        self.register_endpoint(APIEndpoint(
            name="polymarket_graphql_activity",
            url="https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/activity-subgraph/0.0.4/gn",
            endpoint_type=APIEndpointType.GRAPHQL,
            priority=0,
            max_concurrent=10,
            timeout=45.0,
            retry_attempts=2,
            rate_limit=60,
            cache_ttl=30,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        ))
        
        logger.info(f"注册了 {len(self.endpoints)} 个API端点")
    
    def register_endpoint(self, endpoint: APIEndpoint):
        """注册API端点"""
        self.endpoints[endpoint.name] = endpoint
        logger.info(f"注册API端点: {endpoint.name} ({endpoint.endpoint_type.value})")
    
    def get_available_endpoints(self, endpoint_type: APIEndpointType = None) -> List[APIEndpoint]:
        """获取可用端点"""
        endpoints = list(self.endpoints.values())
        
        if endpoint_type:
            endpoints = [ep for ep in endpoints if ep.endpoint_type == endpoint_type]
        
        # 按优先级和健康状态排序
        def sort_key(ep):
            health = self.health_monitor.get_endpoint_health(ep.name)
            
            # 健康状态权重
            health_weight = {
                APIHealth.HEALTHY: 0,
                APIHealth.DEGRADED: 1,
                APIHealth.UNKNOWN: 2,
                APIHealth.DOWN: 3
            }
            
            return (health_weight.get(health, 3), ep.priority)
        
        return sorted(endpoints, key=sort_key)
    
    @async_log_execution_time
    async def fetch_markets(self, limit: int = 20, use_cache: bool = True) -> List[Dict]:
        """获取市场数据"""
        
        # 尝试缓存
        if use_cache:
            cached_data = self.cache.get("markets", "GET", f"/markets?limit={limit}")
            if cached_data:
                logger.debug("使用缓存的市场数据")
                return cached_data
        
        # 获取可用端点
        endpoints = self.get_available_endpoints()
        
        for endpoint in endpoints:
            try:
                if endpoint.endpoint_type == APIEndpointType.REST:
                    data = await self._fetch_markets_rest(endpoint, limit)
                elif endpoint.endpoint_type == APIEndpointType.GRAPHQL:
                    data = await self._fetch_markets_graphql(endpoint, limit)
                else:
                    continue
                
                if data:
                    # 缓存结果
                    if use_cache:
                        self.cache.set("markets", "GET", f"/markets?limit={limit}", data, endpoint.cache_ttl)
                    
                    logger.info(f"通过 {endpoint.name} 获取到 {len(data)} 个市场")
                    return data
                    
            except Exception as e:
                logger.warning(f"端点 {endpoint.name} 获取失败: {e}")
                self._record_error_metric(endpoint.name, str(e))
                continue
        
        logger.error("所有端点都无法获取市场数据")
        return []
    
    @async_retry_on_failure(max_retries=2)
    async def _fetch_markets_rest(self, endpoint: APIEndpoint, limit: int) -> List[Dict]:
        """通过REST API获取市场数据"""
        
        # 检查速率限制
        if not await self.rate_limiter.can_proceed(endpoint.name, endpoint.rate_limit):
            raise Exception(f"端点 {endpoint.name} 达到速率限制")
        
        session = await self.pool_manager.get_session(endpoint.name)
        
        url = f"{endpoint.url}/markets"
        params = {"limit": limit}
        
        start_time = datetime.now()
        
        async with session.get(url, params=params, headers=endpoint.headers) as response:
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds()
            
            # 记录指标
            self._record_success_metric(endpoint.name, response_time, response.status)
            
            if response.status == 200:
                data = await response.json()
                return data.get("data", [])
            else:
                raise Exception(f"HTTP {response.status}: {await response.text()}")
    
    @async_retry_on_failure(max_retries=2)
    async def _fetch_markets_graphql(self, endpoint: APIEndpoint, limit: int) -> List[Dict]:
        """通过GraphQL获取市场数据"""
        
        # 检查速率限制
        if not await self.rate_limiter.can_proceed(endpoint.name, endpoint.rate_limit):
            raise Exception(f"端点 {endpoint.name} 达到速率限制")
        
        session = await self.pool_manager.get_session(endpoint.name)
        
        # GraphQL查询
        if "orderbook" in endpoint.name:
            query = """
            {
              marketDatas(first: %d) {
                id
                market
                volume
                volumeUSD
                feeRate
              }
            }
            """ % limit
        else:
            query = """
            {
              splits(first: %d, orderBy: timestamp, orderDirection: desc) {
                id
                market
                amount
                timestamp
              }
            }
            """ % limit
        
        payload = {"query": query}
        
        start_time = datetime.now()
        
        async with session.post(endpoint.url, json=payload, headers=endpoint.headers) as response:
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds()
            
            # 记录指标
            self._record_success_metric(endpoint.name, response_time, response.status)
            
            if response.status == 200:
                data = await response.json()
                
                if "errors" in data:
                    raise Exception(f"GraphQL错误: {data['errors']}")
                
                # 转换GraphQL响应格式
                return self._transform_graphql_response(data.get("data", {}), endpoint.name)
            else:
                raise Exception(f"HTTP {response.status}: {await response.text()}")
    
    def _transform_graphql_response(self, data: Dict, endpoint_name: str) -> List[Dict]:
        """转换GraphQL响应为统一格式"""
        
        if "orderbook" in endpoint_name and "marketDatas" in data:
            return [
                {
                    "id": item["market"],
                    "title": f"Market {item['id']}",
                    "volume_24h": float(item.get("volumeUSD", 0)),
                    "price": 0.5,  # GraphQL不直接提供价格
                    "source": "graphql_orderbook"
                }
                for item in data["marketDatas"]
            ]
        elif "splits" in data:
            return [
                {
                    "id": item["market"],
                    "title": f"Market {item['id']}",
                    "amount": float(item.get("amount", 0)),
                    "timestamp": item.get("timestamp"),
                    "source": "graphql_activity"
                }
                for item in data["splits"]
            ]
        
        return []
    
    def _record_success_metric(self, endpoint_name: str, response_time: float, status_code: int):
        """记录成功指标"""
        metric = RequestMetrics(
            endpoint_name=endpoint_name,
            start_time=datetime.now() - timedelta(seconds=response_time),
            end_time=datetime.now(),
            success=True,
            response_time=response_time,
            status_code=status_code
        )
        
        self.metrics.append(metric)
        
        # 保持最近1000条记录
        if len(self.metrics) > 1000:
            self.metrics = self.metrics[-1000:]
    
    def _record_error_metric(self, endpoint_name: str, error_message: str):
        """记录错误指标"""
        metric = RequestMetrics(
            endpoint_name=endpoint_name,
            start_time=datetime.now(),
            end_time=datetime.now(),
            success=False,
            error_message=error_message
        )
        
        self.metrics.append(metric)
    
    async def get_performance_report(self) -> Dict[str, Any]:
        """获取性能报告"""
        
        # 清理过期缓存
        self.cache.clear_expired()
        
        # 统计指标
        total_requests = len(self.metrics)
        successful_requests = len([m for m in self.metrics if m.success])
        
        endpoint_stats = defaultdict(lambda: {
            'total_requests': 0,
            'successful_requests': 0,
            'avg_response_time': 0.0,
            'success_rate': 0.0
        })
        
        for metric in self.metrics:
            stats = endpoint_stats[metric.endpoint_name]
            stats['total_requests'] += 1
            
            if metric.success:
                stats['successful_requests'] += 1
                stats['avg_response_time'] = (
                    (stats['avg_response_time'] * (stats['successful_requests'] - 1) + metric.response_time) /
                    stats['successful_requests']
                )
            
            stats['success_rate'] = stats['successful_requests'] / stats['total_requests']
        
        return {
            "summary": {
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "overall_success_rate": successful_requests / max(total_requests, 1),
                "active_endpoints": len(self.endpoints)
            },
            "endpoints": dict(endpoint_stats),
            "health_status": self.health_monitor.get_health_summary(),
            "cache_stats": self.cache.get_stats(),
            "timestamp": datetime.now().isoformat()
        }

# 全局客户端实例
unified_api_client = UnifiedAPIClient()

async def get_unified_api_client() -> UnifiedAPIClient:
    """获取统一API客户端实例"""
    if not unified_api_client.is_running:
        await unified_api_client.initialize()
    
    return unified_api_client

async def main():
    """演示和测试"""
    print("=== 高性能API集成系统测试 ===")
    
    # 初始化客户端
    client = await get_unified_api_client()
    
    try:
        # 测试获取市场数据
        print("[1] 测试获取市场数据...")
        markets = await client.fetch_markets(limit=5)
        print(f"获取到 {len(markets)} 个市场")
        
        # 再次请求（测试缓存）
        print("[2] 测试缓存功能...")
        start_time = time.time()
        cached_markets = await client.fetch_markets(limit=5)
        cache_time = time.time() - start_time
        print(f"缓存请求用时: {cache_time:.3f}秒")
        
        # 获取性能报告
        print("[3] 获取性能报告...")
        report = await client.get_performance_report()
        print(f"总请求数: {report['summary']['total_requests']}")
        print(f"成功率: {report['summary']['overall_success_rate']:.1%}")
        print(f"缓存命中率: {report['cache_stats']['hit_rate']:.1%}")
        
        # 显示端点健康状态
        print("[4] 端点健康状态:")
        for endpoint_name, health_info in report['health_status']['endpoints'].items():
            print(f"  {endpoint_name}: {health_info['health']} "
                  f"(响应时间: {health_info['avg_response_time']:.3f}s)")
        
    finally:
        await client.shutdown()
    
    print("\n=== API集成系统测试完成 ===")

if __name__ == "__main__":
    asyncio.run(main())