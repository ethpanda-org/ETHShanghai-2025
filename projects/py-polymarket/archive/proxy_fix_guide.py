#!/usr/bin/env python3
"""
Proxy Manager修复步骤指南
"""

def print_fix_steps():
    print("=" * 60)
    print("Proxy Manager 修复步骤")
    print("=" * 60)
    
    print("\n🔧 立即修复步骤:")
    print("1. 重启Proxy Manager:")
    print("   - 关闭Bright Data Proxy Manager")
    print("   - 等待10秒")
    print("   - 重新启动Proxy Manager")
    
    print("\n2. 检查配置:")
    print("   - 端口: 24000")
    print("   - 协议: HTTP")
    print("   - 状态: Active/Running")
    
    print("\n3. 优化设置:")
    print("   - Country: United States 🇺🇸")
    print("   - State: California 或 New York")
    print("   - Session timeout: 30分钟")
    print("   - Keep alive: 启用")
    
    print("\n4. 验证连接:")
    print("   验证命令:")
    print("   curl --proxy 127.0.0.1:24000 \"http://geo.brdtest.com/mygeo.json\"")
    
    print("\n5. 测试Polymarket:")
    print("   测试命令:")
    print("   curl --proxy 127.0.0.1:24000 \"https://clob.polymarket.com/markets?limit=1\" -I")
    
    print("\n📋 配置检查清单:")
    print("□ Proxy Manager进程运行中")
    print("□ 端口24000监听")
    print("□ 选择美国IP地址")
    print("□ 基本连接测试通过")
    print("□ Polymarket API可访问")
    
    print("\n⚠️  如果问题持续:")
    print("1. 检查Bright Data账户余额")
    print("2. 验证代理配置权限")
    print("3. 尝试不同的代理端口")
    print("4. 联系Bright Data技术支持")
    
    print("\n🚀 修复完成后:")
    print("1. 重新验证代理连接")
    print("2. 启动在线交易测试")
    print("3. 监控连接稳定性")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    print_fix_steps()