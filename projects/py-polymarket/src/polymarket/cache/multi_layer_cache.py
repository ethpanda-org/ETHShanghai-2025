#!/usr/bin/env python3
"""
多层缓存架构
Multi-Layer Cache Architecture

实现分层缓存系统，包括L1/L2/L3缓存层，支持不同的存储介质和性能特征
"""

import asyncio
import json
import time
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import uuid
import weakref
from collections import defaultdict
import threading
import pickle
import gzip
import psutil

from ..utils.logging_utils import get_logger
from .intelligent_prefetch import IntelligentPrefetcher, AccessRecord

logger = get_logger(__name__)

class LayerType(Enum):
    """缓存层类型"""
    L1_MEMORY = "l1_memory"           # L1 内存缓存 (最快，容量小)
    L2_DISTRIBUTED = "l2_distributed" # L2 分布式缓存 (中速，容量中)
    L3_PERSISTENT = "l3_persistent"   # L3 持久化缓存 (慢速，容量大)
    REMOTE_CACHE = "remote_cache"     # 远程缓存
    DISK_CACHE = "disk_cache"         # 磁盘缓存

class CacheEvictionPolicy(Enum):
    """缓存淘汰策略"""
    LRU = "lru"
    LFU = "lfu"
    FIFO = "fifo"
    RANDOM = "random"
    TTL = "ttl"

class CacheWritePolicy(Enum):
    """缓存写策略"""
    WRITE_THROUGH = "write_through"   # 写透
    WRITE_BACK = "write_back"         # 写回
    WRITE_AROUND = "write_around"     # 写绕过

@dataclass
class CacheLayerConfig:
    """缓存层配置"""
    layer_type: LayerType = LayerType.L1_MEMORY
    max_size: int = 1000              # 最大条目数
    max_memory_mb: int = 100          # 最大内存使用(MB)
    default_ttl: int = 3600           # 默认TTL(秒)
    
    # 淘汰策略
    eviction_policy: CacheEvictionPolicy = CacheEvictionPolicy.LRU
    write_policy: CacheWritePolicy = CacheWritePolicy.WRITE_THROUGH
    
    # 性能配置
    read_timeout: float = 0.1         # 读取超时(秒)
    write_timeout: float = 0.5        # 写入超时(秒)
    
    # 压缩配置
    enable_compression: bool = True
    compression_threshold: int = 1024  # 1KB以上压缩
    compression_level: int = 6
    
    # 预热配置
    enable_warmup: bool = True
    warmup_ratio: float = 0.8         # 预热比例
    
    # 统计配置
    enable_stats: bool = True
    stats_window: int = 3600          # 统计窗口(秒)
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'layer_type': self.layer_type.value,
            'max_size': self.max_size,
            'max_memory_mb': self.max_memory_mb,
            'default_ttl': self.default_ttl,
            'eviction_policy': self.eviction_policy.value,
            'write_policy': self.write_policy.value,
            'read_timeout': self.read_timeout,
            'write_timeout': self.write_timeout,
            'enable_compression': self.enable_compression,
            'compression_threshold': self.compression_threshold,
            'compression_level': self.compression_level,
            'enable_warmup': self.enable_warmup,
            'warmup_ratio': self.warmup_ratio,
            'enable_stats': self.enable_stats,
            'stats_window': self.stats_window
        }

