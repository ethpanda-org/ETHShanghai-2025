#!/usr/bin/env python3
"""
DEX Path Optimizer - AI-powered Settlement Path Recommendation
智能结算路径推荐器

根据订单金额、交易对、AI置信度等因素，推荐最优结算路径
"""

import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class PathOptimizer:
    def __init__(self):
        # 定义可用的结算路径及其特性
        self.settlement_paths = {
            'fxpool_direct': {
                'name': 'FXPool Direct Swap',
                'protocol': 'FXPool',
                'base_cost_pct': 0.006,  # 0.6%
                'base_time_seconds': 12,
                'reliability': 0.98,
                'min_liquidity': 100,     # 最小支持$100
                'max_liquidity': 1000000, # 最大支持$1M
                'risk_level': 'low',
                'reason': 'Concentrated liquidity pool with AI-optimized rates',
                'best_for': 'general'
            },
            'curve_finance': {
                'name': 'Curve Finance',
                'protocol': 'Curve',
                'base_cost_pct': 0.0004,  # 0.04%
                'base_time_seconds': 18,
                'reliability': 0.99,
                'min_liquidity': 10,
                'max_liquidity': 10000000,
                'risk_level': 'low',
                'reason': 'Best for stablecoin swaps with minimal slippage',
                'best_for': 'stablecoin'
            },
            'uniswap_v3': {
                'name': 'Uniswap V3',
                'protocol': 'Uniswap V3',
                'base_cost_pct': 0.003,  # 0.3%
                'base_time_seconds': 15,
                'reliability': 0.95,
                'min_liquidity': 50,
                'max_liquidity': 5000000,
                'risk_level': 'low',
                'reason': 'Deep liquidity for crypto pairs',
                'best_for': 'crypto'
            },
            'l2_direct': {
                'name': 'Direct L2 Settlement',
                'protocol': 'OP-Stack',
                'base_cost_pct': 0.006,
                'base_time_seconds': 10,
                'reliability': 0.99,
                'min_liquidity': 1,
                'max_liquidity': 1000,
                'risk_level': 'low',
                'reason': 'Ultra-fast settlement for small amounts',
                'best_for': 'small_amount'
            },
            'zk_batched': {
                'name': 'Batched zk-Relay',
                'protocol': 'zkSync Era',
                'base_cost_pct': 0.008,
                'base_time_seconds': 45,
                'reliability': 0.995,
                'min_liquidity': 10000,
                'max_liquidity': float('inf'),
                'risk_level': 'very_low',
                'reason': 'Maximum security for large transactions',
                'best_for': 'large_amount'
            },
            'optimistic': {
                'name': 'Optimistic Settlement',
                'protocol': 'Optimism',
                'base_cost_pct': 0.0065,
                'base_time_seconds': 25,
                'reliability': 0.97,
                'min_liquidity': 500,
                'max_liquidity': 50000,
                'risk_level': 'medium',
                'reason': 'Balanced approach for medium amounts',
                'best_for': 'medium_amount'
            }
        }

    def is_stablecoin_pair(self, pair: str) -> bool:
        """判断是否为稳定币对"""
        stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'USDD']
        try:
            token_a, token_b = pair.split('/')
            return token_a in stablecoins and token_b in stablecoins
        except:
            return False

    def is_crypto_pair(self, pair: str) -> bool:
        """判断是否为加密货币对"""
        cryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'BNB', 'MATIC', 'AVAX']
        stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD']
        try:
            token_a, token_b = pair.split('/')
            # 至少有一个是加密货币，另一个是稳定币
            return (token_a in cryptos and token_b in stablecoins) or \
                   (token_b in cryptos and token_a in stablecoins)
        except:
            return False

    def calculate_path_score(self,
                            path_info: Dict,
                            amount: float,
                            confidence: float,
                            pair_type: str) -> float:
        """
        计算路径综合评分

        评分因素:
        - 成本 (40%)
        - 速度 (30%)
        - 可靠性 (20%)
        - 流动性适配度 (10%)
        """
        # 1. 成本评分 (越低越好，归一化到0-1)
        cost_score = 1.0 - min(path_info['base_cost_pct'] / 0.01, 1.0)

        # 2. 速度评分 (越快越好，归一化到0-1)
        speed_score = 1.0 - min(path_info['base_time_seconds'] / 60, 1.0)

        # 3. 可靠性评分 (已经是0-1)
        reliability_score = path_info['reliability']

        # 4. 流动性适配度评分
        if amount < path_info['min_liquidity']:
            liquidity_score = 0.5  # 金额过小
        elif amount > path_info['max_liquidity']:
            liquidity_score = 0.3  # 金额过大，有风险
        else:
            # 在合理范围内
            liquidity_score = 1.0

        # 5. 交易对类型匹配度
        type_match_score = 1.0
        if pair_type == 'stablecoin' and path_info['best_for'] == 'stablecoin':
            type_match_score = 1.2  # 加成
        elif pair_type == 'crypto' and path_info['best_for'] == 'crypto':
            type_match_score = 1.2

        # 根据订单金额和置信度动态调整权重
        if amount > 10000:
            # 大额订单：可靠性更重要
            weights = {'cost': 0.2, 'speed': 0.1, 'reliability': 0.5, 'liquidity': 0.2}
        elif amount < 1000:
            # 小额订单：速度更重要
            weights = {'cost': 0.3, 'speed': 0.5, 'reliability': 0.1, 'liquidity': 0.1}
        else:
            # 中等订单：平衡
            weights = {'cost': 0.4, 'speed': 0.3, 'reliability': 0.2, 'liquidity': 0.1}

        # 低置信度：提高可靠性权重
        if confidence < 0.8:
            weights['reliability'] += 0.2
            weights['cost'] -= 0.1
            weights['speed'] -= 0.1

        # 综合评分
        total_score = (
            weights['cost'] * cost_score +
            weights['speed'] * speed_score +
            weights['reliability'] * reliability_score +
            weights['liquidity'] * liquidity_score
        ) * type_match_score

        return total_score

    def get_optimal_path(self,
                        pair: str,
                        amount: float = 1000.0,
                        confidence: float = 0.9) -> Dict:
        """
        获取最优结算路径

        Args:
            pair: 交易对 (e.g., "USDC/USDT")
            amount: 订单金额 (USD)
            confidence: AI预测置信度

        Returns:
            最优路径信息字典
        """
        # 判断交易对类型
        if self.is_stablecoin_pair(pair):
            pair_type = 'stablecoin'
        elif self.is_crypto_pair(pair):
            pair_type = 'crypto'
        else:
            pair_type = 'other'

        # 计算每个路径的评分
        scored_paths = []
        for path_id, path_info in self.settlement_paths.items():
            score = self.calculate_path_score(path_info, amount, confidence, pair_type)
            scored_paths.append((score, path_id, path_info))

        # 按评分排序
        scored_paths.sort(reverse=True, key=lambda x: x[0])

        # 选择最优路径
        best_score, best_path_id, best_path_info = scored_paths[0]

        # 获取备选路径（排除最优路径）
        alternative_paths = [
            path_info['name']
            for _, _, path_info in scored_paths[1:4]  # 取前3个备选
        ]

        # 根据实际情况调整原因说明
        reason = best_path_info['reason']
        if amount > 10000:
            reason += f" (Optimized for ${amount:,.0f} large transaction)"
        elif amount < 1000:
            reason += f" (Fast settlement for ${amount:,.2f} small amount)"
        else:
            reason += f" (Balanced approach for ${amount:,.2f})"

        if confidence < 0.8:
            reason += " | Low confidence - prioritized security"

        # 根据金额调整成本和时间估算
        adjusted_cost_pct = best_path_info['base_cost_pct']
        adjusted_time = best_path_info['base_time_seconds']

        # 大额订单可能需要更多时间确认
        if amount > 50000:
            adjusted_time = int(adjusted_time * 1.5)

        # 构建返回结果
        result = {
            'name': best_path_info['name'],
            'protocol': best_path_info['protocol'],
            'estimated_cost_pct': adjusted_cost_pct,
            'settlement_time_seconds': adjusted_time,
            'reliability': best_path_info['reliability'],
            'risk_level': best_path_info['risk_level'],
            'reason': reason,
            'alternative_paths': alternative_paths,
            'selected_at': datetime.now().isoformat(),
            'optimization_factors': {
                'pair': pair,
                'pair_type': pair_type,
                'amount_usd': amount,
                'confidence': confidence,
                'score': round(best_score, 3)
            }
        }

        return result

    def get_all_paths_comparison(self, pair: str, amount: float, confidence: float) -> List[Dict]:
        """
        获取所有路径的对比数据（用于前端展示备选方案）
        """
        pair_type = 'stablecoin' if self.is_stablecoin_pair(pair) else 'crypto'

        paths_comparison = []
        for path_id, path_info in self.settlement_paths.items():
            score = self.calculate_path_score(path_info, amount, confidence, pair_type)

            paths_comparison.append({
                'name': path_info['name'],
                'protocol': path_info['protocol'],
                'cost_pct': path_info['base_cost_pct'] * 100,
                'time_seconds': path_info['base_time_seconds'],
                'reliability': path_info['reliability'] * 100,
                'risk_level': path_info['risk_level'],
                'score': round(score, 3),
                'suitable_for': path_info['best_for']
            })

        # 按评分排序
        paths_comparison.sort(reverse=True, key=lambda x: x['score'])

        return paths_comparison


