"""
高性能 Dex Screener Token 监控脚本
使用异步请求和高效的数据处理
"""

import asyncio
import aiohttp
import csv
import os
import logging
from datetime import datetime
from typing import Set, Tuple, List, Dict
from collections import deque
import signal
import sys

from config import (
    API_BASE_URL,
    API_ENDPOINTS,
    FETCH_INTERVAL,
    REQUEST_TIMEOUT,
    CSV_FILE,
    CSV_HEADERS,
    LOG_FILE,
    LOG_LEVEL,
    CACHE_SIZE,
    USE_ENDPOINTS,
    ENDPOINT_ROTATION_INTERVAL
)


class TokenMonitor:
    """高性能Token监控器"""
    
    def __init__(self):
        self.csv_file = CSV_FILE
        self.seen_tokens: Set[Tuple[str, str]] = set()  # 使用集合快速查找
        self.token_cache = deque(maxlen=CACHE_SIZE)  # 限制内存使用
        self.session: aiohttp.ClientSession = None
        self.running = True
        self.stats = {
            "total_fetched": 0,
            "total_saved": 0,
            "total_duplicates": 0,
            "errors": 0
        }
        self.current_endpoint_index = 0  # 用于轮换端点
        self.last_endpoint_switch = 0  # 上次切换端点的时间
        self._setup_logging()
        self._setup_signal_handlers()
        
    def _setup_logging(self):
        """配置日志"""
        logging.basicConfig(
            level=getattr(logging, LOG_LEVEL),
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(LOG_FILE),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def _setup_signal_handlers(self):
        """设置信号处理，优雅关闭"""
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
    def _signal_handler(self, signum, frame):
        """处理关闭信号"""
        self.logger.info(f"\n收到信号 {signum}，准备关闭...")
        self.running = False
        
    def _initialize_csv(self):
        """初始化CSV文件，如果不存在则创建，并加载已有数据到内存"""
        if not os.path.exists(self.csv_file):
            with open(self.csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(CSV_HEADERS)
            self.logger.info(f"创建新的CSV文件: {self.csv_file}")
        else:
            # 加载已有数据到内存，用于去重
            self._load_existing_tokens()
            
    def _load_existing_tokens(self):
        """加载已存在的token到内存集合中，用于快速去重"""
        try:
            with open(self.csv_file, 'r', newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader)  # 跳过表头
                for row in reader:
                    if len(row) >= 2:
                        token_key = (row[0], row[1])  # (symbol, name)
                        self.seen_tokens.add(token_key)
                        self.token_cache.append(token_key)
            self.logger.info(f"加载了 {len(self.seen_tokens)} 个已存在的token")
        except Exception as e:
            self.logger.error(f"加载已有数据失败: {e}")
            
    async def _fetch_token_profiles(self) -> List[Tuple[str, str]]:
        """异步获取最新的token profiles"""
        url = f"{API_BASE_URL}{API_ENDPOINTS['token_profiles']}"
        
        try:
            async with self.session.get(url, timeout=REQUEST_TIMEOUT) as response:
                if response.status == 200:
                    profiles = await response.json()
                    self.stats["total_fetched"] += 1
                    
                    # 提取每个 profile 的 token 详细信息
                    tokens = []
                    for profile in profiles:
                        token_address = profile.get('tokenAddress')
                        chain_id = profile.get('chainId')
                        
                        if token_address and chain_id:
                            # 获取 token 详细信息
                            token_info = await self._fetch_token_details(token_address)
                            if token_info:
                                tokens.extend(token_info)
                    
                    return tokens
                else:
                    self.logger.warning(f"API返回状态码: {response.status}")
                    self.stats["errors"] += 1
                    return []
        except asyncio.TimeoutError:
            self.logger.error("请求超时")
            self.stats["errors"] += 1
            return []
        except Exception as e:
            self.logger.error(f"获取数据失败: {e}")
            self.stats["errors"] += 1
            return []
    
    async def _fetch_token_details(self, token_address: str) -> List[Tuple[str, str]]:
        """获取特定 token 的详细信息"""
        url = f"{API_BASE_URL}{API_ENDPOINTS['token_details'].format(address=token_address)}"
        
        try:
            async with self.session.get(url, timeout=REQUEST_TIMEOUT) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_token_pairs(data)
                else:
                    return []
        except Exception as e:
            self.logger.debug(f"获取 token {token_address} 详细信息失败: {e}")
            return []
    
    async def _fetch_boosted_tokens(self, endpoint_key: str) -> List[Tuple[str, str]]:
        """异步获取提升的token数据"""
        url = f"{API_BASE_URL}{API_ENDPOINTS[endpoint_key]}"
        
        try:
            async with self.session.get(url, timeout=REQUEST_TIMEOUT) as response:
                if response.status == 200:
                    boosts = await response.json()
                    self.stats["total_fetched"] += 1
                    
                    # token-boosts 端点返回的也是 token addresses
                    # 需要进一步获取详细信息
                    tokens = []
                    for boost in boosts:
                        token_address = boost.get('tokenAddress')
                        
                        if token_address:
                            token_info = await self._fetch_token_details(token_address)
                            if token_info:
                                tokens.extend(token_info)
                    
                    return tokens
                else:
                    self.logger.warning(f"API返回状态码: {response.status} for {endpoint_key}")
                    self.stats["errors"] += 1
                    return []
        except asyncio.TimeoutError:
            self.logger.error(f"请求超时 for {endpoint_key}")
            self.stats["errors"] += 1
            return []
        except Exception as e:
            self.logger.error(f"获取数据失败 for {endpoint_key}: {e}")
            self.stats["errors"] += 1
            return []
    
    async def _fetch_latest_tokens(self) -> List[Tuple[str, str]]:
        """异步获取最新的token数据（轮换端点以减少API调用）"""
        import time
        
        # 检查是否需要切换端点
        current_time = time.time()
        if current_time - self.last_endpoint_switch >= ENDPOINT_ROTATION_INTERVAL:
            self.current_endpoint_index = (self.current_endpoint_index + 1) % len(USE_ENDPOINTS)
            self.last_endpoint_switch = current_time
        
        # 只使用当前端点
        endpoint_key = USE_ENDPOINTS[self.current_endpoint_index]
        
        if endpoint_key == "token_profiles":
            return await self._fetch_token_profiles()
        elif endpoint_key in ["token_boosts_latest", "token_boosts_top"]:
            return await self._fetch_boosted_tokens(endpoint_key)
        else:
            return []
            
    def _parse_token_pairs(self, data: Dict) -> List[Tuple[str, str]]:
        """解析包含交易对信息的API返回数据"""
        tokens = []
        
        try:
            if isinstance(data, dict) and 'pairs' in data:
                pairs = data['pairs']
                if pairs and isinstance(pairs, list):
                    for pair in pairs:
                        if 'baseToken' in pair:
                            base_token = pair['baseToken']
                            symbol = base_token.get('symbol', '')
                            name = base_token.get('name', '')
                            if symbol and name:
                                tokens.append((symbol, name))
                                # 只取第一个交易对的信息
                                break
        except Exception as e:
            self.logger.debug(f"解析交易对数据失败: {e}")
            
        return tokens
        
    def _save_tokens(self, tokens: List[Tuple[str, str]]):
        """将新token保存到CSV文件"""
        if not tokens:
            return
            
        new_tokens = []
        timestamp = datetime.now().isoformat()
        
        for symbol, name in tokens:
            token_key = (symbol, name)
            if token_key not in self.seen_tokens:
                new_tokens.append([symbol, name, timestamp])
                self.seen_tokens.add(token_key)
                self.token_cache.append(token_key)
            else:
                self.stats["total_duplicates"] += 1
                
        if new_tokens:
            try:
                with open(self.csv_file, 'a', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerows(new_tokens)
                self.stats["total_saved"] += len(new_tokens)
                self.logger.info(f"保存了 {len(new_tokens)} 个新token")
            except Exception as e:
                self.logger.error(f"保存数据失败: {e}")
                
    async def _monitor_loop(self):
        """主监控循环"""
        self.logger.info("开始监控...")
        
        while self.running:
            try:
                # 异步获取数据
                tokens = await self._fetch_latest_tokens()
                
                # 保存新数据（同步操作，但很快）
                if tokens:
                    self._save_tokens(tokens)
                    
                # 每100次请求输出一次统计
                if self.stats["total_fetched"] % 100 == 0:
                    self._print_stats()
                    
                # 等待指定间隔
                await asyncio.sleep(FETCH_INTERVAL)
                
            except Exception as e:
                self.logger.error(f"监控循环错误: {e}")
                await asyncio.sleep(FETCH_INTERVAL)
                
    def _print_stats(self):
        """打印统计信息"""
        self.logger.info(
            f"统计 - 总请求: {self.stats['total_fetched']}, "
            f"新增token: {self.stats['total_saved']}, "
            f"重复: {self.stats['total_duplicates']}, "
            f"错误: {self.stats['errors']}, "
            f"缓存: {len(self.seen_tokens)} tokens"
        )
        
    async def start(self):
        """启动监控"""
        self._initialize_csv()
        
        # 创建异步HTTP会话
        timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
        self.session = aiohttp.ClientSession(timeout=timeout)
        
        try:
            await self._monitor_loop()
        finally:
            await self.session.close()
            self._print_stats()
            self.logger.info("监控已停止")


async def main():
    """主函数"""
    monitor = TokenMonitor()
    await monitor.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n程序被用户中断")
    except Exception as e:
        print(f"程序错误: {e}")