@dataclass
class LayerPerformance:
    """层性能指标"""
    hits: int = 0
    misses: int = 0
    reads: int = 0
    writes: int = 0
    evictions: int = 0
    
    # 延迟统计
    read_latency_sum: float = 0.0
    write_latency_sum: float = 0.0
    read_latency_count: int = 0
    write_latency_count: int = 0
    
    # 大小统计
    current_size: int = 0
    memory_usage_bytes: int = 0
    
    # 时间统计
    last_access: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    def get_hit_rate(self) -> float:
        """获取命中率"""
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0
    
    def get_avg_read_latency(self) -> float:
        """获取平均读取延迟"""
        return self.read_latency_sum / self.read_latency_count if self.read_latency_count > 0 else 0.0
    
    def get_avg_write_latency(self) -> float:
        """获取平均写入延迟"""
        return self.write_latency_sum / self.write_latency_count if self.write_latency_count > 0 else 0.0
    
    def update_read_latency(self, latency: float):
        """更新读取延迟"""
        self.read_latency_sum += latency
        self.read_latency_count += 1
        self.reads += 1
        self.last_access = datetime.now()
    
    def update_write_latency(self, latency: float):
        """更新写入延迟"""
        self.write_latency_sum += latency
        self.write_latency_count += 1
        self.writes += 1
        self.last_access = datetime.now()
    
    def record_hit(self):
        """记录命中"""
        self.hits += 1
        self.last_access = datetime.now()
    
    def record_miss(self):
        """记录未命中"""
        self.misses += 1
        self.last_access = datetime.now()
    
    def record_eviction(self):
        """记录淘汰"""
        self.evictions += 1
        self.current_size = max(0, self.current_size - 1)
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'hits': self.hits,
            'misses': self.misses,
            'reads': self.reads,
            'writes': self.writes,
            'evictions': self.evictions,
            'hit_rate': self.get_hit_rate(),
            'avg_read_latency': self.get_avg_read_latency(),
            'avg_write_latency': self.get_avg_write_latency(),
            'current_size': self.current_size,
            'memory_usage_mb': self.memory_usage_bytes / (1024 * 1024),
            'last_access': self.last_access.isoformat() if self.last_access else None,
            'created_at': self.created_at.isoformat()
        }

