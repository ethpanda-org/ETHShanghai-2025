#!/usr/bin/env python3
"""
代理配置修复指南
"""

import asyncio
import aiohttp
import subprocess
import time
from datetime import datetime

class ProxyConfigFixer:
    def __init__(self):
        self.proxy_url = "http://127.0.0.1:24000"
        
    def test_proxy_speed(self):
        """测试代理速度"""
        print("=== 代理速度测试 ===")
        
        start_time = time.time()
        try:
            result = subprocess.run([
                'curl', '--connect-timeout', '5', '--max-time', '10',
                '--proxy', '127.0.0.1:24000', 
                'http://geo.brdtest.com/mygeo.json'
            ], capture_output=True, text=True, timeout=15)
            
            end_time = time.time()
            response_time = end_time - start_time
            
            if result.returncode == 0:
                print(f"[OK] 代理响应时间: {response_time:.2f}秒")
                
                # 解析IP信息
                import json
                try:
                    data = json.loads(result.stdout)
                    country = data.get('country', 'Unknown')
                    city = data.get('geo', {}).get('city', 'Unknown')
                    print(f"[INFO] 当前IP位置: {country}, {city}")
                    
                    # 检查是否适合Polymarket
                    if country in ['US', 'CA', 'GB', 'DE', 'FR']:
                        print(f"[GOOD] {country} IP适合访问Polymarket")
                        return True, response_time
                    else:
                        print(f"[WARNING] {country} IP可能被Polymarket限制")
                        return False, response_time
                        
                except json.JSONDecodeError:
                    print("[ERROR] 无法解析IP信息")
                    return False, response_time
            else:
                print(f"[ERROR] 代理测试失败: {result.stderr}")
                return False, 999
                
        except Exception as e:
            print(f"[ERROR] 代理测试异常: {e}")
            return False, 999
    
    def test_polymarket_access(self):
        """测试Polymarket访问"""
        print("\n=== Polymarket访问测试 ===")
        
        try:
            result = subprocess.run([
                'curl', '--connect-timeout', '8', '--max-time', '15',
                '--proxy', '127.0.0.1:24000',
                'https://clob.polymarket.com/markets?limit=1',
                '-I'  # 仅获取headers
            ], capture_output=True, text=True, timeout=20)
            
            if result.returncode == 0:
                if '200 OK' in result.stdout:
                    print("[SUCCESS] Polymarket API访问成功!")
                    return True
                elif '403' in result.stdout:
                    print("[ERROR] Polymarket拒绝访问 (403 Forbidden)")
                    print("[CAUSE] 可能是IP被屏蔽或地理限制")
                    return False
                elif '503' in result.stdout:
                    print("[ERROR] Polymarket服务不可用 (503)")
                    return False
                else:
                    print(f"[WARNING] 未知响应: {result.stdout[:200]}")
                    return False
            else:
                print(f"[ERROR] 连接失败: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"[ERROR] 测试异常: {e}")
            return False
    
    def generate_fix_recommendations(self, proxy_ok, polymarket_ok, response_time):
        """生成修复建议"""
        print("\n=== 修复建议 ===")
        
        if not proxy_ok:
            print("1. [CRITICAL] 代理连接问题:")
            print("   - 检查Proxy Manager是否运行")
            print("   - 重启Proxy Manager")
            print("   - 验证端口24000是否正确")
            
        elif response_time > 10:
            print("1. [WARNING] 代理速度过慢:")
            print("   - 在Proxy Manager中切换到更快的节点")
            print("   - 选择美国/欧洲节点")
            print("   - 检查网络连接质量")
            
        if not polymarket_ok:
            print("2. [CRITICAL] Polymarket访问被阻断:")
            print("   - 在Proxy Manager中切换到美国IP")
            print("   - 避免使用俄罗斯/亚洲节点")
            print("   - 尝试不同的代理provider")
            
        print("\n3. [RECOMMENDED] Proxy Manager优化设置:")
        print("   - Country: United States")
        print("   - State: California 或 New York")
        print("   - Session管理: 启用session persistence")
        print("   - Timeout: 30秒")
        
        print("\n4. [ALTERNATIVE] 如果问题持续:")
        print("   - 使用离线模式进行测试")
        print("   - 等待网络状况改善")
        print("   - 联系Bright Data技术支持")

def main():
    print("代理配置修复工具")
    print("=" * 50)
    print(f"检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    fixer = ProxyConfigFixer()
    
    # 步骤1: 测试代理速度和位置
    proxy_ok, response_time = fixer.test_proxy_speed()
    
    # 步骤2: 测试Polymarket访问
    polymarket_ok = fixer.test_polymarket_access()
    
    # 步骤3: 生成修复建议
    fixer.generate_fix_recommendations(proxy_ok, polymarket_ok, response_time)
    
    # 总结
    print("\n" + "=" * 50)
    if proxy_ok and polymarket_ok:
        print("[SUCCESS] 代理配置正常，可以启动在线测试")
    elif proxy_ok and not polymarket_ok:
        print("[PARTIAL] 代理工作但无法访问Polymarket")
        print("[ACTION] 需要切换到美国IP节点")
    else:
        print("[FAILED] 代理配置需要修复")
        print("[ACTION] 检查Proxy Manager设置")

if __name__ == "__main__":
    main()