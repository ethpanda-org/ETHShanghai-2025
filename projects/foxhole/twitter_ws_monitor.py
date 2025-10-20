#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Twitter WebSocket 监听器
连接到 WebSocket 服务，监听指定 Twitter 用户的推文更新
"""

import websocket
import json
import time
import threading
from datetime import datetime


class TwitterWSMonitor:
    """Twitter WebSocket 监听器"""
    
    def __init__(self, ws_url: str):
        """
        初始化监听器
        
        Args:
            ws_url: WebSocket URL
        """
        self.ws_url = ws_url
        self.ws = None
        self.subscribed_users = set()  # 客户端记录的订阅用户（用户名）
        self.running = False
        self.user_id_to_username = {}  # 映射 user_id -> username
        self.connection_lost = False
        self.server_subscription_count = 0  # 服务器端的订阅数量
        self.user_ids = set()  # 记录所有订阅的用户ID
        
    def on_message(self, ws, message):
        """处理接收到的消息"""
        try:
            data = json.loads(message)
            
            # 格式化输出
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            print(f"\n[{timestamp}] 收到消息:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # 根据消息类型处理
            msg_type = data.get('type', 'unknown')
            
            if msg_type == 'connected':
                # 连接确认，记录服务器端的订阅数
                self.server_subscription_count = data.get('subscriptions', 0)
                subscriptions_limit = data.get('subscriptionsLimit', 0)
                print(f"\n🔗 连接信息:")
                print(f"   服务器端订阅数: {self.server_subscription_count}/{subscriptions_limit}")
                if self.server_subscription_count > 0:
                    print(f"   ⚠️ 服务器端已有 {self.server_subscription_count} 个订阅")
                    print(f"   💡 使用 'list' 命令查看详情（订阅/取消订阅后会同步）")
                
            elif msg_type == 'tweet':
                # 新推文
                username = data.get('username', 'Unknown')
                text = data.get('text', '')
                tweet_id = data.get('id', '')
                print(f"\n🐦 新推文 from @{username}:")
                print(f"   ID: {tweet_id}")
                print(f"   内容: {text[:100]}...")
                
            elif msg_type == 'subscribed':
                user_id = data.get('twitterUserId', '')
                message_text = data.get('message', '')
                
                # 添加到用户ID集合
                self.user_ids.add(user_id)
                
                if 'Already subscribed' in message_text:
                    print(f"⚠️ 已经订阅过用户 (ID: {user_id})")
                    print(f"   提示: {message_text}")
                    print(f"   建议: 先取消订阅再重新订阅，或者忽略此消息")
                else:
                    print(f"✅ 订阅成功 (用户ID: {user_id})")
                
                # 查找并更新用户名映射
                username_found = None
                for username, uid in self.user_id_to_username.items():
                    if uid is None or uid == user_id:
                        # 找到待映射的用户名，更新映射
                        self.user_id_to_username[username] = user_id
                        username_found = username
                        print(f"   用户名: @{username}")
                        break
                
                # 更新服务器订阅数
                self.server_subscription_count = len(self.user_ids)
                
            elif msg_type == 'unsubscribed':
                user_id = data.get('twitterUserId', '')
                
                # 从用户ID集合中移除
                self.user_ids.discard(user_id)
                
                print(f"❌ 已取消订阅 (用户ID: {user_id})")
                
                # 如果有映射关系，显示用户名
                for username, uid in list(self.user_id_to_username.items()):
                    if uid == user_id:
                        print(f"   用户名: @{username}")
                        # 从映射中移除
                        del self.user_id_to_username[username]
                        self.subscribed_users.discard(username)
                        break
                
                # 更新服务器订阅数
                self.server_subscription_count = len(self.user_ids)
                
            elif msg_type == 'error':
                error_msg = data.get('message', 'Unknown error')
                print(f"⚠️ 错误: {error_msg}")
                
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON 解析错误: {e}")
            print(f"原始消息: {message}")
        except Exception as e:
            print(f"⚠️ 处理消息时出错: {e}")
    
    def on_error(self, ws, error):
        """处理错误"""
        print(f"❌ WebSocket 错误: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        """连接关闭"""
        print(f"\n⚠️ 连接已关闭")
        print(f"   状态码: {close_status_code}")
        print(f"   消息: {close_msg}")
        self.running = False
        self.connection_lost = True
        
        # 提供重连建议
        if self.subscribed_users:
            print(f"\n💡 提示: 重新运行程序可恢复连接")
            print(f"   之前订阅的用户: {', '.join(sorted(self.subscribed_users))}")
    
    def on_open(self, ws):
        """连接建立"""
        print(f"✅ WebSocket 连接已建立")
        print(f"   URL: {self.ws_url}")
        self.running = True
    
    def subscribe(self, username: str):
        """
        订阅 Twitter 用户
        
        Args:
            username: Twitter 用户名（不带 @）
        """
        if not self.ws or not self.running:
            print("⚠️ WebSocket 未连接")
            return False
        
        message = {
            "type": "subscribe",
            "twitterUsername": username
        }
        
        try:
            self.ws.send(json.dumps(message))
            self.subscribed_users.add(username)
            # 记录用户名，等待服务器返回ID后更新映射
            self.user_id_to_username[username] = None
            print(f"📡 正在订阅: @{username}")
            return True
        except Exception as e:
            print(f"❌ 订阅失败: {e}")
            return False
    
    def unsubscribe(self, username: str):
        """
        取消订阅 Twitter 用户
        
        Args:
            username: Twitter 用户名（不带 @）
        """
        if not self.ws or not self.running:
            print("⚠️ WebSocket 未连接")
            return False
        
        message = {
            "type": "unsubscribe",
            "twitterUsername": username
        }
        
        try:
            self.ws.send(json.dumps(message))
            self.subscribed_users.discard(username)
            print(f"📡 正在取消订阅: @{username}")
            return True
        except Exception as e:
            print(f"❌ 取消订阅失败: {e}")
            return False
    
    def start(self, initial_users: list = None):
        """
        启动监听器
        
        Args:
            initial_users: 初始订阅的用户列表
        """
        print("\n" + "="*70)
        print("🚀 Twitter WebSocket 监听器")
        print("="*70)
        
        # 创建 WebSocket 连接
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        # 在后台线程运行 WebSocket
        wst = threading.Thread(target=self.ws.run_forever)
        wst.daemon = True
        wst.start()
        
        # 等待连接建立
        print("⏳ 等待连接建立...")
        time.sleep(2)
        
        # 订阅初始用户
        if initial_users:
            for username in initial_users:
                self.subscribe(username)
                time.sleep(0.5)
        
        print("\n💡 命令:")
        print("   subscribe <username>   - 订阅用户")
        print("   unsubscribe <username> - 取消订阅")
        print("   list                   - 列出已订阅用户")
        print("   quit                   - 退出")
        print("="*70 + "\n")
        
        # 命令行交互
        self.command_loop()
    
    def command_loop(self):
        """命令行交互循环"""
        while self.running:
            try:
                cmd = input("> ").strip().lower()
                
                if not cmd:
                    continue
                
                parts = cmd.split(maxsplit=1)
                command = parts[0]
                
                if command == "quit" or command == "exit":
                    print("👋 正在退出...")
                    self.ws.close()
                    break
                
                elif command == "subscribe" or command == "sub":
                    if len(parts) < 2:
                        print("⚠️ 用法: subscribe <username>")
                        continue
                    username = parts[1].strip().lstrip('@')
                    self.subscribe(username)
                
                elif command == "unsubscribe" or command == "unsub":
                    if len(parts) < 2:
                        print("⚠️ 用法: unsubscribe <username>")
                        continue
                    username = parts[1].strip().lstrip('@')
                    self.unsubscribe(username)
                
                elif command == "list" or command == "ls":
                    print(f"\n📊 订阅状态:")
                    print(f"   服务器端订阅数: {self.server_subscription_count}")
                    print(f"   客户端记录数: {len(self.user_ids)}")
                    
                    if self.user_ids:
                        print(f"\n📋 已知订阅 ({len(self.user_ids)} 个):")
                        # 创建反向映射 user_id -> username
                        id_to_username = {v: k for k, v in self.user_id_to_username.items() if v}
                        
                        for user_id in sorted(self.user_ids):
                            username = id_to_username.get(user_id, '未知')
                            if username != '未知':
                                print(f"   - @{username} (ID: {user_id})")
                            else:
                                print(f"   - ID: {user_id} (用户名未知)")
                    
                    if self.subscribed_users:
                        print(f"\n🔄 本次会话订阅:")
                        for user in sorted(self.subscribed_users):
                            user_id = self.user_id_to_username.get(user, None)
                            if user_id:
                                print(f"   - @{user} (ID: {user_id})")
                            else:
                                print(f"   - @{user} (等待服务器确认...)")
                    
                    if not self.user_ids and not self.subscribed_users:
                        print("\n📭 暂无订阅")
                        if self.server_subscription_count > 0:
                            print(f"\n💡 提示: 服务器显示有 {self.server_subscription_count} 个订阅")
                            print(f"   但客户端尚未获取详情，请尝试订阅或取消订阅操作以同步")
                    
                    print()
                
                elif command == "sync":
                    print("\n🔄 同步订阅状态:")
                    print(f"   服务器端订阅数: {self.server_subscription_count}")
                    print(f"   客户端记录数: {len(self.user_ids)}")
                    
                    if self.server_subscription_count > len(self.user_ids):
                        print(f"\n⚠️ 检测到 {self.server_subscription_count - len(self.user_ids)} 个未知订阅")
                        print(f"   建议: 由于服务器未提供查询API，请尝试以下方法:")
                        print(f"   1. 订阅一个新用户（会触发状态更新）")
                        print(f"   2. 取消可能的订阅（如 elonmusk, VitalikButerin 等）")
                        print(f"   3. 重启程序并明确订阅所需用户")
                    else:
                        print(f"\n✅ 订阅状态已同步")
                    print()
                
                elif command == "help" or command == "h":
                    print("\n💡 可用命令:")
                    print("   subscribe <username>   - 订阅用户")
                    print("   unsubscribe <username> - 取消订阅")
                    print("   list                   - 列出已订阅用户")
                    print("   sync                   - 检查同步状态")
                    print("   help                   - 显示帮助")
                    print("   quit                   - 退出")
                    print()
                
                else:
                    print(f"⚠️ 未知命令: {command}")
                    print("   输入 'help' 查看可用命令")
                
            except KeyboardInterrupt:
                print("\n\n👋 收到中断信号，正在退出...")
                self.ws.close()
                break
            except EOFError:
                print("\n👋 输入结束，正在退出...")
                self.ws.close()
                break


def main():
    """主函数"""
    import sys
    
    # WebSocket URL
    ws_url = "wss://p01--foxhole-backend--jb924j8sn9fb.code.run/ws/ethHackathonsrezIXgjXNr7ukySN6qNY"
    
    # 初始订阅用户（可以从命令行参数获取）
    initial_users = []
    if len(sys.argv) > 1:
        initial_users = [user.strip().lstrip('@') for user in sys.argv[1:]]
    
    # 创建监听器
    monitor = TwitterWSMonitor(ws_url)
    
    # 启动
    try:
        monitor.start(initial_users=initial_users)
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

