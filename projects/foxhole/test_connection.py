#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebSocket 连接诊断工具
"""

import socket
import asyncio
import websockets
import json
from datetime import datetime


def test_network(host, port):
    """测试网络连通性"""
    print(f"\n1. 测试网络连通性...")
    print(f"   目标: {host}:{port}")
    
    try:
        # 创建 socket 连接
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"   ✓ 端口 {port} 开放")
            return True
        else:
            print(f"   ✗ 端口 {port} 关闭或不可达")
            return False
    except socket.gaierror:
        print(f"   ✗ 无法解析主机名: {host}")
        return False
    except socket.timeout:
        print(f"   ✗ 连接超时")
        return False
    except Exception as e:
        print(f"   ✗ 错误: {e}")
        return False


async def test_websocket(uri, timeout=10):
    """测试 WebSocket 连接"""
    print(f"\n2. 测试 WebSocket 连接...")
    print(f"   URI: {uri}")
    print(f"   超时: {timeout}秒")
    
    try:
        async with websockets.connect(uri, ping_timeout=timeout, close_timeout=5) as websocket:
            print(f"   ✓ WebSocket 连接成功")
            
            # 尝试接收消息
            print(f"\n3. 测试接收消息...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(message)
                print(f"   ✓ 收到消息:")
                print(f"     类型: {data.get('log_type', 'unknown')}")
                print(f"     内容: {data.get('message', '')[:50]}...")
                return True
            except asyncio.TimeoutError:
                print(f"   ⚠ 5秒内未收到消息")
                return True
            except Exception as e:
                print(f"   ✗ 接收消息失败: {e}")
                return False
    
    except asyncio.TimeoutError:
        print(f"   ✗ WebSocket 握手超时")
        return False
    except websockets.exceptions.InvalidURI:
        print(f"   ✗ 无效的 URI")
        return False
    except Exception as e:
        print(f"   ✗ 连接失败: {e}")
        return False


async def test_request(uri):
    """测试发送请求"""
    print(f"\n4. 测试发送请求...")
    
    try:
        async with websockets.connect(uri, ping_timeout=30) as websocket:
            # 接收欢迎消息
            await websocket.recv()
            
            # 发送心跳
            print(f"   发送心跳请求...")
            await websocket.send(json.dumps({"action": "ping"}))
            
            # 等待响应
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)
            
            if data.get('log_type') == 'pong':
                print(f"   ✓ 心跳响应正常")
                return True
            else:
                print(f"   ⚠ 收到意外响应: {data.get('log_type')}")
                return False
    
    except Exception as e:
        print(f"   ✗ 请求失败: {e}")
        return False


async def full_diagnostic(host, port):
    """完整诊断"""
    print("=" * 70)
    print("WebSocket 连接诊断工具")
    print("=" * 70)
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"目标: {host}:{port}")
    
    # 测试网络
    network_ok = test_network(host, port)
    
    if not network_ok:
        print("\n" + "=" * 70)
        print("诊断结果: 网络不通")
        print("=" * 70)
        print("\n建议:")
        print("1. 检查服务器是否启动")
        print("2. 检查 IP 地址和端口是否正确")
        print("3. 检查防火墙设置")
        print("4. 尝试 ping 服务器: ping", host)
        return
    
    # 测试 WebSocket
    uri = f"ws://{host}:{port}"
    ws_ok = await test_websocket(uri)
    
    if not ws_ok:
        print("\n" + "=" * 70)
        print("诊断结果: WebSocket 连接失败")
        print("=" * 70)
        print("\n建议:")
        print("1. 确认服务器支持 WebSocket 协议")
        print("2. 检查是否需要特殊的认证或路径")
        print("3. 尝试增加超时时间")
        return
    
    # 测试请求
    request_ok = await test_request(uri)
    
    print("\n" + "=" * 70)
    print("诊断结果汇总")
    print("=" * 70)
    print(f"网络连通性: {'✓ 通过' if network_ok else '✗ 失败'}")
    print(f"WebSocket 连接: {'✓ 通过' if ws_ok else '✗ 失败'}")
    print(f"请求响应: {'✓ 通过' if request_ok else '✗ 失败'}")
    
    if network_ok and ws_ok and request_ok:
        print("\n✓ 所有测试通过! 服务器工作正常")
        print("\n可以使用以下命令连接:")
        print(f"  python connect_remote_ws.py")
    else:
        print("\n⚠ 部分测试失败，请检查上述建议")


if __name__ == "__main__":
    import sys
    
    # 从 huawei.txt 读取地址
    try:
        with open('huawei.txt', 'r') as f:
            uri = f.read().strip()
            # 解析 URI
            if uri.startswith('ws://'):
                uri = uri[5:]  # 移除 ws://
            if ':' in uri:
                host, port = uri.split(':')
                port = int(port)
            else:
                host = uri
                port = 8765
    except:
        # 默认值
        host = "189.1.222.236"
        port = 8765
    
    print()
    asyncio.run(full_diagnostic(host, port))
    print()

