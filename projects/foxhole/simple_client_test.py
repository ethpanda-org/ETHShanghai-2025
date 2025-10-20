#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的 WebSocket 客户端测试
演示如何连接和接收数据
"""

import asyncio
import websockets
import json
from datetime import datetime


async def simple_test():
    """简单测试 WebSocket 连接和数据接收"""
    uri = "ws://localhost:8765"
    
    print("=" * 70)
    print("WebSocket 客户端测试")
    print("=" * 70)
    print(f"连接到: {uri}\n")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ 连接成功!\n")
            print("-" * 70)
            
            # 接收并显示所有消息
            message_count = 0
            
            # 先接收欢迎消息
            welcome = await websocket.recv()
            welcome_data = json.loads(welcome)
            print(f"\n📩 消息 #{message_count + 1}")
            print(f"类型: {welcome_data.get('log_type', 'unknown')}")
            print(f"内容: {json.dumps(welcome_data, indent=2, ensure_ascii=False)}")
            message_count += 1
            
            # 发送审计请求
            print("\n" + "-" * 70)
            print("📤 发送审计请求: MACROHARD")
            print("-" * 70)
            
            await websocket.send(json.dumps({
                "action": "audit_token",
                "token_symbol": "MACROHARD"
            }))
            
            # 接收审计过程中的所有消息
            async for message in websocket:
                try:
                    data = json.loads(message)
                    message_count += 1
                    log_type = data.get('log_type', 'unknown')
                    
                    print(f"\n📩 消息 #{message_count}")
                    print(f"类型: {log_type}")
                    print(f"时间: {data.get('timestamp', 'N/A')}")
                    
                    # 显示关键信息
                    if log_type == 'search_token':
                        print(f"代币: {data.get('token_symbol')}")
                        print(f"状态: {data.get('status')}")
                        print(f"找到交易对: {data.get('total_pairs', 0)} 个")
                    
                    elif log_type == 'filter_bsc_pairs':
                        print(f"总交易对: {data.get('total_pairs', 0)}")
                        print(f"BSC 交易对: {data.get('bsc_pairs_count', 0)}")
                        print(f"链统计: {data.get('chain_stats', {})}")
                    
                    elif log_type == 'extract_contracts':
                        print(f"唯一合约: {data.get('unique_contracts', 0)}")
                        print(f"重复数量: {data.get('duplicate_count', 0)}")
                    
                    elif log_type == 'heuristic_analysis':
                        rec = data.get('recommended_contract', {})
                        print(f"推荐合约: {rec.get('address', 'N/A')}")
                        print(f"风险评分: {rec.get('risk_score', 'N/A')}/10")
                        print(f"风险等级: {rec.get('risk_level', 'N/A')}")
                    
                    elif log_type == 'audit_complete':
                        print(f"代币: {data.get('token')}")
                        print(f"状态: {data.get('status')}")
                        print(f"风险等级: {data.get('risk_level')}")
                        
                        if data.get('recommended'):
                            rec = data['recommended']
                            print(f"\n✓ 推荐合约信息:")
                            print(f"  Token CA:  {rec.get('token_address')}")
                            print(f"  Pair CA:   {rec.get('pair_address')}")
                            print(f"  名称:      {rec.get('name')}")
                            print(f"  符号:      {rec.get('symbol')}")
                            print(f"  DEX:       {rec.get('dex')}")
                            print(f"  价格:      ${rec.get('price_usd')}")
                            print(f"  流动性:    ${rec.get('liquidity_usd', 0):,.2f}")
                            print(f"  24h 交易量: ${rec.get('volume_24h', 0):,.2f}")
                            print(f"  24h 交易次数: {rec.get('txns_24h_total', 0)}")
                            print(f"  风险评分:  {rec.get('risk_score', 'N/A')}/10")
                            print(f"  DexScreener: {rec.get('dex_url', 'N/A')}")
                        
                        # 审计完成，退出
                        print("\n" + "=" * 70)
                        print(f"✓ 测试完成! 共接收 {message_count} 条消息")
                        print("=" * 70)
                        break
                    
                    # 显示完整 JSON（可选，用于调试）
                    # print(f"完整数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
                
                except json.JSONDecodeError as e:
                    print(f"✗ JSON 解析错误: {e}")
                except Exception as e:
                    print(f"✗ 处理消息错误: {e}")
    
    except ConnectionRefusedError:
        print("✗ 连接失败: 服务器未启动")
        print("\n请先启动服务器:")
        print("  python ws_server.py")
    
    except Exception as e:
        print(f"✗ 错误: {e}")


if __name__ == "__main__":
    print("\n提示: 按 Ctrl+C 可以随时停止测试\n")
    try:
        asyncio.run(simple_test())
    except KeyboardInterrupt:
        print("\n\n测试已中断")