class BaseCacheLayer(ABC):
    """缓存层基类"""
    
    def __init__(self, config: CacheLayerConfig, layer_name: str = ""):
        self.config = config
        self.layer_name = layer_name or f"{config.layer_type.value}_{id(self)}"
        self.performance = LayerPerformance()
        self._lock = asyncio.Lock()
        
        logger.info(f"初始化缓存层: {self.layer_name} ({config.layer_type.value})")
    
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """获取值"""
        pass
    
    @abstractmethod
    async def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """设置值"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """删除值"""
        pass
    
    @abstractmethod
    async def clear(self) -> bool:
        """清空缓存"""
        pass
    
    @abstractmethod
    async def size(self) -> int:
        """获取大小"""
        pass
    
    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        pass
    
    def _compress_value(self, value: Any) -> Any:
        """压缩值"""
        try:
            if not self.config.enable_compression:
                return value
            
            serialized = pickle.dumps(value)
            if len(serialized) > self.config.compression_threshold:
                compressed = gzip.compress(serialized, compresslevel=self.config.compression_level)
                return {
                    '_compressed': True,
                    '_data': compressed,
                    '_original_size': len(serialized)
                }
            
            return value
            
        except Exception as e:
            logger.error(f"压缩值失败: {e}")
            return value
    
    def _decompress_value(self, value: Any) -> Any:
        """解压缩值"""
        try:
            if isinstance(value, dict) and value.get('_compressed'):
                compressed_data = value['_data']
                decompressed = gzip.decompress(compressed_data)
                return pickle.loads(decompressed)
            
            return value
            
        except Exception as e:
            logger.error(f"解压缩值失败: {e}")
            return value

class MemoryCache(BaseCacheLayer):
    """内存缓存层 (L1)"""
    
    def __init__(self, config: CacheLayerConfig, layer_name: str = ""):
        super().__init__(config, layer_name)
        self._data: Dict[str, Any] = {}
        self._ttl: Dict[str, datetime] = {}
        self._access_order: List[str] = []  # LRU顺序
        self._access_count: Dict[str, int] = {}  # LFU计数
        self._size_cache = 0
        
    async def get(self, key: str) -> Optional[Any]:
        """获取值"""
        start_time = time.time()
        
        try:
            async with self._lock:
                # 检查是否存在
                if key not in self._data:
                    self.performance.record_miss()
                    return None
                
                # 检查TTL
                if key in self._ttl and datetime.now() > self._ttl[key]:
                    await self._remove_key(key)
                    self.performance.record_miss()
                    return None
                
                # 更新访问统计
                self._update_access_stats(key)
                
                value = self._decompress_value(self._data[key])
                self.performance.record_hit()
                
                return value
                
        except Exception as e:
            logger.error(f"内存缓存获取失败 {key}: {e}")
            return None
        finally:
            latency = time.time() - start_time
            self.performance.update_read_latency(latency)
    
    async def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """设置值"""
        start_time = time.time()
        
        try:
            async with self._lock:
                # 检查容量限制
                if key not in self._data and len(self._data) >= self.config.max_size:
                    await self._evict_item()
                
                # 压缩值
                compressed_value = self._compress_value(value)
                
                # 存储
                self._data[key] = compressed_value
                
                # 设置TTL
                if ttl or self.config.default_ttl:
                    ttl_seconds = ttl or self.config.default_ttl
                    self._ttl[key] = datetime.now() + timedelta(seconds=ttl_seconds)
                
                # 更新访问统计
                self._update_access_stats(key)
                
                # 更新大小统计
                self.performance.current_size = len(self._data)
                self._update_memory_usage()
                
                return True
                
        except Exception as e:
            logger.error(f"内存缓存设置失败 {key}: {e}")
            return False
        finally:
            latency = time.time() - start_time
            self.performance.update_write_latency(latency)
    
    async def delete(self, key: str) -> bool:
        """删除值"""
        try:
            async with self._lock:
                if key in self._data:
                    await self._remove_key(key)
                    return True
                return False
                
        except Exception as e:
            logger.error(f"内存缓存删除失败 {key}: {e}")
            return False
    
    async def clear(self) -> bool:
        """清空缓存"""
        try:
            async with self._lock:
                self._data.clear()
                self._ttl.clear()
                self._access_order.clear()
                self._access_count.clear()
                self.performance.current_size = 0
                self.performance.memory_usage_bytes = 0
                return True
                
        except Exception as e:
            logger.error(f"清空内存缓存失败: {e}")
            return False
    
    async def size(self) -> int:
        """获取大小"""
        return len(self._data)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            'layer_name': self.layer_name,
            'layer_type': self.config.layer_type.value,
            'config': self.config.to_dict(),
            'performance': self.performance.to_dict(),
            'data_count': len(self._data),
            'ttl_count': len(self._ttl)
        }
    
    def _update_access_stats(self, key: str):
        """更新访问统计"""
        # LRU更新
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)
        
        # LFU更新
        self._access_count[key] = self._access_count.get(key, 0) + 1
    
    async def _evict_item(self):
        """淘汰条目"""
        if not self._data:
            return
        
        victim_key = None
        
        if self.config.eviction_policy == CacheEvictionPolicy.LRU:
            # 淘汰最久未使用的
            victim_key = self._access_order[0] if self._access_order else None
        elif self.config.eviction_policy == CacheEvictionPolicy.LFU:
            # 淘汰使用频率最低的
            if self._access_count:
                victim_key = min(self._access_count.keys(), key=lambda k: self._access_count[k])
        elif self.config.eviction_policy == CacheEvictionPolicy.FIFO:
            # 淘汰最早插入的
            victim_key = next(iter(self._data)) if self._data else None
        elif self.config.eviction_policy == CacheEvictionPolicy.TTL:
            # 淘汰最早过期的
            if self._ttl:
                victim_key = min(self._ttl.keys(), key=lambda k: self._ttl[k])
        else:
            # 随机淘汰
            import random
            victim_key = random.choice(list(self._data.keys())) if self._data else None
        
        if victim_key:
            await self._remove_key(victim_key)
            self.performance.record_eviction()
    
    async def _remove_key(self, key: str):
        """移除键"""
        self._data.pop(key, None)
        self._ttl.pop(key, None)
        
        if key in self._access_order:
            self._access_order.remove(key)
        
        self._access_count.pop(key, None)
        
        self.performance.current_size = len(self._data)
        self._update_memory_usage()
    
    def _update_memory_usage(self):
        """更新内存使用统计"""
        try:
            # 估算内存使用量
            total_size = 0
            for value in self._data.values():
                if isinstance(value, dict) and value.get('_compressed'):
                    total_size += len(value['_data'])
                else:
                    total_size += len(pickle.dumps(value))
            
            self.performance.memory_usage_bytes = total_size
            
        except Exception as e:
            logger.error(f"更新内存使用统计失败: {e}")

class DistributedCacheLayer(BaseCacheLayer):
    """分布式缓存层 (L2)"""
    
    def __init__(self, config: CacheLayerConfig, distributed_cache_manager, layer_name: str = ""):
        super().__init__(config, layer_name)
        self.cache_manager = distributed_cache_manager
        self._local_stats = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """获取值"""
        start_time = time.time()
        
        try:
            value = await self.cache_manager.get(key)
            
            if value is not None:
                self.performance.record_hit()
            else:
                self.performance.record_miss()
            
            return value
            
        except Exception as e:
            logger.error(f"分布式缓存获取失败 {key}: {e}")
            self.performance.record_miss()
            return None
        finally:
            latency = time.time() - start_time
            self.performance.update_read_latency(latency)
    
    async def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """设置值"""
        start_time = time.time()
        
        try:
            success = await self.cache_manager.put(key, value, ttl)
            
            if success:
                self.performance.current_size += 1
            
            return success
            
        except Exception as e:
            logger.error(f"分布式缓存设置失败 {key}: {e}")
            return False
        finally:
            latency = time.time() - start_time
            self.performance.update_write_latency(latency)
    
    async def delete(self, key: str) -> bool:
        """删除值"""
        try:
            success = await self.cache_manager.delete(key)
            
            if success:
                self.performance.current_size = max(0, self.performance.current_size - 1)
            
            return success
            
        except Exception as e:
            logger.error(f"分布式缓存删除失败 {key}: {e}")
            return False
    
    async def clear(self) -> bool:
        """清空缓存"""
        try:
            # 分布式缓存可能不支持清空操作
            logger.warning("分布式缓存层不支持清空操作")
            return False
            
        except Exception as e:
            logger.error(f"分布式缓存清空失败: {e}")
            return False
    
    async def size(self) -> int:
        """获取大小"""
        return self.performance.current_size
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        try:
            # 获取分布式缓存统计
            distributed_stats = self.cache_manager.get_global_stats()
            
            return {
                'layer_name': self.layer_name,
                'layer_type': self.config.layer_type.value,
                'config': self.config.to_dict(),
                'performance': self.performance.to_dict(),
                'distributed_stats': distributed_stats
            }
            
        except Exception as e:
            logger.error(f"获取分布式缓存统计失败: {e}")
            return {
                'layer_name': self.layer_name,
                'layer_type': self.config.layer_type.value,
                'config': self.config.to_dict(),
                'performance': self.performance.to_dict(),
                'error': str(e)
            }

class PersistentCacheLayer(BaseCacheLayer):
    """持久化缓存层 (L3)"""
    
    def __init__(self, config: CacheLayerConfig, storage_path: str = None, layer_name: str = ""):
        super().__init__(config, layer_name)
        self.storage_path = storage_path or f"/tmp/cache_{self.layer_name}"
        self._metadata = {}  # 元数据缓存
        self._ensure_storage_path()
        
    def _ensure_storage_path(self):
        """确保存储路径存在"""
        try:
            import os
            os.makedirs(self.storage_path, exist_ok=True)
            
        except Exception as e:
            logger.error(f"创建存储路径失败: {e}")
    
    async def get(self, key: str) -> Optional[Any]:
        """获取值"""
        start_time = time.time()
        
        try:
            file_path = self._get_file_path(key)
            
            # 检查文件是否存在
            import os
            if not os.path.exists(file_path):
                self.performance.record_miss()
                return None
            
            # 检查TTL
            if key in self._metadata:
                ttl = self._metadata[key].get('ttl')
                if ttl and datetime.now() > ttl:
                    await self.delete(key)
                    self.performance.record_miss()
                    return None
            
            # 读取文件
            with open(file_path, 'rb') as f:
                data = f.read()
            
            # 解压缩和反序列化
            value = pickle.loads(data)
            value = self._decompress_value(value)
            
            self.performance.record_hit()
            return value
            
        except Exception as e:
            logger.error(f"持久化缓存获取失败 {key}: {e}")
            self.performance.record_miss()
            return None
        finally:
            latency = time.time() - start_time
            self.performance.update_read_latency(latency)
    
    async def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """设置值"""
        start_time = time.time()
        
        try:
            # 压缩值
            compressed_value = self._compress_value(value)
            
            # 序列化
            data = pickle.dumps(compressed_value)
            
            # 写入文件
            file_path = self._get_file_path(key)
            with open(file_path, 'wb') as f:
                f.write(data)
            
            # 更新元数据
            ttl_datetime = None
            if ttl or self.config.default_ttl:
                ttl_seconds = ttl or self.config.default_ttl
                ttl_datetime = datetime.now() + timedelta(seconds=ttl_seconds)
            
            self._metadata[key] = {
                'created_at': datetime.now(),
                'ttl': ttl_datetime,
                'file_path': file_path,
                'size': len(data)
            }
            
            self.performance.current_size += 1
            self.performance.memory_usage_bytes += len(data)
            
            return True
            
        except Exception as e:
            logger.error(f"持久化缓存设置失败 {key}: {e}")
            return False
        finally:
            latency = time.time() - start_time
            self.performance.update_write_latency(latency)
    
    async def delete(self, key: str) -> bool:
        """删除值"""
        try:
            file_path = self._get_file_path(key)
            
            # 删除文件
            import os
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # 清理元数据
            if key in self._metadata:
                metadata = self._metadata.pop(key)
                self.performance.current_size = max(0, self.performance.current_size - 1)
                self.performance.memory_usage_bytes = max(0, 
                    self.performance.memory_usage_bytes - metadata.get('size', 0))
            
            return True
            
        except Exception as e:
            logger.error(f"持久化缓存删除失败 {key}: {e}")
            return False
    
    async def clear(self) -> bool:
        """清空缓存"""
        try:
            import os
            import shutil
            
            if os.path.exists(self.storage_path):
                shutil.rmtree(self.storage_path)
                self._ensure_storage_path()
            
            self._metadata.clear()
            self.performance.current_size = 0
            self.performance.memory_usage_bytes = 0
            
            return True
            
        except Exception as e:
            logger.error(f"清空持久化缓存失败: {e}")
            return False
    
    async def size(self) -> int:
        """获取大小"""
        return len(self._metadata)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            'layer_name': self.layer_name,
            'layer_type': self.config.layer_type.value,
            'config': self.config.to_dict(),
            'performance': self.performance.to_dict(),
            'storage_path': self.storage_path,
            'metadata_count': len(self._metadata)
        }
    
    def _get_file_path(self, key: str) -> str:
        """获取文件路径"""
        # 使用哈希避免文件名冲突
        hash_key = hashlib.md5(key.encode()).hexdigest()
        return f"{self.storage_path}/{hash_key}.cache"

class CacheHierarchy:
    """缓存层次结构"""
    
    def __init__(self, layers: List[BaseCacheLayer]):
        """
        初始化缓存层次结构
        
        Args:
            layers: 缓存层列表，按优先级排序（L1, L2, L3...）
        """
        self.layers = layers
        self.layer_map = {layer.layer_name: layer for layer in layers}
        
        # 统计信息
        self.hierarchy_stats = {
            'total_requests': 0,
            'layer_hits': defaultdict(int),
            'layer_misses': defaultdict(int),
            'promotion_count': 0,
            'demotion_count': 0
        }
        
        logger.info(f"初始化缓存层次结构，包含 {len(layers)} 层")
    
    async def get(self, key: str, promote: bool = True) -> Optional[Any]:
        """
        从缓存层次结构获取值
        
        Args:
            key: 键
            promote: 是否提升到上层缓存
        """
        self.hierarchy_stats['total_requests'] += 1
        
        # 从最高层开始查找
        for i, layer in enumerate(self.layers):
            try:
                value = await layer.get(key)
                
                if value is not None:
                    self.hierarchy_stats['layer_hits'][layer.layer_name] += 1
                    
                    # 提升到更高层缓存
                    if promote and i > 0:
                        await self._promote_value(key, value, i)
                    
                    return value
                else:
                    self.hierarchy_stats['layer_misses'][layer.layer_name] += 1
                    
            except Exception as e:
                logger.error(f"从缓存层获取失败 {layer.layer_name}: {e}")
                continue
        
        return None
    
    async def put(self, key: str, value: Any, ttl: Optional[int] = None, 
                 layer_filter: Optional[List[str]] = None) -> bool:
        """
        向缓存层次结构设置值
        
        Args:
            key: 键
            value: 值
            ttl: TTL
            layer_filter: 指定的缓存层列表
        """
        success_count = 0
        target_layers = self.layers
        
        if layer_filter:
            target_layers = [self.layer_map[name] for name in layer_filter if name in self.layer_map]
        
        # 并行写入所有层
        tasks = []
        for layer in target_layers:
            tasks.append(self._put_to_layer(layer, key, value, ttl))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if result is True:
                success_count += 1
        
        return success_count > 0
    
    async def delete(self, key: str, layer_filter: Optional[List[str]] = None) -> bool:
        """
        从缓存层次结构删除值
        
        Args:
            key: 键
            layer_filter: 指定的缓存层列表
        """
        success_count = 0
        target_layers = self.layers
        
        if layer_filter:
            target_layers = [self.layer_map[name] for name in layer_filter if name in self.layer_map]
        
        for layer in target_layers:
            try:
                if await layer.delete(key):
                    success_count += 1
            except Exception as e:
                logger.error(f"从缓存层删除失败 {layer.layer_name}: {e}")
        
        return success_count > 0
    
    async def clear(self, layer_filter: Optional[List[str]] = None) -> bool:
        """
        清空缓存层次结构
        
        Args:
            layer_filter: 指定的缓存层列表
        """
        success_count = 0
        target_layers = self.layers
        
        if layer_filter:
            target_layers = [self.layer_map[name] for name in layer_filter if name in self.layer_map]
        
        for layer in target_layers:
            try:
                if await layer.clear():
                    success_count += 1
            except Exception as e:
                logger.error(f"清空缓存层失败 {layer.layer_name}: {e}")
        
        return success_count > 0
    
    async def _promote_value(self, key: str, value: Any, from_layer_index: int):
        """将值提升到更高层缓存"""
        try:
            # 提升到所有更高层
            for i in range(from_layer_index):
                layer = self.layers[i]
                await layer.put(key, value)
            
            self.hierarchy_stats['promotion_count'] += 1
            
        except Exception as e:
            logger.error(f"提升缓存值失败: {e}")
    
    async def _put_to_layer(self, layer: BaseCacheLayer, key: str, value: Any, ttl: Optional[int]) -> bool:
        """向指定层写入值"""
        try:
            return await layer.put(key, value, ttl)
        except Exception as e:
            logger.error(f"向缓存层写入失败 {layer.layer_name}: {e}")
            return False
    
    def get_hierarchy_stats(self) -> Dict[str, Any]:
        """获取层次结构统计"""
        layer_stats = []
        
        for layer in self.layers:
            layer_stats.append(layer.get_stats())
        
        # 计算总体命中率
        total_hits = sum(self.hierarchy_stats['layer_hits'].values())
        total_misses = sum(self.hierarchy_stats['layer_misses'].values())
        overall_hit_rate = total_hits / (total_hits + total_misses) if (total_hits + total_misses) > 0 else 0.0
        
        return {
            'hierarchy_stats': dict(self.hierarchy_stats),
            'layer_stats': layer_stats,
            'total_layers': len(self.layers),
            'overall_hit_rate': overall_hit_rate,
            'timestamp': datetime.now().isoformat()
        }

class CacheCoordinator:
    """缓存协调器"""
    
    def __init__(self, hierarchy: CacheHierarchy, prefetcher: Optional[IntelligentPrefetcher] = None):
        """
        初始化缓存协调器
        
        Args:
            hierarchy: 缓存层次结构
            prefetcher: 智能预取器
        """
        self.hierarchy = hierarchy
        self.prefetcher = prefetcher
        
        # 协调策略
        self.write_through_layers = []  # 写透层
        self.write_back_layers = []     # 写回层
        
        # 分析配置
        for layer in hierarchy.layers:
            if layer.config.write_policy == CacheWritePolicy.WRITE_THROUGH:
                self.write_through_layers.append(layer)
            elif layer.config.write_policy == CacheWritePolicy.WRITE_BACK:
                self.write_back_layers.append(layer)
        
        # 后台任务
        self.sync_task: Optional[asyncio.Task] = None
        self.cleanup_task: Optional[asyncio.Task] = None
        
        # 协调统计
        self.coordinator_stats = {
            'coordinated_reads': 0,
            'coordinated_writes': 0,
            'sync_operations': 0,
            'cleanup_operations': 0,
            'prefetch_triggers': 0
        }
        
        logger.info("缓存协调器初始化完成")
    
    async def start(self):
        """启动协调器"""
        try:
            logger.info("启动缓存协调器...")
            
            # 启动后台任务
            self.sync_task = asyncio.create_task(self._sync_loop())
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())
            
            logger.info("缓存协调器启动成功")
            
        except Exception as e:
            logger.error(f"启动缓存协调器失败: {e}")
            raise
    
    async def stop(self):
        """停止协调器"""
        try:
            logger.info("正在停止缓存协调器...")
            
            # 停止后台任务
            if self.sync_task:
                self.sync_task.cancel()
                try:
                    await self.sync_task
                except asyncio.CancelledError:
                    pass
            
            if self.cleanup_task:
                self.cleanup_task.cancel()
                try:
                    await self.cleanup_task
                except asyncio.CancelledError:
                    pass
            
            logger.info("缓存协调器已停止")
            
        except Exception as e:
            logger.error(f"停止缓存协调器失败: {e}")
    
    async def get(self, key: str, user_id: str = None, session_id: str = None, 
                 context: Dict[str, Any] = None) -> Optional[Any]:
        """协调的缓存获取"""
        self.coordinator_stats['coordinated_reads'] += 1
        
        try:
            # 从层次结构获取值
            value = await self.hierarchy.get(key)
            
            # 记录访问用于预取
            if self.prefetcher:
                await self.prefetcher.record_access(key, user_id, session_id, context)
                self.coordinator_stats['prefetch_triggers'] += 1
            
            return value
            
        except Exception as e:
            logger.error(f"协调的缓存获取失败: {e}")
            return None
    
    async def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """协调的缓存设置"""
        self.coordinator_stats['coordinated_writes'] += 1
        
        try:
            # 写透策略：立即写入所有写透层
            write_through_success = False
            if self.write_through_layers:
                layer_names = [layer.layer_name for layer in self.write_through_layers]
                write_through_success = await self.hierarchy.put(key, value, ttl, layer_names)
            
            # 写回策略：只写入最高层，稍后同步
            write_back_success = False
            if self.write_back_layers and self.hierarchy.layers:
                # 写入第一层（通常是L1）
                first_layer = self.hierarchy.layers[0]
                if first_layer in self.write_back_layers:
                    write_back_success = await first_layer.put(key, value, ttl)
            
            return write_through_success or write_back_success
            
        except Exception as e:
            logger.error(f"协调的缓存设置失败: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """协调的缓存删除"""
        try:
            return await self.hierarchy.delete(key)
            
        except Exception as e:
            logger.error(f"协调的缓存删除失败: {e}")
            return False
    
    async def _sync_loop(self):
        """同步循环"""
        while True:
            try:
                await self._sync_write_back_layers()
                await asyncio.sleep(60)  # 每分钟同步一次
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"同步循环异常: {e}")
                await asyncio.sleep(60)
    
    async def _sync_write_back_layers(self):
        """同步写回层"""
        try:
            # 这里应该实现写回策略的同步逻辑
            # 将L1缓存中的脏数据同步到下层缓存
            
            self.coordinator_stats['sync_operations'] += 1
            logger.debug("写回层同步完成")
            
        except Exception as e:
            logger.error(f"同步写回层失败: {e}")
    
    async def _cleanup_loop(self):
        """清理循环"""
        while True:
            try:
                await self._cleanup_expired_entries()
                await asyncio.sleep(300)  # 每5分钟清理一次
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"清理循环异常: {e}")
                await asyncio.sleep(300)
    
    async def _cleanup_expired_entries(self):
        """清理过期条目"""
        try:
            # 这里应该实现过期条目的清理逻辑
            
            self.coordinator_stats['cleanup_operations'] += 1
            logger.debug("过期条目清理完成")
            
        except Exception as e:
            logger.error(f"清理过期条目失败: {e}")
    
    def get_coordinator_stats(self) -> Dict[str, Any]:
        """获取协调器统计"""
        return {
            'coordinator_stats': dict(self.coordinator_stats),
            'hierarchy_stats': self.hierarchy.get_hierarchy_stats(),
            'prefetcher_stats': self.prefetcher.get_prefetch_stats() if self.prefetcher else {},
            'write_through_layers': [layer.layer_name for layer in self.write_through_layers],
            'write_back_layers': [layer.layer_name for layer in self.write_back_layers],
            'timestamp': datetime.now().isoformat()
        }

class MultiLayerCache:
    """多层缓存系统"""
    
    def __init__(self, distributed_cache_manager=None, prefetcher=None, storage_path: str = None):
        """
        初始化多层缓存系统
        
        Args:
            distributed_cache_manager: 分布式缓存管理器
            prefetcher: 智能预取器
            storage_path: 持久化存储路径
        """
        self.distributed_cache_manager = distributed_cache_manager
        self.prefetcher = prefetcher
        self.storage_path = storage_path
        
        # 创建缓存层
        self.layers = []
        self.hierarchy = None
        self.coordinator = None
        
        logger.info("多层缓存系统初始化完成")
    
    async def initialize_default_layers(self) -> 'MultiLayerCache':
        """初始化默认缓存层配置"""
        try:
            # L1 内存缓存配置
            l1_config = CacheLayerConfig(
                layer_type=LayerType.L1_MEMORY,
                max_size=1000,
                max_memory_mb=100,
                default_ttl=3600,
                eviction_policy=CacheEvictionPolicy.LRU,
                write_policy=CacheWritePolicy.WRITE_BACK
            )
            
            l1_layer = MemoryCache(l1_config, "L1_Memory")
            self.layers.append(l1_layer)
            
            # L2 分布式缓存配置（如果可用）
            if self.distributed_cache_manager:
                l2_config = CacheLayerConfig(
                    layer_type=LayerType.L2_DISTRIBUTED,
                    max_size=10000,
                    max_memory_mb=1000,
                    default_ttl=7200,
                    eviction_policy=CacheEvictionPolicy.LRU,
                    write_policy=CacheWritePolicy.WRITE_THROUGH
                )
                
                l2_layer = DistributedCacheLayer(l2_config, self.distributed_cache_manager, "L2_Distributed")
                self.layers.append(l2_layer)
            
            # L3 持久化缓存配置
            l3_config = CacheLayerConfig(
                layer_type=LayerType.L3_PERSISTENT,
                max_size=100000,
                max_memory_mb=5000,
                default_ttl=86400,  # 24小时
                eviction_policy=CacheEvictionPolicy.TTL,
                write_policy=CacheWritePolicy.WRITE_THROUGH
            )
            
            l3_layer = PersistentCacheLayer(l3_config, self.storage_path, "L3_Persistent")
            self.layers.append(l3_layer)
            
            # 创建层次结构
            self.hierarchy = CacheHierarchy(self.layers)
            
            # 创建协调器
            self.coordinator = CacheCoordinator(self.hierarchy, self.prefetcher)
            
            logger.info(f"初始化了 {len(self.layers)} 个缓存层")
            return self
            
        except Exception as e:
            logger.error(f"初始化默认缓存层失败: {e}")
            raise
    
    async def start(self):
        """启动多层缓存系统"""
        try:
            if not self.coordinator:
                await self.initialize_default_layers()
            
            await self.coordinator.start()
            
            logger.info("多层缓存系统启动成功")
            
        except Exception as e:
            logger.error(f"启动多层缓存系统失败: {e}")
            raise
    
    async def stop(self):
        """停止多层缓存系统"""
        try:
            if self.coordinator:
                await self.coordinator.stop()
            
            logger.info("多层缓存系统已停止")
            
        except Exception as e:
            logger.error(f"停止多层缓存系统失败: {e}")
    
    async def get(self, key: str, user_id: str = None, session_id: str = None, 
                 context: Dict[str, Any] = None) -> Optional[Any]:
        """获取缓存值"""
        if not self.coordinator:
            raise RuntimeError("多层缓存系统未初始化")
        
        return await self.coordinator.get(key, user_id, session_id, context)
    
    async def put(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """设置缓存值"""
        if not self.coordinator:
            raise RuntimeError("多层缓存系统未初始化")
        
        return await self.coordinator.put(key, value, ttl)
    
    async def delete(self, key: str) -> bool:
        """删除缓存值"""
        if not self.coordinator:
            raise RuntimeError("多层缓存系统未初始化")
        
        return await self.coordinator.delete(key)
    
    def get_system_stats(self) -> Dict[str, Any]:
        """获取系统统计"""
        if not self.coordinator:
            return {'error': 'System not initialized'}
        
        return {
            'system_stats': self.coordinator.get_coordinator_stats(),
            'layer_count': len(self.layers),
            'layer_types': [layer.config.layer_type.value for layer in self.layers],
            'timestamp': datetime.now().isoformat()
        }

# 便捷工厂函数
async def create_multi_layer_cache(distributed_cache_manager=None, 
                                 prefetcher=None, 
                                 storage_path: str = None) -> MultiLayerCache:
    """创建多层缓存系统"""
    cache_system = MultiLayerCache(distributed_cache_manager, prefetcher, storage_path)
    await cache_system.start()
    return cache_system