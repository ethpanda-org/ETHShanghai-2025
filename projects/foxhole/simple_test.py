#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的 WebSocket 测试（带详细调试信息）
"""

import asyncio
import websockets
import json


async def simple_connect():
    uri = "ws://189.1.222.236:8765"
    
    print(f"连接到: {uri}")
    print("=" * 70)
    
    try:
        print("\n1. 正在建立连接... (超时60秒)")
        async with websockets.connect(
            uri,
            ping_timeout=60,
            close_timeout=10,
            open_timeout=30
        ) as websocket:
            print("✓ 连接成功!\n")
            
            print("2. 等待欢迎消息... (超时10秒)")
            try:
                welcome = await asyncio.wait_for(websocket.recv(), timeout=10)
                print(f"✓ 收到消息: {len(welcome)} 字节")
                
                data = json.loads(welcome)
                print(f"✓ JSON 解析成功")
                print(f"\n消息内容:")
                print(json.dumps(data, indent=2, ensure_ascii=False))
                
                print("\n" + "=" * 70)
                print("✓ 测试成功!")
                return True
                
            except asyncio.TimeoutError:
                print("✗ 等待消息超时")
                return False
            except json.JSONDecodeError as e:
                print(f"✗ JSON 解析失败: {e}")
                print(f"原始消息: {welcome}")
                return False
    
    except asyncio.TimeoutError:
        print("✗ 连接超时（30秒）")
        print("\n可能的原因:")
        print("1. 服务器响应慢")
        print("2. 网络延迟高")
        print("3. 服务器未正确配置")
        return False
    
    except ConnectionRefusedError:
        print("✗ 连接被拒绝")
        print("\n可能的原因:")
        print("1. 服务器未启动")
        print("2. 端口错误")
        print("3. 防火墙阻止")
        return False
    
    except OSError as e:
        print(f"✗ 网络错误: {e}")
        print("\n可能的原因:")
        print("1. 无法解析主机名")
        print("2. 网络不可达")
        print("3. 路由问题")
        return False
    
    except Exception as e:
        print(f"✗ 未知错误: {type(e).__name__}: {e}")
        import traceback
        print("\n详细错误:")
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("\nWebSocket 简单连接测试\n")
    success = asyncio.run(simple_connect())
    print("\n" + "=" * 70)
    print(f"结果: {'成功 ✓' if success else '失败 ✗'}")
    print("=" * 70 + "\n")

