#!/usr/bin/env python3
"""
模拟交易测试配置推荐

根据不同需求提供预设的测试配置
"""

import asyncio
from enhanced_simulation_trading import EnhancedPolymarketSimulationSystem
from datetime import datetime

class TestConfigurations:
    """测试配置类"""
    
    @staticmethod
    def quick_debug_test():
        """快速调试测试 - 5分钟"""
        return {
            'name': 'Quick Debug Test',
            'description': '5分钟快速验证系统功能',
            'initial_balance': 10000,
            'duration_hours': 0.083,  # 5分钟
            'use_case': '开发调试、功能验证',
            'expected_trades': '1-3笔',
            'focus': '系统稳定性'
        }
    
    @staticmethod
    def strategy_validation_test():
        """策略验证测试 - 30分钟"""
        return {
            'name': 'Strategy Validation Test', 
            'description': '30分钟策略效果评估',
            'initial_balance': 20000,
            'duration_hours': 0.5,  # 30分钟
            'use_case': '策略测试、参数调优',
            'expected_trades': '3-8笔',
            'focus': '策略表现'
        }
    
    @staticmethod
    def performance_test():
        """性能测试 - 2小时"""
        return {
            'name': 'Performance Test',
            'description': '2小时性能和风险评估', 
            'initial_balance': 30000,
            'duration_hours': 2.0,  # 2小时
            'use_case': '性能评估、风险测试',
            'expected_trades': '8-20笔',
            'focus': '风险管理、收益分析'
        }
    
    @staticmethod
    def comprehensive_test():
        """综合测试 - 8小时"""
        return {
            'name': 'Comprehensive Test',
            'description': '8小时完整策略验证',
            'initial_balance': 50000,
            'duration_hours': 8.0,  # 8小时
            'use_case': '完整验证、正式测试',
            'expected_trades': '20-50笔',
            'focus': '完整策略验证'
        }
    
    @staticmethod
    def stress_test():
        """压力测试 - 24小时"""
        return {
            'name': 'Stress Test',
            'description': '24小时系统稳定性测试',
            'initial_balance': 100000,
            'duration_hours': 24.0,  # 24小时
            'use_case': '稳定性测试、长期表现',
            'expected_trades': '50-150笔',
            'focus': '系统稳定性、长期表现'
        }
    
    @staticmethod
    def weekend_test():
        """周末测试 - 48小时"""
        return {
            'name': 'Weekend Test',
            'description': '48小时周末长期测试',
            'initial_balance': 200000,
            'duration_hours': 48.0,  # 48小时
            'use_case': '长期验证、生产准备',
            'expected_trades': '100-300笔',
            'focus': '长期稳定性、收益一致性'
        }

class TestRunner:
    """测试运行器"""
    
    def __init__(self):
        self.configurations = TestConfigurations()
    
    def show_all_configurations(self):
        """显示所有测试配置"""
        configs = [
            self.configurations.quick_debug_test(),
            self.configurations.strategy_validation_test(),
            self.configurations.performance_test(), 
            self.configurations.comprehensive_test(),
            self.configurations.stress_test(),
            self.configurations.weekend_test()
        ]
        
        print("=" * 70)
        print("POLYMARKET SIMULATION TEST CONFIGURATIONS")
        print("=" * 70)
        
        for i, config in enumerate(configs, 1):
            print(f"\n{i}. {config['name']}")
            print(f"   Description: {config['description']}")
            print(f"   Duration: {config['duration_hours']} hours")
            print(f"   Initial Balance: ${config['initial_balance']:,}")
            print(f"   Use Case: {config['use_case']}")
            print(f"   Expected Trades: {config['expected_trades']}")
            print(f"   Focus: {config['focus']}")
        
        print("\n" + "=" * 70)
        return configs
    
    async def run_test_by_number(self, test_number: int):
        """根据编号运行测试"""
        configs = [
            self.configurations.quick_debug_test(),
            self.configurations.strategy_validation_test(),
            self.configurations.performance_test(),
            self.configurations.comprehensive_test(),
            self.configurations.stress_test(),
            self.configurations.weekend_test()
        ]
        
        if test_number < 1 or test_number > len(configs):
            print(f"[ERROR] Invalid test number. Choose 1-{len(configs)}")
            return False
        
        config = configs[test_number - 1]
        
        print(f"\n[START] Running: {config['name']}")
        print(f"[CONFIG] Duration: {config['duration_hours']} hours")
        print(f"[CONFIG] Balance: ${config['initial_balance']:,}")
        print(f"[CONFIG] Focus: {config['focus']}")
        print("-" * 50)
        
        try:
            sim = EnhancedPolymarketSimulationSystem(
                initial_balance=config['initial_balance'],
                offline_mode=True
            )
            
            await sim.run_enhanced_simulation(config['duration_hours'])
            
            print(f"\n[SUCCESS] {config['name']} completed!")
            return True
            
        except KeyboardInterrupt:
            print(f"\n[INTERRUPT] {config['name']} stopped by user")
            return True
            
        except Exception as e:
            print(f"\n[ERROR] {config['name']} failed: {e}")
            return False
    
    async def run_custom_test(self, balance: float, hours: float, name: str = "Custom Test"):
        """运行自定义测试"""
        print(f"\n[START] Running: {name}")
        print(f"[CONFIG] Duration: {hours} hours")
        print(f"[CONFIG] Balance: ${balance:,.0f}")
        print("-" * 50)
        
        try:
            sim = EnhancedPolymarketSimulationSystem(
                initial_balance=balance,
                offline_mode=True
            )
            
            await sim.run_enhanced_simulation(hours)
            
            print(f"\n[SUCCESS] {name} completed!")
            return True
            
        except KeyboardInterrupt:
            print(f"\n[INTERRUPT] {name} stopped by user")
            return True
            
        except Exception as e:
            print(f"\n[ERROR] {name} failed: {e}")
            return False

def main():
    """主函数 - 交互式测试选择"""
    runner = TestRunner()
    
    print("Welcome to Polymarket Simulation Test Runner!")
    print("=" * 50)
    
    while True:
        print("\nOptions:")
        print("1. Show all test configurations")
        print("2. Run a specific test")
        print("3. Run custom test")
        print("4. Exit")
        
        choice = input("\nChoose an option (1-4): ").strip()
        
        if choice == "1":
            runner.show_all_configurations()
            
        elif choice == "2":
            configs = runner.show_all_configurations()
            try:
                test_num = int(input(f"\nChoose test number (1-{len(configs)}): "))
                print("\nStarting test... (Press Ctrl+C to stop)")
                asyncio.run(runner.run_test_by_number(test_num))
            except ValueError:
                print("[ERROR] Please enter a valid number")
            except KeyboardInterrupt:
                print("\n[INTERRUPT] Test selection cancelled")
                
        elif choice == "3":
            try:
                balance = float(input("Enter initial balance ($): "))
                hours = float(input("Enter duration (hours): "))
                name = input("Enter test name (optional): ").strip() or "Custom Test"
                
                print("\nStarting custom test... (Press Ctrl+C to stop)")
                asyncio.run(runner.run_custom_test(balance, hours, name))
            except ValueError:
                print("[ERROR] Please enter valid numbers")
            except KeyboardInterrupt:
                print("\n[INTERRUPT] Custom test cancelled")
                
        elif choice == "4":
            print("Goodbye!")
            break
            
        else:
            print("[ERROR] Invalid option. Please choose 1-4")

if __name__ == "__main__":
    main()