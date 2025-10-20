#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
连接到远程 WebSocket 服务器
服务器地址: ws://189.1.222.236:8765
"""

import asyncio
import websockets
import json
from datetime import datetime


async def connect_remote_server():
    """连接到远程 WebSocket 服务器"""
    # 远程服务器地址
    uri = "ws://189.1.222.236:8765"
    
    print("=" * 70)
    print("连接到远程 WebSocket 服务器")
    print("=" * 70)
    print(f"服务器地址: {uri}")
    print(f"连接时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()
    
    try:
        # 连接到服务器（设置较长的超时时间）
        print("正在连接...")
        async with websockets.connect(uri, ping_timeout=60, close_timeout=10) as websocket:
            print("✓ 连接成功!\n")
            print("-" * 70)
            
            # 接收欢迎消息
            try:
                welcome = await asyncio.wait_for(websocket.recv(), timeout=10)
                welcome_data = json.loads(welcome)
                print(f"📩 收到服务器消息:")
                print(f"  类型: {welcome_data.get('log_type', 'unknown')}")
                print(f"  消息: {welcome_data.get('message', '')}")
                print(f"  版本: {welcome_data.get('server_version', 'N/A')}")
                print(f"  在线客户端: {welcome_data.get('connected_clients', 0)}")
            except asyncio.TimeoutError:
                print("⚠ 未收到欢迎消息（超时）")
            
            print("\n" + "-" * 70)
            
            # 菜单选项
            while True:
                print("\n请选择操作:")
                print("1. 发送审计请求")
                print("2. 发送心跳测试")
                print("3. 持续监听消息")
                print("4. 退出")
                
                choice = input("\n请输入选项 (1-4): ").strip()
                
                if choice == '1':
                    # 发送审计请求
                    token = input("请输入代币符号 (例如: MACROHARD): ").strip()
                    if token:
                        print(f"\n📤 发送审计请求: ${token}")
                        await websocket.send(json.dumps({
                            "action": "audit_token",
                            "token_symbol": token
                        }))
                        print("✓ 请求已发送，等待响应...\n")
                        
                        # 接收审计过程中的消息
                        message_count = 0
                        try:
                            while message_count < 20:  # 限制最多接收20条消息
                                message = await asyncio.wait_for(websocket.recv(), timeout=180)
                                data = json.loads(message)
                                message_count += 1
                                
                                log_type = data.get('log_type', 'unknown')
                                print(f"\n📩 [{log_type}]")
                                
                                if log_type == 'search_token':
                                    print(f"  找到 {data.get('total_pairs', 0)} 个交易对")
                                
                                elif log_type == 'filter_bsc_pairs':
                                    print(f"  BSC 交易对: {data.get('bsc_pairs_count', 0)}")
                                
                                elif log_type == 'extract_contracts':
                                    print(f"  提取 {data.get('unique_contracts', 0)} 个合约")
                                
                                elif log_type == 'heuristic_analysis':
                                    rec = data.get('recommended_contract', {})
                                    print(f"  推荐合约: {rec.get('address', 'N/A')[:20]}...")
                                    print(f"  风险等级: {rec.get('risk_level', 'N/A')}")
                                
                                elif log_type == 'audit_complete':
                                    print(f"  状态: {data.get('status')}")
                                    print(f"  风险: {data.get('risk_level')}")
                                    
                                    if data.get('recommended'):
                                        rec = data['recommended']
                                        print(f"\n  ✓ 推荐合约:")
                                        print(f"    Token CA:  {rec.get('token_address')}")
                                        print(f"    Pair CA:   {rec.get('pair_address')}")
                                        print(f"    流动性:    ${rec.get('liquidity_usd', 0):,.2f}")
                                        print(f"    风险评分:  {rec.get('risk_score', 'N/A')}/10")
                                    
                                    print(f"\n✓ 审计完成! 共接收 {message_count} 条消息")
                                    break
                        
                        except asyncio.TimeoutError:
                            print("\n⚠ 等待响应超时")
                
                elif choice == '2':
                    # 发送心跳
                    print("\n📤 发送心跳...")
                    await websocket.send(json.dumps({"action": "ping"}))
                    
                    try:
                        pong = await asyncio.wait_for(websocket.recv(), timeout=5)
                        pong_data = json.loads(pong)
                        print(f"✓ 心跳响应: {pong_data.get('message', 'pong')}")
                    except asyncio.TimeoutError:
                        print("⚠ 心跳超时")
                
                elif choice == '3':
                    # 持续监听
                    print("\n📡 开始监听消息... (按 Ctrl+C 停止)\n")
                    try:
                        async for message in websocket:
                            data = json.loads(message)
                            log_type = data.get('log_type', 'unknown')
                            timestamp = data.get('timestamp', '')
                            print(f"[{timestamp}] {log_type}")
                            print(f"  {json.dumps(data, indent=2, ensure_ascii=False)}\n")
                    except KeyboardInterrupt:
                        print("\n停止监听")
                
                elif choice == '4':
                    print("\n退出连接...")
                    break
                
                else:
                    print("无效选项，请重新选择")
            
            print("\n正在关闭连接...")
    
    except ConnectionRefusedError:
        print("✗ 连接被拒绝")
        print("  可能原因:")
        print("  1. 服务器未启动")
        print("  2. IP 地址或端口错误")
        print("  3. 防火墙阻止了连接")
    
    except websockets.exceptions.InvalidURI:
        print("✗ 无效的 WebSocket 地址")
    
    except websockets.exceptions.WebSocketException as e:
        print(f"✗ WebSocket 错误: {e}")
    
    except asyncio.TimeoutError:
        print("✗ 连接超时")
        print("  服务器可能无响应或网络不稳定")
    
    except Exception as e:
        print(f"✗ 错误: {e}")
    
    finally:
        print("\n" + "=" * 70)
        print("连接已关闭")
        print("=" * 70)


async def quick_test():
    """快速测试连接"""
    uri = "ws://189.1.222.236:8765"
    
    print("\n快速连接测试...")
    print(f"服务器: {uri}\n")
    
    try:
        async with websockets.connect(uri, ping_timeout=10) as websocket:
            print("✓ 连接成功!")
            
            # 接收一条消息
            message = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(message)
            print(f"✓ 收到消息: {data.get('log_type', 'unknown')}")
            print(f"  {data.get('message', '')}")
            
            return True
    
    except Exception as e:
        print(f"✗ 连接失败: {e}")
        return False


if __name__ == "__main__":
    import sys
    
    print()
    print("远程 WebSocket 客户端")
    print()
    
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        # 快速测试模式
        asyncio.run(quick_test())
    else:
        # 完整交互模式
        try:
            asyncio.run(connect_remote_server())
        except KeyboardInterrupt:
            print("\n\n程序已中断")

