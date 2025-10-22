#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Twitter WebSocket监听器模块
连接到Twitter WebSocket服务，监听指定用户的推文更新
"""

import websocket
import json
import time
import threading
from typing import Callable, List, Dict, Optional
from datetime import datetime


class TwitterListener:
    """Twitter WebSocket监听器 - 支持自动重连"""
    
    def __init__(self, ws_url: str, on_tweet_callback: Optional[Callable] = None,
                 on_raw_message_callback: Optional[Callable] = None,
                 auto_reconnect: bool = True, max_reconnect_attempts: int = 10,
                 reconnect_delay: float = 5.0, ping_interval: float = 30.0, 
                 ping_timeout: float = 10.0):
        """
        初始化监听器
        
        Args:
            ws_url: WebSocket URL
            on_tweet_callback: 收到推文时的回调函数，接收推文数据字典作为参数
            on_raw_message_callback: 收到原始消息时的回调函数，接收原始消息字典作为参数
            auto_reconnect: 是否自动重连
            max_reconnect_attempts: 最大重连次数(0表示无限重连)
            reconnect_delay: 初始重连延迟(秒)，使用指数退避
            ping_interval: 心跳间隔(秒)，默认30秒
            ping_timeout: 心跳超时时间(秒)，默认10秒
        """
        self.ws_url = ws_url
        self.ws = None
        self.subscribed_users = set()
        self.running = False
        self.on_tweet_callback = on_tweet_callback
        self.on_raw_message_callback = on_raw_message_callback
        self.user_id_to_username = {}
        self.user_ids = set()
        self.connection_lost = False
        self.server_subscription_count = 0
        
        # 重连相关
        self.auto_reconnect = auto_reconnect
        self.max_reconnect_attempts = max_reconnect_attempts
        self.reconnect_delay = reconnect_delay
        self.reconnect_count = 0
        self.reconnecting = False
        self.ws_thread = None
        self.should_stop = False
        
        # 心跳相关
        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        
    def on_message(self, ws, message):
        """处理接收到的消息"""
        try:
            data = json.loads(message)
            
            # 记录原始消息
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # DEBUG: 打印完整的原始消息
            print("\n" + "="*70)
            print(f"[{timestamp}] [DEBUG] Raw WebSocket Message Received")
            print("="*70)
            print(json.dumps(data, indent=2, ensure_ascii=False))
            print("="*70 + "\n")
            
            # 调用原始消息回调函数
            if self.on_raw_message_callback:
                try:
                    self.on_raw_message_callback(data)
                except Exception as e:
                    print(f"[Listener] Error in raw message callback: {e}")
            
            # 根据消息类型处理
            msg_type = data.get('type', 'unknown')
            
            if msg_type == 'connected':
                # 连接确认
                self.server_subscription_count = data.get('subscriptions', 0)
                subscriptions_limit = data.get('subscriptionsLimit', 0)
                print(f"\n[{timestamp}] [Listener] Connected to WebSocket")
                print(f"[Listener] Server subscriptions: {self.server_subscription_count}/{subscriptions_limit}")
                if self.server_subscription_count > 0:
                    print(f"[Listener] Server has {self.server_subscription_count} existing subscriptions")
                
            elif msg_type == 'tweet':
                # 新推文 - 这是核心功能
                username = data.get('username', 'Unknown')
                text = data.get('text', '')
                tweet_id = data.get('id', '')
                
                print(f"\n[{timestamp}] [Tweet] New tweet from @{username}")
                print(f"[Tweet] ID: {tweet_id}")
                print(f"[Tweet] Text: {text[:100]}{'...' if len(text) > 100 else ''}")
                
                # 调用回调函数处理推文
                if self.on_tweet_callback:
                    try:
                        self.on_tweet_callback(data)
                    except Exception as e:
                        print(f"[Listener] Error in tweet callback: {e}")
            
            elif msg_type == 'user-update':
                # 用户更新消息（包含推文）
                status = data.get('data', {}).get('status')
                if status:
                    # 提取推文信息
                    tweet_id = status.get('id', '')
                    text = status.get('text', '')
                    user_data = data.get('data', {}).get('twitterUser', {})
                    username = user_data.get('screenName', 'Unknown')
                    
                    print(f"\n[{timestamp}] [Tweet] New tweet from @{username} (via user-update)")
                    print(f"[Tweet] ID: {tweet_id}")
                    print(f"[Tweet] Text: {text[:100]}{'...' if len(text) > 100 else ''}")
                    
                    # 转换为标准推文格式
                    tweet_data = {
                        'type': 'tweet',
                        'id': tweet_id,
                        'username': username,
                        'text': text,
                        'createdAt': status.get('createdAt', ''),
                        'favoriteCount': status.get('favoriteCount', 0),
                        'retweetCount': status.get('retweetCount', 0),
                        'entities': status.get('entities', {}),
                        'replyToStatus': None,  # 可以从inReplyToStatusIdStr获取
                        'quotedStatus': None,   # 可以从quotedStatusIdStr获取
                    }
                    
                    # 调用回调函数处理推文
                    if self.on_tweet_callback:
                        try:
                            self.on_tweet_callback(tweet_data)
                        except Exception as e:
                            print(f"[Listener] Error in tweet callback: {e}")
                else:
                    # user-update但没有status（可能只是用户信息变更）
                    changes = data.get('data', {}).get('changes', {})
                    print(f"[{timestamp}] [Listener] User update (no new tweet): {list(changes.keys())}")
                
            elif msg_type == 'subscribed':
                user_id = data.get('twitterUserId', '')
                message_text = data.get('message', '')
                
                self.user_ids.add(user_id)
                
                if 'Already subscribed' in message_text:
                    print(f"[{timestamp}] [Listener] Already subscribed to user ID: {user_id}")
                else:
                    print(f"[{timestamp}] [Listener] Successfully subscribed to user ID: {user_id}")
                
                # 更新用户名映射
                username_found = None
                for username, uid in self.user_id_to_username.items():
                    if uid is None or uid == user_id:
                        self.user_id_to_username[username] = user_id
                        username_found = username
                        print(f"[Listener] Username: @{username}")
                        break
                
                self.server_subscription_count = len(self.user_ids)
                
            elif msg_type == 'unsubscribed':
                user_id = data.get('twitterUserId', '')
                self.user_ids.discard(user_id)
                
                print(f"[{timestamp}] [Listener] Unsubscribed from user ID: {user_id}")
                
                # 查找用户名
                for username, uid in list(self.user_id_to_username.items()):
                    if uid == user_id:
                        print(f"[Listener] Username: @{username}")
                        del self.user_id_to_username[username]
                        self.subscribed_users.discard(username)
                        break
                
                self.server_subscription_count = len(self.user_ids)
                
            elif msg_type == 'error':
                error_msg = data.get('message', 'Unknown error')
                print(f"[{timestamp}] [Listener] Error: {error_msg}")
                
        except json.JSONDecodeError as e:
            print(f"[Listener] JSON parse error: {e}")
            print(f"[Listener] Raw message: {message}")
        except Exception as e:
            print(f"[Listener] Error processing message: {e}")
    
    def on_error(self, ws, error):
        """处理错误"""
        try:
            print(f"[Listener] WebSocket error: {error}")
            # 错误不一定导致断开，等待on_close处理
        except Exception as e:
            print(f"[Listener] Error in error handler: {e}")
    
    def on_close(self, ws, close_status_code, close_msg):
        """连接关闭"""
        print(f"\n[Listener] Connection closed")
        print(f"[Listener] Status code: {close_status_code}")
        print(f"[Listener] Message: {close_msg}")
        self.running = False
        self.connection_lost = True
        
        if self.subscribed_users:
            print(f"[Listener] Previously subscribed users: {', '.join(sorted(self.subscribed_users))}")
        
        # 尝试自动重连
        if self.auto_reconnect and not self.should_stop and not self.reconnecting:
            self.reconnect()
    
    def on_open(self, ws):
        """连接建立"""
        print(f"[Listener] WebSocket connection established")
        print(f"[Listener] URL: {self.ws_url}")
        self.running = True
        self.connection_lost = False
        self.reconnecting = False
        
        # 重置重连计数
        if self.reconnect_count > 0:
            print(f"[Listener] Reconnection successful after {self.reconnect_count} attempts")
            self.reconnect_count = 0
            
            # 重新订阅之前的用户
            if self.subscribed_users:
                print(f"[Listener] Re-subscribing to {len(self.subscribed_users)} users...")
                time.sleep(1)  # 等待连接稳定
                for username in list(self.subscribed_users):
                    self.subscribe(username)
                    time.sleep(0.5)
    
    def subscribe(self, username: str) -> bool:
        """
        订阅Twitter用户
        
        Args:
            username: Twitter用户名(不带@)
            
        Returns:
            是否成功发送订阅请求
        """
        if not self.ws or not self.running:
            print("[Listener] WebSocket not connected")
            return False
        
        message = {
            "type": "subscribe",
            "twitterUsername": username
        }
        
        try:
            self.ws.send(json.dumps(message))
            self.subscribed_users.add(username)
            self.user_id_to_username[username] = None
            print(f"[Listener] Subscribing to: @{username}")
            return True
        except Exception as e:
            print(f"[Listener] Subscribe failed: {e}")
            return False
    
    def unsubscribe(self, username: str) -> bool:
        """
        取消订阅Twitter用户
        
        Args:
            username: Twitter用户名(不带@)
            
        Returns:
            是否成功发送取消订阅请求
        """
        if not self.ws or not self.running:
            print("[Listener] WebSocket not connected")
            return False
        
        message = {
            "type": "unsubscribe",
            "twitterUsername": username
        }
        
        try:
            self.ws.send(json.dumps(message))
            self.subscribed_users.discard(username)
            print(f"[Listener] Unsubscribing from: @{username}")
            return True
        except Exception as e:
            print(f"[Listener] Unsubscribe failed: {e}")
            return False
    
    def start(self, initial_users: List[str] = None, daemon: bool = True):
        """
        启动监听器
        
        Args:
            initial_users: 初始订阅的用户列表
            daemon: 是否作为守护线程运行
        """
        print("\n" + "="*70)
        print("[Listener] Twitter WebSocket Listener Starting")
        print("="*70)
        
        # 创建WebSocket连接
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        # 在后台线程运行WebSocket，启用心跳机制
        self.ws_thread = threading.Thread(
            target=lambda: self.ws.run_forever(
                ping_interval=self.ping_interval,
                ping_timeout=self.ping_timeout
            )
        )
        self.ws_thread.daemon = daemon
        self.ws_thread.start()
        
        # 等待连接建立
        print("[Listener] Waiting for connection...")
        time.sleep(2)
        
        # 订阅初始用户
        if initial_users:
            for username in initial_users:
                self.subscribe(username)
                time.sleep(0.5)
        
        print("="*70)
        print("[Listener] Listener started successfully")
        if self.auto_reconnect:
            print(f"[Listener] Auto-reconnect enabled (max attempts: {self.max_reconnect_attempts if self.max_reconnect_attempts > 0 else 'unlimited'})")
        print(f"[Listener] Heartbeat enabled (ping interval: {self.ping_interval}s, timeout: {self.ping_timeout}s)")
        print("="*70 + "\n")
        
        return self.ws_thread
    
    def reconnect(self):
        """重连WebSocket"""
        self.reconnecting = True
        self.reconnect_count += 1
        
        # 检查是否超过最大重连次数
        if self.max_reconnect_attempts > 0 and self.reconnect_count > self.max_reconnect_attempts:
            print(f"[Listener] Max reconnection attempts ({self.max_reconnect_attempts}) reached")
            print(f"[Listener] Giving up reconnection")
            self.reconnecting = False
            return
        
        # 计算延迟时间（指数退避）
        delay = self.reconnect_delay * (2 ** (self.reconnect_count - 1))
        delay = min(delay, 300)  # 最大延迟5分钟
        
        print(f"\n[Listener] Attempting reconnection #{self.reconnect_count}...")
        print(f"[Listener] Waiting {delay:.1f} seconds before reconnecting...")
        
        time.sleep(delay)
        
        if self.should_stop:
            print(f"[Listener] Stop requested, cancelling reconnection")
            self.reconnecting = False
            return
        
        try:
            print(f"[Listener] Reconnecting to WebSocket...")
            
            # 创建新的WebSocket连接
            self.ws = websocket.WebSocketApp(
                self.ws_url,
                on_open=self.on_open,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close
            )
            
            # 在新线程中运行，启用心跳机制
            self.ws_thread = threading.Thread(
                target=lambda: self.ws.run_forever(
                    ping_interval=self.ping_interval,
                    ping_timeout=self.ping_timeout
                )
            )
            self.ws_thread.daemon = True
            self.ws_thread.start()
            
        except Exception as e:
            print(f"[Listener] Reconnection failed: {e}")
            self.reconnecting = False
            # 失败后会在on_close中再次触发重连
    
    def stop(self):
        """停止监听器"""
        print("\n[Listener] Stopping listener...")
        self.should_stop = True
        self.auto_reconnect = False  # 禁用自动重连
        self.running = False
        
        # 安全关闭WebSocket连接
        if self.ws:
            try:
                # 检查连接是否真正建立
                if hasattr(self.ws, 'sock') and self.ws.sock:
                    self.ws.close()
                    print("[Listener] WebSocket closed successfully")
                else:
                    print("[Listener] WebSocket not fully connected, skipping close")
            except Exception as e:
                print(f"[Listener] Error closing WebSocket: {e}")
    
    def is_running(self) -> bool:
        """检查监听器是否在运行"""
        return self.running
    
    def get_subscribed_users(self) -> List[str]:
        """获取已订阅的用户列表"""
        return list(self.subscribed_users)


def test_listener():
    """测试监听器"""
    def on_tweet(tweet_data):
        """测试回调函数"""
        print(f"\n[Test] Received tweet: {tweet_data.get('text', '')[:50]}...")
    
    # WebSocket URL
    ws_url = "wss://p01--foxhole-backend--jb924j8sn9fb.code.run/ws/ethHackathonsrezIXgjXNr7ukySN6qNY"
    
    # 创建监听器
    listener = TwitterListener(ws_url, on_tweet_callback=on_tweet)
    
    # 启动并订阅测试用户
    listener.start(initial_users=[], daemon=False)
    
    # 保持运行
    try:
        while listener.is_running():
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Test] Interrupted by user")
        listener.stop()


if __name__ == '__main__':
    test_listener()


