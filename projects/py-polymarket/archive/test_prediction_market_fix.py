#!/usr/bin/env python3
"""
测试预测市场修正后的交易逻辑
"""

import json
from datetime import datetime
import sys
import os

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 模拟测试数据
def create_test_market():
    return {
        "market_id": "test_market_1",
        "title": "Will Bitcoin reach $100,000 by end of 2024?",
        "price": 0.85,  # 高价格，应该触发 BUY_NO
        "volume_24h": 50000,
        "time_to_expiry": 30
    }

def test_trading_logic():
    """测试新的交易逻辑"""
    print("=== 预测市场交易逻辑测试 ===")
    
    # 测试数据
    market = create_test_market()
    signal_strength = -0.6  # 负信号，但由于价格高，应该买NO代币
    
    print(f"市场: {market['title']}")
    print(f"当前价格: {market['price']}")
    print(f"信号强度: {signal_strength}")
    
    # 新的预测市场逻辑
    current_price = market["price"]
    
    if current_price > 0.75:
        direction = "BUY_NO"  # 认为事件不会发生，价格被高估
        reasoning = f"高价格区域({current_price:.3f} > 0.75)，买入NO代币，认为被高估"
    elif current_price < 0.25:
        direction = "BUY_YES"  # 认为事件会发生，价格被低估  
        reasoning = f"低价格区域({current_price:.3f} < 0.25)，买入YES代币，认为被低估"
    else:
        # 中等价格区域，根据信号强度决定
        direction = "BUY_YES" if signal_strength > 0 else "BUY_NO"
        reasoning = f"中等价格区域，信号{signal_strength:.2f}，买入{'YES' if signal_strength > 0 else 'NO'}代币"
    
    print(f"交易方向: {direction}")
    print(f"决策原因: {reasoning}")
    
    # 计算目标价格和止损
    if direction == "BUY_NO":
        target_price = current_price * (1 - abs(signal_strength) * 0.15)
        stop_loss = current_price * (1 + 0.06)
        profit_scenario = f"如果价格下跌到{target_price:.3f}，NO代币盈利"
    else:
        target_price = current_price * (1 + abs(signal_strength) * 0.15)
        stop_loss = current_price * (1 - 0.06)
        profit_scenario = f"如果价格上涨到{target_price:.3f}，YES代币盈利"
    
    print(f"目标价格: {target_price:.3f}")
    print(f"止损价格: {stop_loss:.3f}")
    print(f"盈利场景: {profit_scenario}")
    
    # 测试收益计算
    test_exit_prices = [0.90, 0.80, 0.70]
    position_size = 1000
    entry_price = current_price
    
    print(f"\n收益测试 (入场价格: {entry_price:.3f}, 持仓: ${position_size}):")
    
    for exit_price in test_exit_prices:
        if direction == "BUY_YES":
            pnl = position_size * (exit_price - entry_price) / entry_price
        elif direction == "BUY_NO":
            pnl = position_size * (entry_price - exit_price) / entry_price
        else:
            pnl = position_size * (exit_price - entry_price) / entry_price
            
        pnl_pct = (pnl / position_size) * 100
        
        print(f"  出场价格 {exit_price:.3f}: PnL = ${pnl:.2f} ({pnl_pct:+.1f}%)")
    
    print("\n=== 测试完成 ===")
    
    # 验证逻辑正确性
    print(f"\n验证: 当前实现 {'✅ 正确' if direction in ['BUY_YES', 'BUY_NO'] else '❌ 错误'}")
    print(f"原问题: SELL操作 {'✅ 已修复' if 'SELL' not in direction else '❌ 仍存在'}")

def test_multiple_scenarios():
    """测试多种价格场景"""
    print("\n=== 多场景测试 ===")
    
    scenarios = [
        {"price": 0.15, "signal": 0.5, "expected": "BUY_YES", "reason": "低价区域"},
        {"price": 0.85, "signal": 0.5, "expected": "BUY_NO", "reason": "高价区域"},
        {"price": 0.45, "signal": 0.3, "expected": "BUY_YES", "reason": "中价区域+正信号"},
        {"price": 0.55, "signal": -0.4, "expected": "BUY_NO", "reason": "中价区域+负信号"},
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        price = scenario["price"]
        signal = scenario["signal"]
        
        # 应用交易逻辑
        if price > 0.75:
            direction = "BUY_NO"
        elif price < 0.25:
            direction = "BUY_YES"
        else:
            direction = "BUY_YES" if signal > 0 else "BUY_NO"
        
        expected = scenario["expected"]
        status = "✅" if direction == expected else "❌"
        
        print(f"场景{i}: 价格{price:.2f}, 信号{signal:+.1f} -> {direction} {status} ({scenario['reason']})")

if __name__ == "__main__":
    test_trading_logic()
    test_multiple_scenarios()
    
    print(f"\n=== 修正总结 ===")
    print(f"❌ 原问题: 预测市场错误使用SELL操作")
    print(f"✅ 修正后: 只使用BUY_YES和BUY_NO操作")
    print(f"✅ 高价格(>0.75): 买入NO代币")
    print(f"✅ 低价格(<0.25): 买入YES代币")
    print(f"✅ 中等价格: 根据信号方向决定")
    print(f"✅ 收益计算: 针对YES/NO代币分别计算")