"""
代理服务升级建议

当前Bright Data配置可能不够：需要升级到更高级的服务

推荐的代理服务商和配置：
1. Bright Data - 升级到ISP代理或移动代理
2. Oxylabs - 住宅代理
3. Smartproxy - 高匿名代理
4. NetNut - ISP代理

操作步骤：
1. 联系Bright Data客服升级到ISP代理
2. 或注册其他代理服务商
3. 配置多个代理源轮换使用
"""

# 你需要做的：
print("=" * 60)
print("代理升级操作指南")
print("=" * 60)

print("\n[步骤1] 升级Bright Data服务")
print("访问: https://brightdata.com")
print("1. 登录你的账户")
print("2. 升级到 'ISP代理' 或 '移动代理'") 
print("3. 选择美国/欧洲地区")
print("4. 启用会话保持功能")

print("\n[步骤2] 或者注册备用代理")
print("推荐服务商:")
print("- Oxylabs: https://oxylabs.io")
print("- Smartproxy: https://smartproxy.com") 
print("- NetNut: https://netnut.io")

print("\n[步骤3] 获取新的代理凭据")
print("格式: http://username:password@proxy-server:port")
print("确保选择:")
print("- 住宅IP或ISP代理")
print("- 美国/欧洲地区")
print("- 会话保持功能")

print(f"\n[步骤4] 更新配置文件")
print("将新凭据替换到 proxy_config.py 中")