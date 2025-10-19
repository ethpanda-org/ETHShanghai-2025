#!/usr/bin/env python3
"""
AetherPay 优化版预测器
- 使用更合理的5分钟预测窗口
- 实时聚合多个DEX价格
- 智能缓存机制
- 更准确的结算路径推荐
"""

import sys
import json
import os
import time
import numpy as np
from datetime import datetime, timedelta
import hashlib
import redis
import requests
from typing import Dict, List, Optional, Tuple

class OptimizedAetherPayPredictor:
    """
    优化策略：
    1. 5分钟预测窗口（更合理的时间范围）
    2. 实时DEX价格聚合（Uniswap, SushiSwap, 1inch等）
    3. 智能缓存（减少重复计算）
    4. 基于滑点的动态路径选择
    """

    def __init__(self):
        # Redis缓存连接
        try:
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                decode_responses=True,
                socket_connect_timeout=1
            )
            self.redis_client.ping()
            self.cache_enabled = True
        except:
            self.redis_client = None
            self.cache_enabled = False

        # 预测时间窗口（5分钟更合理）
        self.prediction_window = "5min"

        # DEX数据源权重
        self.dex_weights = {
            'uniswap_v3': 0.35,
            'sushiswap': 0.20,
            '1inch': 0.25,
            'curve': 0.10,
            'balancer': 0.10
        }

        # 价格影响阈值（基于订单大小）
        self.price_impact_thresholds = {
            'small': 1000,      # <$1k: 忽略滑点
            'medium': 10000,    # $1k-10k: 考虑滑点
            'large': 100000,    # $10k-100k: 重点优化滑点
            'whale': float('inf')  # >$100k: 最优路径拆单
        }

    def predict_optimized(self, pair: str, amount: float = 1000, confidence_threshold: float = 0.85):
        """
        优化的预测函数
        """
        # 检查缓存
        cache_key = self._get_cache_key(pair, amount)
        if self.cache_enabled:
            cached = self._get_from_cache(cache_key)
            if cached:
                cached['from_cache'] = True
                cached['cache_ttl'] = self._get_cache_ttl(cache_key)
                return cached

        # 获取实时DEX价格
        dex_prices = self._fetch_dex_prices(pair, amount)

        # 计算最优价格和滑点
        optimal_price, slippage, confidence = self._calculate_optimal_price(
            dex_prices, amount
        )

        # 预测5分钟后的价格（基于趋势分析）
        predicted_price = self._predict_future_price(
            pair, optimal_price, self.prediction_window
        )

        # 获取最优结算路径
        settlement_path = self._get_smart_settlement_path(
            pair, amount, slippage, dex_prices
        )

        result = {
            'pair': pair,
            'current_price': optimal_price,
            'predicted_price': predicted_price,
            'price_change': predicted_price - optimal_price,
            'price_change_pct': ((predicted_price - optimal_price) / optimal_price) * 100,
            'confidence': confidence,
            'prediction_horizon': self.prediction_window,
            'timestamp': datetime.now().isoformat(),
            'meets_threshold': confidence >= confidence_threshold,
            'slippage_bps': int(slippage * 10000),  # 基点表示
            'optimal_settlement_path': settlement_path,
            'dex_prices': dex_prices,
            'amount_usd': amount,
            'from_cache': False
        }

        # 缓存结果
        if self.cache_enabled:
            self._save_to_cache(cache_key, result, ttl=30)  # 30秒缓存

        return result

    def _fetch_dex_prices(self, pair: str, amount: float) -> Dict[str, Dict]:
        """
        从多个DEX获取实时价格
        """
        dex_prices = {}

        # 模拟DEX价格（实际应调用各DEX API）
        base_price = self._get_base_price(pair)

        # Uniswap V3（集中流动性，滑点小）
        dex_prices['uniswap_v3'] = {
            'price': base_price * (1 + np.random.uniform(-0.001, 0.001)),
            'liquidity': 50000000,  # $50M
            'slippage': self._calculate_slippage(amount, 50000000),
            'gas_cost': 0.00015  # ETH
        }

        # SushiSwap
        dex_prices['sushiswap'] = {
            'price': base_price * (1 + np.random.uniform(-0.002, 0.002)),
            'liquidity': 20000000,  # $20M
            'slippage': self._calculate_slippage(amount, 20000000),
            'gas_cost': 0.00012
        }

        # 1inch（聚合器）
        dex_prices['1inch'] = {
            'price': base_price * (1 + np.random.uniform(-0.0005, 0.0005)),
            'liquidity': 100000000,  # 聚合多个池
            'slippage': self._calculate_slippage(amount, 100000000) * 0.8,  # 聚合器优势
            'gas_cost': 0.00018,
            'route': ['Uniswap', 'Curve', 'Balancer']  # 路由路径
        }

        # Curve（稳定币专用）
        if self._is_stablecoin_pair(pair):
            dex_prices['curve'] = {
                'price': base_price * (1 + np.random.uniform(-0.0001, 0.0001)),
                'liquidity': 200000000,  # $200M for stables
                'slippage': self._calculate_slippage(amount, 200000000) * 0.1,  # 极低滑点
                'gas_cost': 0.00010
            }

        return dex_prices

    def _calculate_optimal_price(self, dex_prices: Dict, amount: float) -> Tuple[float, float, float]:
        """
        计算考虑滑点的最优价格
        """
        if not dex_prices:
            return 1.0, 0.0, 0.5

        weighted_prices = []
        total_weight = 0
        min_slippage = float('inf')

        for dex, data in dex_prices.items():
            if dex in self.dex_weights:
                weight = self.dex_weights[dex]
                # 根据滑点调整权重
                adjusted_weight = weight * (1 / (1 + data['slippage']))
                weighted_prices.append(data['price'] * adjusted_weight)
                total_weight += adjusted_weight
                min_slippage = min(min_slippage, data['slippage'])

        optimal_price = sum(weighted_prices) / total_weight if total_weight > 0 else 1.0

        # 置信度基于价格分散度
        prices = [d['price'] for d in dex_prices.values()]
        price_std = np.std(prices) if len(prices) > 1 else 0
        confidence = max(0.5, min(0.99, 1 - price_std / np.mean(prices)))

        return optimal_price, min_slippage, confidence

    def _predict_future_price(self, pair: str, current_price: float, window: str) -> float:
        """
        预测未来价格（5分钟）
        使用简单的趋势分析 + 波动率调整
        """
        # 获取历史趋势（模拟）
        trend = self._get_price_trend(pair)
        volatility = self._get_volatility(pair)

        # 5分钟预期变化 = 趋势 * 时间 + 随机波动
        time_factor = 5 / 60  # 5分钟占1小时的比例
        expected_change = trend * time_factor
        random_walk = np.random.normal(0, volatility * np.sqrt(time_factor))

        # 限制最大变化在2%以内（5分钟）
        max_change = 0.02
        total_change = np.clip(expected_change + random_walk, -max_change, max_change)

        return current_price * (1 + total_change)

    def _get_smart_settlement_path(self, pair: str, amount: float,
                                   slippage: float, dex_prices: Dict) -> Dict:
        """
        基于订单大小和滑点的智能路径选择
        """
        # 确定订单规模
        size_category = 'small'
        for category, threshold in self.price_impact_thresholds.items():
            if amount <= threshold:
                size_category = category
                break

        # 小额订单：选择最便宜的单一DEX
        if size_category == 'small':
            best_dex = min(dex_prices.items(),
                          key=lambda x: x[1]['price'] + x[1]['gas_cost'])
            return {
                'name': f'{best_dex[0].replace("_", " ").title()} Direct',
                'protocol': best_dex[0],
                'estimated_cost_pct': 0.3,
                'settlement_time_seconds': 15,
                'reliability': 0.98,
                'risk_level': 'low',
                'reason': f'Best price for orders <${self.price_impact_thresholds["small"]}',
                'route': [best_dex[0]],
                'estimated_slippage_bps': int(best_dex[1]['slippage'] * 10000)
            }

        # 中等订单：使用聚合器
        elif size_category == 'medium':
            if '1inch' in dex_prices:
                return {
                    'name': '1inch Aggregator',
                    'protocol': '1inch',
                    'estimated_cost_pct': 0.4,
                    'settlement_time_seconds': 20,
                    'reliability': 0.97,
                    'risk_level': 'low',
                    'reason': f'Optimal routing for ${amount:.0f} order',
                    'route': dex_prices['1inch'].get('route', ['Multiple DEXs']),
                    'estimated_slippage_bps': int(slippage * 10000)
                }

        # 大额订单：拆单策略
        elif size_category in ['large', 'whale']:
            return {
                'name': 'Smart Order Routing (SOR)',
                'protocol': 'Multi-DEX Split',
                'estimated_cost_pct': 0.5,
                'settlement_time_seconds': 45,
                'reliability': 0.99,
                'risk_level': 'very_low',
                'reason': f'Split execution across {len(dex_prices)} DEXs to minimize slippage',
                'route': list(dex_prices.keys()),
                'estimated_slippage_bps': int(slippage * 10000 * 0.6),  # 拆单减少40%滑点
                'split_strategy': self._get_split_strategy(amount, dex_prices)
            }

        # 默认路径
        return {
            'name': 'FXPool Direct Swap',
            'protocol': 'FXPool',
            'estimated_cost_pct': 0.6,
            'settlement_time_seconds': 12,
            'reliability': 0.98,
            'risk_level': 'low',
            'reason': 'Default settlement path',
            'estimated_slippage_bps': int(slippage * 10000)
        }

    def _get_split_strategy(self, amount: float, dex_prices: Dict) -> List[Dict]:
        """
        计算拆单策略
        """
        splits = []
        remaining = amount

        # 按流动性排序
        sorted_dexs = sorted(dex_prices.items(),
                           key=lambda x: x[1]['liquidity'],
                           reverse=True)

        for dex, data in sorted_dexs:
            # 每个DEX最多承担其流动性的1%
            max_amount = data['liquidity'] * 0.01
            split_amount = min(remaining, max_amount)

            if split_amount > 0:
                splits.append({
                    'dex': dex,
                    'amount': split_amount,
                    'percentage': (split_amount / amount) * 100
                })
                remaining -= split_amount

            if remaining <= 0:
                break

        return splits

    def _calculate_slippage(self, amount: float, liquidity: float) -> float:
        """
        计算滑点（简化的恒定乘积公式）
        """
        if liquidity <= 0:
            return 0.1  # 10%默认滑点

        # 滑点 ≈ (订单量 / 流动性) ^ 2
        impact = (amount / liquidity) ** 2
        return min(impact, 0.1)  # 最大10%

    def _get_base_price(self, pair: str) -> float:
        """获取基础价格"""
        default_prices = {
            'BTC/USDT': 65000,
            'ETH/USDT': 3500,
            'SOL/USDT': 120,
            'USDC/USDT': 1.0,
            'USDT/USDC': 1.0
        }
        return default_prices.get(pair, 1.0)

    def _get_price_trend(self, pair: str) -> float:
        """获取价格趋势（每小时）"""
        # 模拟趋势：-2% 到 +2% 每小时
        trends = {
            'BTC/USDT': 0.005,   # +0.5%/hour
            'ETH/USDT': -0.008,  # -0.8%/hour
            'SOL/USDT': 0.015,   # +1.5%/hour
        }
        return trends.get(pair, 0.0)

    def _get_volatility(self, pair: str) -> float:
        """获取波动率"""
        volatilities = {
            'BTC/USDT': 0.02,   # 2% 标准差
            'ETH/USDT': 0.03,   # 3%
            'SOL/USDT': 0.05,   # 5%
            'USDC/USDT': 0.001, # 0.1%
        }
        return volatilities.get(pair, 0.02)

    def _is_stablecoin_pair(self, pair: str) -> bool:
        """判断是否为稳定币对"""
        stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD']
        tokens = pair.split('/')
        return all(token in stablecoins for token in tokens)

    def _get_cache_key(self, pair: str, amount: float) -> str:
        """生成缓存键"""
        # 金额四舍五入到最近的100
        rounded_amount = round(amount / 100) * 100
        return f"aetherpay:predict:{pair}:{rounded_amount}"

    def _get_from_cache(self, key: str) -> Optional[Dict]:
        """从缓存获取"""
        if not self.cache_enabled:
            return None
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        except:
            pass
        return None

    def _save_to_cache(self, key: str, data: Dict, ttl: int = 30):
        """保存到缓存"""
        if not self.cache_enabled:
            return
        try:
            self.redis_client.setex(key, ttl, json.dumps(data, default=str))
        except:
            pass

    def _get_cache_ttl(self, key: str) -> int:
        """获取缓存剩余时间"""
        if not self.cache_enabled:
            return 0
        try:
            ttl = self.redis_client.ttl(key)
            return max(0, ttl)
        except:
            return 0


def main():
    """命令行接口"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'usage',
            'message': 'Usage: python aetherpay_predictor_optimized.py <pair> [amount] [confidence]'
        }))
        sys.exit(1)

    pair = sys.argv[1]
    amount = float(sys.argv[2]) if len(sys.argv) > 2 else 1000
    confidence_threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.85

    try:
        predictor = OptimizedAetherPayPredictor()
        result = predictor.predict_optimized(pair, amount, confidence_threshold)
        print(json.dumps(result, default=str, indent=2))
    except Exception as e:
        print(json.dumps({
            'error': 'prediction_failed',
            'message': str(e)
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()