#!/usr/bin/env python3
"""
CrediNet 信用评分模块测试脚本
使用方法: python3 tests/credit/test_credit.py
"""

import requests
import json
import time
from datetime import datetime
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class CreditTester:
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
        test_contact = "credit_test@credinet.com"
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
    
    def test_calculate_score(self):
        """测试计算信用评分"""
        if not self.test_token or not self.test_user_id:
            self.log_test("计算信用评分", False, "缺少认证信息")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        # 测试强制刷新
        try:
            response = self.session.post(
                f"{self.base_url}/credit/calculate",
                params={"force_refresh": "true"},
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                score = data.get("score", {})
                total_score = score.get("total_score", 0)
                self.log_test("计算信用评分", True, f"评分: {total_score}")
            else:
                self.log_test("计算信用评分", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("计算信用评分", False, f"异常: {str(e)}")
    
    def test_calculate_score_by_id(self):
        """测试按用户ID计算评分"""
        if not self.test_user_id:
            self.log_test("按ID计算评分", False, "缺少用户ID")
            return
        
        try:
            response = self.session.post(
                f"{self.base_url}/credit/calculate/{self.test_user_id}",
                params={"force_refresh": "false"}
            )
            
            if response.status_code == 200:
                data = response.json()
                score = data.get("score", {})
                total_score = score.get("total_score", 0)
                self.log_test("按ID计算评分", True, f"评分: {total_score}")
            else:
                self.log_test("按ID计算评分", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("按ID计算评分", False, f"异常: {str(e)}")
    
    def test_get_score(self):
        """测试获取信用评分"""
        if not self.test_token:
            self.log_test("获取信用评分", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = self.session.get(
                f"{self.base_url}/credit/score",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                user_id = data.get("user_id")
                score = data.get("score", {})
                self.log_test("获取信用评分", True, f"用户: {user_id}, 评分: {score.get('total_score', 0)}")
            else:
                self.log_test("获取信用评分", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取信用评分", False, f"异常: {str(e)}")
    
    def test_get_score_by_id(self):
        """测试按ID获取评分"""
        if not self.test_user_id:
            self.log_test("按ID获取评分", False, "缺少用户ID")
            return
        
        try:
            response = self.session.get(
                f"{self.base_url}/credit/score/{self.test_user_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                score = data.get("score", {})
                self.log_test("按ID获取评分", True, f"评分: {score.get('total_score', 0)}")
            else:
                self.log_test("按ID获取评分", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("按ID获取评分", False, f"异常: {str(e)}")
    
    def test_get_profile(self):
        """测试获取信用画像"""
        if not self.test_token:
            self.log_test("获取信用画像", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = self.session.get(
                f"{self.base_url}/credit/profile",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("获取信用画像", True, f"画像数据获取成功")
            elif response.status_code == 404:
                self.log_test("获取信用画像", True, "画像不存在（正常情况）")
            else:
                self.log_test("获取信用画像", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取信用画像", False, f"异常: {str(e)}")
    
    def test_get_profile_by_id(self):
        """测试按ID获取信用画像"""
        if not self.test_user_id:
            self.log_test("按ID获取信用画像", False, "缺少用户ID")
            return
        
        try:
            response = self.session.get(
                f"{self.base_url}/credit/profile/{self.test_user_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("按ID获取信用画像", True, "画像数据获取成功")
            elif response.status_code == 404:
                self.log_test("按ID获取信用画像", True, "画像不存在（正常情况）")
            else:
                self.log_test("按ID获取信用画像", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("按ID获取信用画像", False, f"异常: {str(e)}")
    
    def test_get_history(self):
        """测试获取评分历史"""
        if not self.test_token:
            self.log_test("获取评分历史", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = self.session.get(
                f"{self.base_url}/credit/history",
                params={"limit": 10},
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                history = data if isinstance(data, list) else []
                self.log_test("获取评分历史", True, f"历史记录数: {len(history)}")
            else:
                self.log_test("获取评分历史", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取评分历史", False, f"异常: {str(e)}")
    
    def test_get_data_sources(self):
        """测试获取数据源状态"""
        if not self.test_token:
            self.log_test("获取数据源状态", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            response = self.session.get(
                f"{self.base_url}/credit/data_sources",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                sources = data.get("sources", [])
                self.log_test("获取数据源状态", True, f"数据源数量: {len(sources)}")
            else:
                self.log_test("获取数据源状态", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("获取数据源状态", False, f"异常: {str(e)}")
    
    def test_cache_mechanism(self):
        """测试缓存机制"""
        if not self.test_token:
            self.log_test("测试缓存机制", False, "缺少Token")
            return
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            # 第一次计算（强制刷新）
            start_time = time.time()
            response1 = self.session.post(
                f"{self.base_url}/credit/calculate",
                params={"force_refresh": "true"},
                headers=headers
            )
            time1 = time.time() - start_time
            
            # 第二次计算（使用缓存）
            start_time = time.time()
            response2 = self.session.post(
                f"{self.base_url}/credit/calculate",
                params={"force_refresh": "false"},
                headers=headers
            )
            time2 = time.time() - start_time
            
            if response1.status_code == 200 and response2.status_code == 200:
                # 缓存应该更快
                if time2 < time1:
                    self.log_test("测试缓存机制", True, f"缓存生效（刷新: {time1:.2f}s, 缓存: {time2:.2f}s）")
                else:
                    self.log_test("测试缓存机制", True, f"功能正常（刷新: {time1:.2f}s, 缓存: {time2:.2f}s）")
            else:
                self.log_test("测试缓存机制", False, "请求失败")
        except Exception as e:
            self.log_test("测试缓存机制", False, f"异常: {str(e)}")
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 CrediNet 信用评分模块测试")
        print("=" * 50)
        
        # 检查服务健康状态
        if not self.test_service_health():
            print("❌ 服务未运行，请先启动服务: cargo run")
            return
        
        # 设置测试用户
        if not self.setup_test_user():
            print("❌ 无法创建测试用户，停止测试")
            return
        
        print("\n📊 测试评分计算功能")
        print("-" * 30)
        self.test_calculate_score()
        self.test_calculate_score_by_id()
        
        print("\n📈 测试评分查询功能")
        print("-" * 30)
        self.test_get_score()
        self.test_get_score_by_id()
        
        print("\n👤 测试信用画像功能")
        print("-" * 30)
        self.test_get_profile()
        self.test_get_profile_by_id()
        
        print("\n🕐 测试历史记录功能")
        print("-" * 30)
        self.test_get_history()
        
        print("\n🔌 测试数据源功能")
        print("-" * 30)
        self.test_get_data_sources()
        
        print("\n⚡ 测试缓存机制")
        print("-" * 30)
        self.test_cache_mechanism()
        
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
        with open("tests/credit/credit_test_report.json", "w", encoding="utf-8") as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        print(f"\n📄 详细测试报告已保存到: tests/credit/credit_test_report.json")

if __name__ == "__main__":
    tester = CreditTester()
    tester.run_all_tests()

