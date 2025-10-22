#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebSocket 服务器
实时推送审计数据到客户端，并监听 ws.json 文件变化
"""

import asyncio
import websockets
import json
import os
from datetime import datetime
from typing import Set
import sys
import threading
import time

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from audit.realtime_auditor import RealtimeAuditor


class AuditWebSocketServer:
    """审计数据 WebSocket 服务器"""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8765, watch_file: str = "data/ws.json"):
        """
        初始化 WebSocket 服务器
        
        Args:
            host: 监听地址
            port: 监听端口
            watch_file: 要监听的 JSON 日志文件
        """
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.auditor = None
        self.loop = None
        self.watch_file = watch_file
        self.file_position = 0
        self.watch_thread = None
        self.watching = False
        
    async def register(self, websocket):
        """注册新客户端"""
        self.clients.add(websocket)
        client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        print(f"[WebSocket] 客户端已连接: {client_info}")
        print(f"[WebSocket] 当前连接数: {len(self.clients)}")
        
        # 发送欢迎消息
        welcome_msg = {
            "log_type": "server_info",
            "timestamp": datetime.now().isoformat(),
            "message": "欢迎连接到审计数据 WebSocket 服务",
            "server_version": "1.0.0",
            "connected_clients": len(self.clients)
        }
        await websocket.send(json.dumps(welcome_msg, ensure_ascii=False))
    
    async def unregister(self, websocket):
        """注销客户端"""
        self.clients.remove(websocket)
        client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        print(f"[WebSocket] 客户端已断开: {client_info}")
        print(f"[WebSocket] 当前连接数: {len(self.clients)}")
    
    async def broadcast(self, message: dict):
        """
        广播消息到所有客户端
        
        Args:
            message: 要广播的消息字典
        """
        if self.clients:
            message_str = json.dumps(message, ensure_ascii=False)
            # 并发发送给所有客户端
            await asyncio.gather(
                *[client.send(message_str) for client in self.clients],
                return_exceptions=True
            )
            print(f"[WebSocket] 已广播消息到 {len(self.clients)} 个客户端: {message.get('log_type', 'unknown')}")
    
    async def handle_client(self, websocket):
        """
        处理客户端连接
        
        Args:
            websocket: WebSocket 连接
        """
        await self.register(websocket)
        try:
            async for message in websocket:
                # 处理客户端发送的消息
                try:
                    data = json.loads(message)
                    await self.handle_message(websocket, data)
                except json.JSONDecodeError:
                    error_msg = {
                        "log_type": "error",
                        "timestamp": datetime.now().isoformat(),
                        "message": "无效的 JSON 格式"
                    }
                    await websocket.send(json.dumps(error_msg, ensure_ascii=False))
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)
    
    async def handle_message(self, websocket, data: dict):
        """
        处理客户端消息
        
        Args:
            websocket: WebSocket 连接
            data: 消息数据
        """
        action = data.get("action", "")
        
        if action == "audit_token":
            # 审计代币请求
            token_symbol = data.get("token_symbol", "")
            if token_symbol:
                await self.audit_token_async(token_symbol)
            else:
                error_msg = {
                    "log_type": "error",
                    "timestamp": datetime.now().isoformat(),
                    "message": "缺少 token_symbol 参数"
                }
                await websocket.send(json.dumps(error_msg, ensure_ascii=False))
        
        elif action == "ping":
            # 心跳检测
            pong_msg = {
                "log_type": "pong",
                "timestamp": datetime.now().isoformat(),
                "message": "pong"
            }
            await websocket.send(json.dumps(pong_msg, ensure_ascii=False))
        
        else:
            # 未知操作
            error_msg = {
                "log_type": "error",
                "timestamp": datetime.now().isoformat(),
                "message": f"未知操作: {action}"
            }
            await websocket.send(json.dumps(error_msg, ensure_ascii=False))
    
    async def audit_token_async(self, token_symbol: str):
        """
        异步审计代币（在后台线程中运行同步代码）
        
        Args:
            token_symbol: 代币符号
        """
        # 通知客户端开始审计
        start_msg = {
            "log_type": "audit_start",
            "timestamp": datetime.now().isoformat(),
            "token_symbol": token_symbol,
            "message": f"开始审计代币: ${token_symbol}"
        }
        await self.broadcast(start_msg)
        
        # 在后台线程中运行审计
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.audit_token_sync, token_symbol)
    
    def audit_token_sync(self, token_symbol: str):
        """
        同步审计代币
        
        Args:
            token_symbol: 代币符号
        """
        if self.auditor is None:
            # 使用自定义的日志广播器（禁用文件日志）
            self.auditor = WebSocketAuditor(
                broadcast_callback=self.broadcast_sync,
                use_ai=False,  # 暂时禁用 AI 以便快速测试
                enable_json_log=False  # 禁用文件日志
            )
        
        # 执行审计
        try:
            result = self.auditor.audit_token(token_symbol)
        except Exception as e:
            print(f"[Auditor] 审计错误: {e}")
            import traceback
            traceback.print_exc()
            result = {
                "status": "error",
                "message": str(e),
                "risk_level": "unknown"
            }
        
        # 广播完成消息
        complete_msg = {
            "log_type": "audit_complete",
            "timestamp": datetime.now().isoformat(),
            "token": token_symbol,
            "status": result.get("status", "unknown"),
            "risk_level": result.get("risk_level", "unknown"),
            "message": f"审计完成: ${token_symbol}"
        }
        self.broadcast_sync(complete_msg)
    
    def broadcast_sync(self, message: dict):
        """
        同步广播（从同步代码中调用）
        
        Args:
            message: 要广播的消息
        """
        # 在事件循环中调度异步广播
        try:
            if self.loop and self.loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    self.broadcast(message),
                    self.loop
                )
        except Exception as e:
            print(f"[WebSocket] 广播失败: {e}")
    
    def watch_file_worker(self):
        """监听 ws.json 文件的工作线程"""
        print(f"[FileWatcher] 开始监听文件: {self.watch_file}")
        
        # 如果文件存在，先定位到文件末尾
        if os.path.exists(self.watch_file):
            with open(self.watch_file, 'r', encoding='utf-8') as f:
                f.seek(0, 2)  # 移动到文件末尾
                self.file_position = f.tell()
            print(f"[FileWatcher] 文件当前位置: {self.file_position}")
        
        while self.watching:
            try:
                if os.path.exists(self.watch_file):
                    with open(self.watch_file, 'r', encoding='utf-8') as f:
                        # 移动到上次读取的位置
                        f.seek(self.file_position)
                        
                        # 读取新增的行
                        for line in f:
                            line = line.strip()
                            if line:
                                try:
                                    # 解析 JSON 并广播
                                    data = json.loads(line)
                                    log_type = data.get("log_type")
                                    # 仅转发以下事件
                                    if log_type in {"raw_twitter_message", "token_info", "ai_analysis"}:
                                        self.broadcast_sync(data)
                                    else:
                                        # 非白名单事件不转发
                                        pass
                                except json.JSONDecodeError as e:
                                    print(f"[FileWatcher] JSON 解析错误: {e}")
                        
                        # 更新文件位置
                        self.file_position = f.tell()
                
                # 短暂休眠，避免过度占用 CPU
                time.sleep(0.1)
                
            except Exception as e:
                print(f"[FileWatcher] 错误: {e}")
                time.sleep(1)
        
        print("[FileWatcher] 文件监听已停止")
    
    async def start(self):
        """启动 WebSocket 服务器"""
        # 保存事件循环引用
        self.loop = asyncio.get_event_loop()
        
        print("=" * 70)
        print("审计数据 WebSocket 服务器")
        print("=" * 70)
        print(f"监听地址: {self.host}:{self.port}")
        print(f"WebSocket URL: ws://{self.host if self.host != '0.0.0.0' else 'localhost'}:{self.port}")
        print(f"监听文件: {self.watch_file}")
        print("=" * 70)
        print("\n等待客户端连接...\n")
        
        # 启动文件监听线程
        self.watching = True
        self.watch_thread = threading.Thread(target=self.watch_file_worker)
        self.watch_thread.daemon = True
        self.watch_thread.start()
        
        # websockets 15 期望 handler 只接收一个参数 (websocket)
        async with websockets.serve(self.handle_client, self.host, self.port):
            await asyncio.Future()  # 运行直到中断
    
    def stop(self):
        """停止服务器"""
        print("\n[Server] 正在停止服务器...")
        self.watching = False
        if self.watch_thread:
            self.watch_thread.join(timeout=2)
        print("[Server] 服务器已停止")


class WebSocketAuditor(RealtimeAuditor):
    """带 WebSocket 广播功能的审计器"""
    
    def __init__(self, broadcast_callback=None, **kwargs):
        """
        初始化审计器
        
        Args:
            broadcast_callback: 广播回调函数
            **kwargs: 其他参数传递给父类
        """
        super().__init__(**kwargs)
        self.broadcast_callback = broadcast_callback
    
    def _log_json(self, log_type: str, data: dict):
        """
        重写日志方法，同时广播到 WebSocket
        
        Args:
            log_type: 日志类型
            data: 日志数据
        """
        # 调用父类方法保存到文件
        super()._log_json(log_type, data)
        
        # 广播到 WebSocket 客户端
        if self.broadcast_callback:
            log_entry = {
                "log_type": log_type,
                "timestamp": datetime.now().isoformat(),
                **data
            }
            self.broadcast_callback(log_entry)


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="审计数据 WebSocket 服务器")
    parser.add_argument("--host", default="0.0.0.0", help="监听地址 (默认: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8765, help="监听端口 (默认: 8765)")
    parser.add_argument("--watch-file", default="data/ws.json", help="监听的日志文件 (默认: data/ws.json)")
    
    args = parser.parse_args()
    
    server = AuditWebSocketServer(host=args.host, port=args.port, watch_file=args.watch_file)
    
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\n\n[Server] 服务器已停止")
        server.stop()


if __name__ == "__main__":
    main()

