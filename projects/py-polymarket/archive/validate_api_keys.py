#!/usr/bin/env python3
"""
API密钥配置验证脚本

检查所有API密钥是否正确配置并可用
"""

import os
import asyncio
import aiohttp
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class APIKeyValidator:
    """API密钥验证器"""
    
    def __init__(self):
        self.results = {}
    
    async def validate_all_keys(self):
        """验证所有API密钥"""
        print("🔑 开始验证API密钥配置...")
        print("=" * 50)
        
        # 检查Twitter Bearer Token
        await self._validate_twitter_key()
        
        # 检查NewsAPI密钥
        await self._validate_newsapi_key()
        
        # 显示结果汇总
        self._print_summary()
        
        return all(self.results.values())
    
    async def _validate_twitter_key(self):
        """验证Twitter Bearer Token"""
        print("\n🐦 验证Twitter Bearer Token...")
        
        bearer_token = os.getenv('TWITTER_BEARER_TOKEN')
        
        if not bearer_token:
            print("❌ Twitter Bearer Token未配置")
            self.results['twitter'] = False
            return
        
        if not bearer_token.startswith('AAAAAAAAAAAAAAAAAAAAAA'):
            print("❌ Twitter Bearer Token格式不正确")
            self.results['twitter'] = False
            return
        
        # 测试API调用
        try:
            headers = {"Authorization": f"Bearer {bearer_token}"}
            
            # 使用Twitter API v2的用户查找端点进行测试
            test_url = "https://api.twitter.com/2/users/by/username/twitter"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(test_url, headers=headers) as response:
                    if response.status == 200:
                        print("✅ Twitter Bearer Token验证成功")
                        self.results['twitter'] = True
                    elif response.status == 401:
                        print("❌ Twitter Bearer Token无效或已过期")
                        self.results['twitter'] = False
                    elif response.status == 429:
                        print("⚠️  Twitter API限流，但Token有效")
                        self.results['twitter'] = True
                    else:
                        print(f"⚠️  Twitter API返回状态码: {response.status}")
                        print("   Token可能有效但存在其他问题")
                        self.results['twitter'] = True  # 假设有效
                        
        except Exception as e:
            print(f"❌ Twitter API测试失败: {e}")
            self.results['twitter'] = False
    
    async def _validate_newsapi_key(self):
        """验证NewsAPI密钥"""
        print("\n📰 验证NewsAPI密钥...")
        
        newsapi_key = os.getenv('NEWSAPI_KEY')
        
        if not newsapi_key:
            print("⚠️  NewsAPI密钥未配置")
            print("   请访问 https://newsapi.org 注册获取免费密钥")
            print("   然后在.env文件中设置 NEWSAPI_KEY=your_key_here")
            self.results['newsapi'] = False
            return
        
        # 测试API调用
        try:
            headers = {"X-API-Key": newsapi_key}
            test_url = "https://newsapi.org/v2/top-headlines?country=us&pageSize=1"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(test_url, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get('status') == 'ok':
                            print("✅ NewsAPI密钥验证成功")
                            print(f"   可用文章数: {result.get('totalResults', 0)}")
                            self.results['newsapi'] = True
                        else:
                            print("❌ NewsAPI返回错误")
                            self.results['newsapi'] = False
                    elif response.status == 401:
                        print("❌ NewsAPI密钥无效")
                        self.results['newsapi'] = False
                    elif response.status == 429:
                        print("⚠️  NewsAPI请求限额已用完，但密钥有效")
                        self.results['newsapi'] = True
                    else:
                        print(f"❌ NewsAPI返回状态码: {response.status}")
                        self.results['newsapi'] = False
                        
        except Exception as e:
            print(f"❌ NewsAPI测试失败: {e}")
            self.results['newsapi'] = False
    
    def _print_summary(self):
        """打印结果汇总"""
        print("\n" + "=" * 50)
        print("📊 API密钥验证结果汇总:")
        print("=" * 50)
        
        for service, is_valid in self.results.items():
            status = "✅ 有效" if is_valid else "❌ 无效"
            print(f"  {service:10}: {status}")
        
        valid_count = sum(self.results.values())
        total_count = len(self.results)
        
        print(f"\n📈 验证通过: {valid_count}/{total_count}")
        
        if valid_count == total_count:
            print("🎉 所有API密钥配置正确！可以启动完整系统")
        elif valid_count > 0:
            print("⚠️  部分API密钥有效，系统可以部分运行")
        else:
            print("❌ 所有API密钥无效，系统只能在离线模式运行")
        
        print("\n💡 配置建议:")
        
        if not self.results.get('newsapi', True):
            print("  - 获取NewsAPI密钥: https://newsapi.org")
            print("    (免费版本每月1000次请求)")
        
        if not self.results.get('twitter', True):
            print("  - 检查Twitter Bearer Token是否正确")
            print("    (确保以'AAAAAAAAAAAAAAAAAAAAAA'开头)")
        
        print("\n🚀 启动命令:")
        if valid_count > 0:
            print("  在线模式: python demo_enhanced_system.py")
            print("  完整系统: python src/polymarket/enhanced_main.py")
        else:
            print("  离线模式: OFFLINE_MODE=1 python demo_enhanced_system.py")


async def main():
    """主函数"""
    print("🔧 Polymarket API密钥配置验证工具")
    print("🔧 " + "=" * 48)
    
    validator = APIKeyValidator()
    
    try:
        success = await validator.validate_all_keys()
        
        if success:
            print("\n✅ 验证完成：系统已准备就绪！")
            return 0
        else:
            print("\n⚠️  验证完成：系统可部分运行")
            return 1
            
    except KeyboardInterrupt:
        print("\n👋 验证被用户中断")
        return 1
    except Exception as e:
        print(f"\n❌ 验证过程出现异常: {e}")
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except Exception as e:
        print(f"❌ 程序启动失败: {e}")
        sys.exit(1)