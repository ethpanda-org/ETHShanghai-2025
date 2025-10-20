#!/usr/bin/env python3
"""
Polymarket 监控控制面板
快速选择和管理监控方式
"""

import os
import sys
import subprocess
import time

class MonitorControlPanel:
    def __init__(self):
        self.monitors = {
            '1': {
                'name': '高级控制台监控',
                'file': 'advanced_monitor.py',
                'desc': '全功能交互式监控，支持快捷键操作'
            },
            '2': {
                'name': 'Web界面监控',
                'file': 'web_monitor.py', 
                'desc': '浏览器界面，美观易用，自动刷新'
            },
            '3': {
                'name': '简化文本监控',
                'file': 'simple_monitor.py',
                'desc': '基础文本显示，稳定可靠'
            },
            '4': {
                'name': '状态快照',
                'file': 'show_status.py',
                'desc': '单次查看当前状态'
            }
        }
        
    def display_banner(self):
        """显示横幅"""
        print("=" * 60)
        print("           POLYMARKET 监控控制面板")
        print("=" * 60)
        print("选择您偏好的监控方式:")
        print()
        
    def display_options(self):
        """显示选项"""
        for key, monitor in self.monitors.items():
            print(f"[{key}] {monitor['name']}")
            print(f"    {monitor['desc']}")
            print()
        
        print("[Q] 退出控制面板")
        print("[H] 查看监控对比")
        print("=" * 60)
        
    def display_comparison(self):
        """显示监控方式对比"""
        print("\n" + "=" * 80)
        print("                       监控方式对比")
        print("=" * 80)
        print("┌─────────────────┬──────────┬──────────┬──────────┬──────────┐")
        print("│ 监控方式        │ 交互性   │ 美观度   │ 功能性   │ 资源占用 │")
        print("├─────────────────┼──────────┼──────────┼──────────┼──────────┤")
        print("│ 高级控制台      │ ★★★★★ │ ★★★★☆ │ ★★★★★ │ ★★★☆☆ │")
        print("│ Web界面监控     │ ★★★☆☆ │ ★★★★★ │ ★★★★☆ │ ★★☆☆☆ │")
        print("│ 简化文本监控    │ ★☆☆☆☆ │ ★★☆☆☆ │ ★★☆☆☆ │ ★★★★★ │")
        print("│ 状态快照        │ ★☆☆☆☆ │ ★★☆☆☆ │ ★☆☆☆☆ │ ★★★★★ │")
        print("└─────────────────┴──────────┴──────────┴──────────┴──────────┘")
        print()
        print("推荐选择:")
        print("• 日常监控: Web界面监控 (选项2)")
        print("• 专业操作: 高级控制台监控 (选项1)")
        print("• 简单查看: 状态快照 (选项4)")
        print("• 系统资源有限: 简化文本监控 (选项3)")
        print("=" * 80)
        input("\n按回车键返回主菜单...")
        
    def launch_monitor(self, choice):
        """启动选择的监控"""
        if choice not in self.monitors:
            print("无效选择")
            return False
            
        monitor = self.monitors[choice]
        print(f"\n正在启动: {monitor['name']}")
        print(f"描述: {monitor['desc']}")
        print("-" * 50)
        
        try:
            # 检查文件是否存在
            if not os.path.exists(monitor['file']):
                print(f"错误: 找不到文件 {monitor['file']}")
                return False
                
            # 启动监控
            if choice == '4':  # 状态快照，运行一次即可
                subprocess.run([sys.executable, monitor['file']], check=True)
            else:
                print(f"启动命令: py -3 {monitor['file']}")
                print("注意: 使用 Ctrl+C 停止监控")
                print("=" * 50)
                subprocess.run([sys.executable, monitor['file']])
                
        except subprocess.CalledProcessError as e:
            print(f"启动失败: {e}")
            return False
        except KeyboardInterrupt:
            print(f"\n{monitor['name']} 已停止")
        except FileNotFoundError:
            print("错误: 找不到Python解释器")
            print("请确保Python已正确安装")
            return False
            
        return True
        
    def check_trading_system(self):
        """检查交易系统状态"""
        import glob
        
        print("\n检查交易系统状态...")
        
        # 检查报告文件
        report_files = glob.glob("*simulation_report_*.json")
        if report_files:
            latest_file = max(report_files, key=os.path.getmtime)
            mod_time = os.path.getmtime(latest_file)
            age_minutes = (time.time() - mod_time) / 60
            
            print(f"✅ 找到交易报告: {latest_file}")
            print(f"📅 最后更新: {age_minutes:.1f} 分钟前")
            
            if age_minutes < 2:
                print("🟢 交易系统正常运行")
            elif age_minutes < 10:
                print("🟡 交易系统可能在运行")
            else:
                print("🔴 交易系统可能已停止")
        else:
            print("❌ 未找到交易报告文件")
            print("💡 请先启动模拟交易系统")
            
        input("\n按回车键继续...")
        
    def run(self):
        """主运行循环"""
        while True:
            # 清屏
            os.system('cls' if os.name == 'nt' else 'clear')
            
            # 显示界面
            self.display_banner()
            self.display_options()
            
            # 获取用户输入
            try:
                choice = input("请选择 (1-4, Q, H): ").strip().upper()
                
                if choice == 'Q':
                    print("退出控制面板")
                    break
                elif choice == 'H':
                    self.display_comparison()
                    continue
                elif choice == 'S':
                    self.check_trading_system()
                    continue
                elif choice in self.monitors:
                    success = self.launch_monitor(choice)
                    if not success:
                        input("\n按回车键继续...")
                else:
                    print("无效选择，请重试")
                    time.sleep(1)
                    
            except KeyboardInterrupt:
                print("\n\n退出控制面板")
                break
            except Exception as e:
                print(f"发生错误: {e}")
                input("按回车键继续...")

if __name__ == "__main__":
    panel = MonitorControlPanel()
    panel.run()