def main():
    """命令行接口"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'usage',
            'message': 'Usage: python dex_path_optimizer.py <pair> [amount] [confidence]',
            'example': 'python dex_path_optimizer.py USDC/USDT 5000 0.95'
        }))
        sys.exit(1)

    pair = sys.argv[1]
    amount = float(sys.argv[2]) if len(sys.argv) > 2 else 1000.0
    confidence = float(sys.argv[3]) if len(sys.argv) > 3 else 0.9

    # 验证参数
    if amount <= 0:
        print(json.dumps({'error': 'Invalid amount, must be > 0'}))
        sys.exit(1)

    if not (0 <= confidence <= 1):
        print(json.dumps({'error': 'Invalid confidence, must be between 0 and 1'}))
        sys.exit(1)

    try:
        optimizer = PathOptimizer()

        # 如果传入 'compare' 作为第4个参数，返回所有路径对比
        if len(sys.argv) > 4 and sys.argv[4] == 'compare':
            result = {
                'optimal_path': optimizer.get_optimal_path(pair, amount, confidence),
                'all_paths': optimizer.get_all_paths_comparison(pair, amount, confidence)
            }
        else:
            result = optimizer.get_optimal_path(pair, amount, confidence)

        print(json.dumps(result, indent=2))

    except Exception as e:
        print(json.dumps({
            'error': 'optimization_failed',
            'message': str(e),
            'pair': pair,
            'amount': amount,
            'confidence': confidence
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
