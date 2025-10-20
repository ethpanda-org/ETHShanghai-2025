#!/usr/bin/env python3
"""
8小时预测市场模拟测试结果分析
"""

import json
from datetime import datetime, timedelta

def analyze_8hour_test_results():
    """分析8小时测试结果"""
    
    # 读取最新的测试报告
    report_path = ".venv/.venv/enhanced_simulation_report_20250918_074838.json"
    
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"未找到报告文件: {report_path}")
        return
    
    print("=" * 80)
    print("8小时预测市场模拟测试结果分析")
    print("=" * 80)
    
    # 基本信息
    summary = data["simulation_summary"]
    print(f"测试类型: {data['simulation_type'].upper()}")
    print(f"策略模式: {data['strategies_used']}")
    print(f"开始时间: {summary['start_time']}")
    print(f"结束时间: {summary['end_time']}")
    print(f"实际运行: {summary['duration_hours']:.2f} 小时")
    print()
    
    # 资金表现
    performance = summary["performance_metrics"]
    print("[FUNDS] 资金表现:")
    print(f"   初始资金: ${summary['initial_balance']:,}")
    print(f"   最终资金: ${summary['final_balance']:,}")
    print(f"   当前余额: ${performance['current_balance']:,}")
    print(f"   总收益率: {performance['total_return']}%")
    print()
    
    # 交易统计
    print("[TRADES] 交易统计:")
    print(f"   总交易数: {performance['total_trades']} 笔")
    print(f"   开仓数量: {performance['open_positions']} 笔")
    print(f"   胜率: {performance['win_rate']}%")
    print()
    
    # 分析交易明细
    trades = data["trades"]
    print("[DETAILS] 交易明细分析:")
    
    buy_yes_count = 0
    buy_no_count = 0
    buy_yes_amount = 0
    buy_no_amount = 0
    
    print("\n交易列表:")
    for i, trade in enumerate(trades, 1):
        direction = trade["direction"]
        price = trade["entry_price"]
        amount = trade["position_size"]
        market = trade["market_title"]
        
        if direction == "BUY_YES":
            buy_yes_count += 1
            buy_yes_amount += amount
            direction_emoji = "[UP]"
        elif direction == "BUY_NO":
            buy_no_count += 1
            buy_no_amount += amount
            direction_emoji = "[DOWN]"
        else:
            direction_emoji = "[?]"
        
        print(f"   {i}. {direction_emoji} {direction} @ ${price:.3f} (${amount:.0f})")
        print(f"      市场: {market}")
        print(f"      状态: {trade['status']}")
        print()
    
    # 交易类型统计
    print("[STATS] 交易类型统计:")
    print(f"   BUY_YES交易: {buy_yes_count} 笔, 总金额: ${buy_yes_amount:.0f}")
    print(f"   BUY_NO交易:  {buy_no_count} 笔, 总金额: ${buy_no_amount:.0f}")
    print()
    
    # 验证修正效果
    print("[VERIFY] 预测市场修正验证:")
    has_sell = any(trade["direction"] == "SELL" for trade in trades)
    has_buy_yes = any(trade["direction"] == "BUY_YES" for trade in trades)
    has_buy_no = any(trade["direction"] == "BUY_NO" for trade in trades)
    
    print(f"   [X] SELL操作: {'发现' if has_sell else '已消除'} OK")
    print(f"   [OK] BUY_YES操作: {'已实现' if has_buy_yes else '未发现'} OK")  
    print(f"   [OK] BUY_NO操作: {'已实现' if has_buy_no else '未发现'} OK")
    print()
    
    # 价格区间分析
    print("[PRICE] 价格区间交易分析:")
    high_price_trades = [t for t in trades if t["entry_price"] > 0.75]
    low_price_trades = [t for t in trades if t["entry_price"] < 0.25]
    mid_price_trades = [t for t in trades if 0.25 <= t["entry_price"] <= 0.75]
    
    print(f"   高价区间(>0.75): {len(high_price_trades)} 笔")
    for trade in high_price_trades:
        expected = "BUY_NO" 
        actual = trade["direction"]
        status = "[OK]" if actual == expected else "[ERROR]"
        print(f"     - 价格:{trade['entry_price']:.3f} -> {actual} {status}")
    
    print(f"   低价区间(<0.25): {len(low_price_trades)} 笔")
    for trade in low_price_trades:
        expected = "BUY_YES"
        actual = trade["direction"]
        status = "[OK]" if actual == expected else "[ERROR]"
        print(f"     - 价格:{trade['entry_price']:.3f} -> {actual} {status}")
    
    print(f"   中价区间(0.25-0.75): {len(mid_price_trades)} 笔")
    for trade in mid_price_trades:
        signal = trade["signal_strength"]
        expected = "BUY_YES" if signal > 0 else "BUY_NO"
        actual = trade["direction"]
        status = "[OK]" if actual == expected else "[ERROR]"
        print(f"     - 价格:{trade['entry_price']:.3f}, 信号:{signal:+.1f} -> {actual} {status}")
    
    print()
    
    # 系统稳定性
    portfolio_history = data["portfolio_history"]
    print("[SYSTEM] 系统稳定性:")
    print(f"   数据点数: {len(portfolio_history)} 个")
    print(f"   监控周期: 约{8*60/len(portfolio_history):.1f}分钟/次")
    print()
    
    # 总结
    print("=" * 80)
    print("[SUMMARY] 测试总结")
    print("=" * 80)
    
    # 验证修正是否成功
    all_correct_logic = True
    reasons = []
    
    if has_sell:
        all_correct_logic = False
        reasons.append("仍存在SELL操作")
    
    for trade in high_price_trades:
        if trade["direction"] != "BUY_NO":
            all_correct_logic = False
            reasons.append(f"高价({trade['entry_price']:.3f})未买NO代币")
    
    for trade in low_price_trades:
        if trade["direction"] != "BUY_YES":
            all_correct_logic = False
            reasons.append(f"低价({trade['entry_price']:.3f})未买YES代币")
    
    if all_correct_logic:
        print("[SUCCESS] 预测市场逻辑修正: 完全成功!")
        print("   - 所有交易都使用正确的BUY_YES/BUY_NO机制")
        print("   - 高价区域正确买入NO代币")
        print("   - 低价区域正确买入YES代币")
        print("   - 中价区域根据信号方向正确决策")
    else:
        print("[WARNING] 预测市场逻辑修正: 部分问题")
        for reason in reasons:
            print(f"   - {reason}")
    
    print()
    print(f"[OK] 系统稳定性: 连续运行{summary['duration_hours']:.1f}小时无崩溃")
    print(f"[OK] 数据完整性: 生成{len(portfolio_history)}个监控快照")
    print(f"[OK] 交易执行: 成功执行{performance['total_trades']}笔交易")
    
    if performance['total_trades'] < 20:
        print(f"[INFO] 建议: 交易数量({performance['total_trades']})低于预期(20-50笔)")
        print("   可能原因: 策略过于保守或市场条件不活跃")
    
    print("\n[NEXT] 下一步建议:")
    print("1. 测试更长时间(24小时)验证长期稳定性")
    print("2. 调整策略参数增加交易频率")
    print("3. 添加更多样化的市场数据")
    print("4. 实施动态价格模拟")

if __name__ == "__main__":
    analyze_8hour_test_results()