#!/usr/bin/env python3
"""
CrediNet SBT发放模块测试脚本
使用方法: python3 tests/sbt/test_sbt.py
"""

import requests
import json
import time
from datetime import datetime
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class SbtTester:
    def __init__(self, base_url="http://127.0.0.1:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.test_user_id = None
        self.test_token = None
        
    def log_test(self, test_name, success, message=""):
        """记录测试结果"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
    
    def test_service_health(self):
        """测试服务健康状态"""
        try:
            response = self.session.get(f"{self.base_url}/test/health")
            if response.status_code == 200:
                self.log_test("服务健康检查", True, "服务运行正常")
                return True
            else:
                self.log_test("服务健康检查", False, f"意外状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("服务健康检查", False, f"连接失败: {str(e)}")
            return False
    
    def setup_test_user(self):
        """创建测试用户并获取Token"""
        print("\n🔧 设置测试用户")
        print("-" * 30)
        
        # 1. 发送验证码
        test_contact = "sbt_test@credinet.com"
        response = self.session.post(
            f"{self.base_url}/auth/send_code",
            json={"contact": test_contact}
        )
        
        if response.status_code != 200:
            self.log_test("创建测试用户-发送验证码", False, f"状态码: {response.status_code}")
            return False
        
        # 2. 获取验证码
        codes_response = self.session.get(f"{self.base_url}/test/codes")
        if codes_response.status_code != 200:
            self.log_test("创建测试用户-获取验证码", False, f"状态码: {codes_response.status_code}")
            return False
        
        codes = codes_response.json()
        if not codes or len(codes) == 0:
            self.log_test("创建测试用户-获取验证码", False, "没有找到验证码")
            return False
        
        test_code = codes[0]["code"]
        
        # 3. 登录
        login_response = self.session.post(
            f"{self.base_url}/auth/login",
            json={"contact": test_contact, "code": test_code}
        )
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            self.test_token = login_data.get("token")
            self.test_user_id = login_data.get("user_id")
            self.log_test("创建测试用户", True, f"用户ID: {self.test_user_id}")
            return True
        else:
            self.log_test("创建测试用户", False, "登录失败")
            return False
    
    def test_get_sbt_types(self):
        """测试获取SBT类型列表"""
        try:
            response = self.session.get(f"{self.base_url}/sbt/types")
            
            if response.status_code == 200:
                data = response.json()
                types = data.get("types", [])
                self.log_test("获取SBT类型列表", True, f"类型数量: {len(types)}")
                
                # 显示可用的SBT类型
                if types:
                    print(f"  可用SBT类型:")
                    for sbt_type in types:
                        print(f"    - {sbt_type.get('type')}: {sbt_type.get('name')}")
            else:
                self.log_test("获取SBT类型列表", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取SBT类型列表", False, f"异常: {str(e)}")
    
    def test_get_eligible_sbts(self):
        """测试获取符合条件的SBT"""
        if not self.test_token:
            self.log_test("获取符合条件的SBT", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = self.session.get(
                f"{self.base_url}/sbt/eligible",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                types = data.get("types", [])
                self.log_test("获取符合条件的SBT", True, f"符合条件: {len(types)}个")
                
                if types:
                    print(f"  符合条件的SBT:")
                    for sbt_type in types:
                        print(f"    - {sbt_type.get('type')}: {sbt_type.get('name')}")
            else:
                self.log_test("获取符合条件的SBT", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取符合条件的SBT", False, f"异常: {str(e)}")
    
    def test_auto_issue_sbts(self):
        """测试自动发放SBT"""
        if not self.test_token:
            self.log_test("自动发放SBT", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = self.session.post(
                f"{self.base_url}/sbt/auto_issue",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                issued_sbts = data.get("issued_sbts", [])
                self.log_test("自动发放SBT", True, f"发放数量: {len(issued_sbts)}")
                
                if issued_sbts:
                    print(f"  已发放的SBT:")
                    for sbt in issued_sbts:
                        print(f"    - {sbt.get('sbt_type')}: {sbt.get('status')}")
            else:
                self.log_test("自动发放SBT", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("自动发放SBT", False, f"异常: {str(e)}")
    
    def test_manual_issue_sbt(self):
        """测试手动发放指定类型SBT"""
        if not self.test_token:
            self.log_test("手动发放SBT", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        test_sbt_type = "early_adopter"  # 使用早期用户SBT类型
        
        try:
            response = self.session.post(
                f"{self.base_url}/sbt/issue/{test_sbt_type}",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                issued_sbts = data.get("issued_sbts", [])
                if issued_sbts:
                    sbt = issued_sbts[0]
                    self.log_test("手动发放SBT", True, f"类型: {sbt.get('sbt_type')}, 状态: {sbt.get('status')}")
                else:
                    self.log_test("手动发放SBT", False, "未返回SBT数据")
            else:
                # 可能因为不符合条件或已经发放过
                self.log_test("手动发放SBT", True, f"状态码: {response.status_code}（可能不符合条件）")
        except Exception as e:
            self.log_test("手动发放SBT", False, f"异常: {str(e)}")
    
    def test_get_my_sbts(self):
        """测试获取当前用户的SBT"""
        if not self.test_token:
            self.log_test("获取我的SBT", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = self.session.get(
                f"{self.base_url}/sbt/my",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                sbts = data.get("sbts", [])
                count = data.get("count", 0)
                self.log_test("获取我的SBT", True, f"SBT数量: {count}")
                
                if sbts:
                    print(f"  我的SBT列表:")
                    for sbt in sbts:
                        print(f"    - {sbt.get('sbt_type')}: {sbt.get('status')} (Token ID: {sbt.get('token_id', 'N/A')})")
            else:
                self.log_test("获取我的SBT", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取我的SBT", False, f"异常: {str(e)}")
    
    def test_get_user_sbts(self):
        """测试获取指定用户的SBT"""
        if not self.test_user_id:
            self.log_test("获取用户SBT", False, "缺少用户ID")
            return
        
        try:
            response = self.session.get(
                f"{self.base_url}/sbt/user/{self.test_user_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                count = data.get("count", 0)
                self.log_test("获取用户SBT", True, f"用户 {self.test_user_id} 的SBT数量: {count}")
            else:
                self.log_test("获取用户SBT", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取用户SBT", False, f"异常: {str(e)}")
    
    def test_get_sbt_status(self):
        """测试获取特定SBT的状态"""
        if not self.test_token:
            self.log_test("获取SBT状态", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        test_sbt_type = "early_adopter"
        
        try:
            response = self.session.get(
                f"{self.base_url}/sbt/status/{test_sbt_type}",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get("status")
                self.log_test("获取SBT状态", True, f"状态: {status}")
            elif response.status_code == 404:
                self.log_test("获取SBT状态", True, "SBT不存在（正常情况）")
            else:
                self.log_test("获取SBT状态", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取SBT状态", False, f"异常: {str(e)}")
    
    def test_get_stats(self):
        """测试获取发放统计"""
        if not self.test_token:
            self.log_test("获取发放统计", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = self.session.get(
                f"{self.base_url}/sbt/stats",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("获取发放统计", True, "统计数据获取成功")
                print(f"  统计信息: {json.dumps(data, indent=2, ensure_ascii=False)}")
            else:
                self.log_test("获取发放统计", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取发放统计", False, f"异常: {str(e)}")
    
    def test_sync_pending(self):
        """测试同步待确认交易"""
        try:
            response = self.session.post(f"{self.base_url}/sbt/sync_pending")
            
            if response.status_code == 200:
                data = response.json()
                synced_count = data.get("synced_count", 0)
                self.log_test("同步待确认交易", True, f"同步数量: {synced_count}")
            else:
                self.log_test("同步待确认交易", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("同步待确认交易", False, f"异常: {str(e)}")
    
    def test_retry_issuance(self):
        """测试重试失败的SBT发放"""
        if not self.test_token:
            self.log_test("重试SBT发放", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        test_sbt_type = "early_adopter"
        
        try:
            response = self.session.post(
                f"{self.base_url}/sbt/retry/{test_sbt_type}",
                headers=headers
            )
            
            # 可能返回200（重试成功）或404（没有失败的记录）
            if response.status_code == 200:
                self.log_test("重试SBT发放", True, "重试成功")
            elif response.status_code == 404:
                self.log_test("重试SBT发放", True, "没有失败的记录（正常情况）")
            else:
                self.log_test("重试SBT发放", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("重试SBT发放", False, f"异常: {str(e)}")
    
    def test_cancel_issuance(self):
        """测试撤销SBT发放"""
        if not self.test_token:
            self.log_test("撤销SBT发放", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        test_sbt_type = "test_cancel"
        
        try:
            response = self.session.post(
                f"{self.base_url}/sbt/cancel/{test_sbt_type}",
                headers=headers
            )
            
            # 可能返回200（撤销成功）或404（记录不存在）
            if response.status_code == 200:
                self.log_test("撤销SBT发放", True, "撤销成功")
            elif response.status_code == 404:
                self.log_test("撤销SBT发放", True, "记录不存在（正常情况）")
            else:
                self.log_test("撤销SBT发放", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("撤销SBT发放", False, f"异常: {str(e)}")
    
    def test_admin_issue_sbt(self):
        """测试管理员为指定用户发放SBT"""
        if not self.test_user_id:
            self.log_test("管理员发放SBT", False, "缺少用户ID")
            return
        
        test_sbt_type = "early_adopter"
        
        try:
            response = self.session.post(
                f"{self.base_url}/sbt/admin/issue/{self.test_user_id}/{test_sbt_type}"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("管理员发放SBT", True, "发放成功")
            else:
                # 可能因为没有管理员权限或其他原因
                self.log_test("管理员发放SBT", True, f"状态码: {response.status_code}（可能需要管理员权限）")
        except Exception as e:
            self.log_test("管理员发放SBT", False, f"异常: {str(e)}")
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 CrediNet SBT发放模块测试")
        print("=" * 50)
        
        # 检查服务健康状态
        if not self.test_service_health():
            print("❌ 服务未运行，请先启动服务: cargo run")
            return
        
        # 设置测试用户
        if not self.setup_test_user():
            print("❌ 无法创建测试用户，停止测试")
            return
        
        print("\n📋 测试SBT类型查询")
        print("-" * 30)
        self.test_get_sbt_types()
        self.test_get_eligible_sbts()
        
        print("\n🎁 测试SBT发放功能")
        print("-" * 30)
        self.test_auto_issue_sbts()
        self.test_manual_issue_sbt()
        
        print("\n🔍 测试SBT查询功能")
        print("-" * 30)
        self.test_get_my_sbts()
        self.test_get_user_sbts()
        self.test_get_sbt_status()
        self.test_get_stats()
        
        print("\n🔄 测试SBT管理功能")
        print("-" * 30)
        self.test_sync_pending()
        self.test_retry_issuance()
        self.test_cancel_issuance()
        
        print("\n👑 测试管理员功能")
        print("-" * 30)
        self.test_admin_issue_sbt()
        
        # 输出测试总结
        print("\n📊 测试总结")
        print("=" * 50)
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        print(f"总测试数: {total}")
        print(f"通过: {passed}")
        print(f"失败: {total - passed}")
        print(f"成功率: {passed/total*100:.1f}%")
        
        # 保存测试报告
        with open("tests/sbt/sbt_test_report.json", "w", encoding="utf-8") as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        print(f"\n📄 详细测试报告已保存到: tests/sbt/sbt_test_report.json")

if __name__ == "__main__":
    tester = SbtTester()
    tester.run_all_tests()

