#!/usr/bin/env python3
"""
动态代理配置 - 支持按需切换国家
"""

import asyncio
import aiohttp
import subprocess
import json
from datetime import datetime

class DynamicProxyManager:
    def __init__(self):
        self.proxy_base_url = "http://127.0.0.1:24000"
        self.proxy_base_port = 24000
        
        # 推荐的国家配置 for Polymarket
        self.countries = {
            'us': {'name': 'United States', 'code': 'us', 'good_for_polymarket': True},
            'ca': {'name': 'Canada', 'code': 'ca', 'good_for_polymarket': True},
            'gb': {'name': 'United Kingdom', 'code': 'gb', 'good_for_polymarket': True},
            'de': {'name': 'Germany', 'code': 'de', 'good_for_polymarket': True},
            'sg': {'name': 'Singapore', 'code': 'sg', 'good_for_polymarket': False},
            'ru': {'name': 'Russia', 'code': 'ru', 'good_for_polymarket': False}
        }
    
    def test_country_header_method(self, country_code):
        """使用header方法测试特定国家"""
        print(f"\n=== 测试 {self.countries[country_code]['name']} (Header方法) ===")
        
        try:
            result = subprocess.run([
                'curl', '--connect-timeout', '8', '--max-time', '15',
                '--proxy', self.proxy_base_url,
                '-H', f'x-lpm-country: {country_code}',
                'http://lumtest.com/myip.json'
            ], capture_output=True, text=True, timeout=20)
            
            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    country = data.get('country', 'Unknown')
                    ip = data.get('ip', 'Unknown')
                    print(f"[SUCCESS] IP: {ip}")
                    print(f"[SUCCESS] 国家: {country}")
                    
                    expected_country = country_code.upper()
                    if country == expected_country:
                        print(f"[OK] 国家切换成功: {country}")
                        return True, ip, country
                    else:
                        print(f"[WARNING] 期望{expected_country}，实际{country}")
                        return False, ip, country
                        
                except json.JSONDecodeError:
                    print(f"[ERROR] 响应解析失败: {result.stdout}")
                    return False, None, None
            else:
                print(f"[ERROR] 请求失败: {result.stderr}")
                return False, None, None
                
        except Exception as e:
            print(f"[ERROR] 测试异常: {e}")
            return False, None, None
    
    def test_username_method(self, country_code):
        """使用用户名方法测试特定国家"""
        print(f"\n=== 测试 {self.countries[country_code]['name']} (用户名方法) ===")
        
        proxy_url = f"lum-country-{country_code}@127.0.0.1:24001"
        
        try:
            result = subprocess.run([
                'curl', '--connect-timeout', '8', '--max-time', '15',
                '-x', proxy_url,
                'http://lumtest.com/myip.json'
            ], capture_output=True, text=True, timeout=20)
            
            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    country = data.get('country', 'Unknown')
                    ip = data.get('ip', 'Unknown')
                    print(f"[SUCCESS] IP: {ip}")
                    print(f"[SUCCESS] 国家: {country}")
                    return True, ip, country
                        
                except json.JSONDecodeError:
                    print(f"[ERROR] 响应解析失败: {result.stdout}")
                    return False, None, None
            else:
                print(f"[ERROR] 请求失败: {result.stderr}")
                return False, None, None
                
        except Exception as e:
            print(f"[ERROR] 测试异常: {e}")
            return False, None, None
    
    def test_polymarket_with_country(self, country_code, method='header'):
        """测试特定国家访问Polymarket"""
        print(f"\n=== 测试{self.countries[country_code]['name']}访问Polymarket ===")
        
        if method == 'header':
            cmd = [
                'curl', '--connect-timeout', '10', '--max-time', '20',
                '--proxy', self.proxy_base_url,
                '-H', f'x-lpm-country: {country_code}',
                'https://clob.polymarket.com/markets?limit=1',
                '-I'
            ]
        else:  # username method
            proxy_url = f"lum-country-{country_code}@127.0.0.1:24001"
            cmd = [
                'curl', '--connect-timeout', '10', '--max-time', '20',
                '-x', proxy_url,
                'https://clob.polymarket.com/markets?limit=1',
                '-I'
            ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
            
            if result.returncode == 0:
                if '200 OK' in result.stdout:
                    print(f"[SUCCESS] {country_code.upper()} - Polymarket访问成功!")
                    return True
                elif '403' in result.stdout:
                    print(f"[BLOCKED] {country_code.upper()} - 被Polymarket拒绝 (403)")
                    return False
                elif '503' in result.stdout:
                    print(f"[ERROR] {country_code.upper()} - 服务不可用 (503)")
                    return False
                else:
                    print(f"[UNKNOWN] {country_code.upper()} - 未知状态")
                    return False
            else:
                print(f"[ERROR] {country_code.upper()} - 连接失败")
                return False
                
        except Exception as e:
            print(f"[ERROR] {country_code.upper()} - 测试异常: {e}")
            return False
    
    def find_best_country_for_polymarket(self):
        """找到访问Polymarket的最佳国家"""
        print("=" * 60)
        print("寻找Polymarket最佳代理国家")
        print("=" * 60)
        
        good_countries = []
        
        # 测试推荐的国家
        for country_code, info in self.countries.items():
            if info['good_for_polymarket']:
                print(f"\n测试 {info['name']} ({country_code.upper()})...")
                
                # 先测试基本连接
                success, ip, country = self.test_country_header_method(country_code)
                
                if success:
                    # 测试Polymarket访问
                    polymarket_ok = self.test_polymarket_with_country(country_code, 'header')
                    if polymarket_ok:
                        good_countries.append({
                            'country_code': country_code,
                            'name': info['name'],
                            'ip': ip,
                            'actual_country': country
                        })
        
        return good_countries
    
    def generate_optimized_config(self, best_countries):
        """生成优化的代理配置"""
        print("\n" + "=" * 60)
        print("优化的代理配置")
        print("=" * 60)
        
        if best_countries:
            print("✅ 可用的国家配置:")
            for i, country in enumerate(best_countries, 1):
                print(f"{i}. {country['name']} ({country['country_code'].upper()})")
                print(f"   IP: {country['ip']}")
                print(f"   Header方法: curl --proxy 127.0.0.1:24000 -H 'x-lpm-country: {country['country_code']}' [URL]")
                print(f"   用户名方法: curl -x lum-country-{country['country_code']}@127.0.0.1:24001 [URL]")
                print()
            
            # 推荐配置
            best = best_countries[0]
            print(f"🎯 推荐配置: {best['name']}")
            print(f"   国家代码: {best['country_code']}")
            print(f"   Python代码示例:")
            print(f"   headers = {{'x-lpm-country': '{best['country_code']}'}}")
            print(f"   proxy = 'http://127.0.0.1:24000'")
            
        else:
            print("❌ 未找到可用的国家配置")
            print("建议:")
            print("1. 检查Proxy Manager是否正确启动")
            print("2. 验证Bright Data账户状态")
            print("3. 尝试手动重启代理服务")

def main():
    print("动态代理国家切换测试")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    manager = DynamicProxyManager()
    
    # 寻找最佳国家配置
    best_countries = manager.find_best_country_for_polymarket()
    
    # 生成优化配置
    manager.generate_optimized_config(best_countries)

if __name__ == "__main__":
    main()