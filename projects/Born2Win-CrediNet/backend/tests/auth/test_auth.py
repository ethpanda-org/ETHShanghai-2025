#!/usr/bin/env python3
"""
CrediNet 身份认证模块测试脚本
使用方法: python3 tests/auth/test_auth.py
"""

import requests
import json
import time
import random
import string
from datetime import datetime
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class AuthTester:
    def __init__(self, base_url="http://127.0.0.1:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        
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
    
    def test_send_code(self):
        """测试发送验证码"""
        test_cases = [
            {"contact": "test@example.com", "type": "邮箱"},
            {"contact": "13800138000", "type": "手机号"},
            {"contact": "invalid-email", "type": "无效邮箱"},
        ]
        
        for case in test_cases:
            try:
                response = self.session.post(
                    f"{self.base_url}/auth/send_code",
                    json={"contact": case["contact"]},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    self.log_test(f"发送{case['type']}验证码", True, f"成功发送到 {case['contact']}")
                else:
                    self.log_test(f"发送{case['type']}验证码", False, f"状态码: {response.status_code}")
            except Exception as e:
                self.log_test(f"发送{case['type']}验证码", False, f"异常: {str(e)}")
    
    def test_login_with_valid_code(self):
        """测试有效验证码登录"""
        # 先发送验证码
        test_contact = "test@example.com"
        response = self.session.post(
            f"{self.base_url}/auth/send_code",
            json={"contact": test_contact},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            self.log_test("有效验证码登录", False, "发送验证码失败")
            return None
        
        # 获取验证码
        codes_response = self.session.get(f"{self.base_url}/test/codes")
        if codes_response.status_code != 200:
            self.log_test("有效验证码登录", False, "无法获取验证码")
            return None
        
        codes = codes_response.json()
        if not codes:
            self.log_test("有效验证码登录", False, "没有找到验证码")
            return None
        
        test_code = codes[0]["code"]
        
        # 尝试登录
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"contact": test_contact, "code": test_code},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("token")
                user_id = data.get("user_id")
                self.log_test("有效验证码登录", True, f"登录成功，用户ID: {user_id}")
                return token
            else:
                self.log_test("有效验证码登录", False, f"登录失败，状态码: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("有效验证码登录", False, f"异常: {str(e)}")
            return None
    
    def test_login_with_invalid_code(self):
        """测试无效验证码登录"""
        test_cases = [
            {"contact": "test@example.com", "code": "000000", "desc": "错误验证码"},
            {"contact": "test@example.com", "code": "12345", "desc": "验证码长度不足"},
            {"contact": "test@example.com", "code": "1234567", "desc": "验证码长度过长"},
            {"contact": "test@example.com", "code": "abc123", "desc": "非数字验证码"},
        ]
        
        for case in test_cases:
            try:
                response = self.session.post(
                    f"{self.base_url}/auth/login",
                    json={"contact": case["contact"], "code": case["code"]},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 401:
                    self.log_test(f"无效验证码登录-{case['desc']}", True, "正确拒绝无效验证码")
                else:
                    self.log_test(f"无效验证码登录-{case['desc']}", False, f"应该拒绝但返回状态码: {response.status_code}")
            except Exception as e:
                self.log_test(f"无效验证码登录-{case['desc']}", False, f"异常: {str(e)}")
    
    def test_protected_routes(self, token):
        """测试受保护的路由"""
        if not token:
            self.log_test("受保护路由测试", False, "无有效Token")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 测试受保护路由
        try:
            response = self.session.get(f"{self.base_url}/protected", headers=headers)
            if response.status_code == 200:
                self.log_test("访问受保护路由", True, "成功访问")
            else:
                self.log_test("访问受保护路由", False, f"状态码: {response.status_code}")
        except Exception as e:
            self.log_test("访问受保护路由", False, f"异常: {str(e)}")
        
        # 测试管理员路由（普通用户应该被拒绝）
        try:
            response = self.session.get(f"{self.base_url}/admin", headers=headers)
            if response.status_code == 403:
                self.log_test("访问管理员路由", True, "正确拒绝普通用户")
            else:
                self.log_test("访问管理员路由", False, f"应该拒绝但返回状态码: {response.status_code}")
        except Exception as e:
            self.log_test("访问管理员路由", False, f"异常: {str(e)}")
    
    def test_invalid_token(self):
        """测试无效Token"""
        test_cases = [
            {"token": "invalid_token", "desc": "完全无效Token"},
            {"token": "Bearer invalid_token", "desc": "错误格式Token"},
            {"token": "", "desc": "空Token"},
        ]
        
        for case in test_cases:
            try:
                headers = {"Authorization": f"Bearer {case['token']}"} if case['token'] else {}
                response = self.session.get(f"{self.base_url}/protected", headers=headers)
                
                if response.status_code == 401:
                    self.log_test(f"无效Token测试-{case['desc']}", True, "正确拒绝无效Token")
                else:
                    self.log_test(f"无效Token测试-{case['desc']}", False, f"应该拒绝但返回状态码: {response.status_code}")
            except Exception as e:
                self.log_test(f"无效Token测试-{case['desc']}", False, f"异常: {str(e)}")
    
    def test_code_reuse(self, contact, code):
        """测试验证码重复使用"""
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"contact": contact, "code": code},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 401:
                self.log_test("验证码重复使用测试", True, "正确拒绝重复使用的验证码")
            else:
                self.log_test("验证码重复使用测试", False, f"应该拒绝但返回状态码: {response.status_code}")
        except Exception as e:
            self.log_test("验证码重复使用测试", False, f"异常: {str(e)}")
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 CrediNet 身份认证模块测试")
        print("=" * 50)
        
        # 检查服务健康状态
        if not self.test_service_health():
            print("❌ 服务未运行，请先启动服务: cargo run")
            return
        
        print("\n📧 测试验证码发送功能")
        print("-" * 30)
        self.test_send_code()
        
        print("\n🔑 测试登录功能")
        print("-" * 30)
        token = self.test_login_with_valid_code()
        self.test_login_with_invalid_code()
        
        print("\n🛡️ 测试受保护路由")
        print("-" * 30)
        self.test_protected_routes(token)
        
        print("\n🔒 测试无效Token")
        print("-" * 30)
        self.test_invalid_token()
        
        # 如果有有效Token，测试验证码重复使用
        if token:
            print("\n🔄 测试验证码重复使用")
            print("-" * 30)
            # 获取之前使用的验证码
            codes_response = self.session.get(f"{self.base_url}/test/codes")
            if codes_response.status_code == 200:
                codes = codes_response.json()
                if codes:
                    used_code = codes[0]["code"]
                    self.test_code_reuse("test@example.com", used_code)
        
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
        with open("tests/auth/auth_test_report.json", "w", encoding="utf-8") as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        print(f"\n📄 详细测试报告已保存到: tests/auth/auth_test_report.json")

if __name__ == "__main__":
    tester = AuthTester()
    tester.run_all_tests()
