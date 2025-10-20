#!/usr/bin/env python3
"""
CrediNet DID 模块测试脚本
使用方法: python3 tests/did/test_did.py
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

class DidTester:
    def __init__(self, base_url="http://127.0.0.1:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.test_did = None
        self.test_user_id = None
        
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
    
    def test_create_did(self):
        """测试创建DID"""
        # 生成测试用户ID和公钥
        self.test_user_id = f"user_{random.randint(1000, 9999)}"
        test_public_key = "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v"
        
        test_services = [
            {
                "id": f"{self.test_user_id}#service-1",
                "type": "CrediNetService",
                "service_endpoint": "https://api.credinet.com/v1"
            }
        ]
        
        payload = {
            "user_id": self.test_user_id,
            "public_key": test_public_key,
            "services": test_services
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/did",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201:
                data = response.json()
                self.test_did = data.get("did")
                self.log_test("创建DID", True, f"成功创建DID: {self.test_did}")
                return True
            else:
                self.log_test("创建DID", False, f"状态码: {response.status_code}, 响应: {response.text}")
                return False
        except Exception as e:
            self.log_test("创建DID", False, f"异常: {str(e)}")
            return False
    
    def test_get_did(self):
        """测试获取DID文档"""
        if not self.test_did:
            self.log_test("获取DID文档", False, "没有可用的DID")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/did/{self.test_did}")
            
            if response.status_code == 200:
                data = response.json()
                document = data.get("document", {})
                if document.get("id") == self.test_did:
                    self.log_test("获取DID文档", True, "成功获取DID文档")
                    return True
                else:
                    self.log_test("获取DID文档", False, "DID文档ID不匹配")
                    return False
            else:
                self.log_test("获取DID文档", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("获取DID文档", False, f"异常: {str(e)}")
            return False
    
    def test_update_did(self):
        """测试更新DID文档"""
        if not self.test_did:
            self.log_test("更新DID文档", False, "没有可用的DID")
            return False
        
        new_public_key = "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v_updated"
        new_services = [
            {
                "id": f"{self.test_user_id}#service-1",
                "type": "CrediNetService",
                "service_endpoint": "https://api.credinet.com/v2"
            },
            {
                "id": f"{self.test_user_id}#service-2",
                "type": "CrediNetAuthService",
                "service_endpoint": "https://auth.credinet.com/v1"
            }
        ]
        
        payload = {
            "public_key": new_public_key,
            "services": new_services
        }
        
        try:
            response = self.session.put(
                f"{self.base_url}/did/{self.test_did}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                document = data.get("document", {})
                if document.get("version") == 2:  # 应该是版本2
                    self.log_test("更新DID文档", True, "成功更新DID文档到版本2")
                    return True
                else:
                    self.log_test("更新DID文档", False, f"版本号不正确: {document.get('version')}")
                    return False
            else:
                self.log_test("更新DID文档", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("更新DID文档", False, f"异常: {str(e)}")
            return False
    
    def test_get_did_versions(self):
        """测试获取DID版本历史"""
        if not self.test_did:
            self.log_test("获取DID版本历史", False, "没有可用的DID")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/did/{self.test_did}/versions")
            
            if response.status_code == 200:
                data = response.json()
                if len(data) >= 2:  # 应该有至少2个版本
                    self.log_test("获取DID版本历史", True, f"成功获取{len(data)}个版本")
                    return True
                else:
                    self.log_test("获取DID版本历史", False, f"版本数量不足: {len(data)}")
                    return False
            else:
                self.log_test("获取DID版本历史", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("获取DID版本历史", False, f"异常: {str(e)}")
            return False
    
    def test_get_specific_version(self):
        """测试获取特定版本"""
        if not self.test_did:
            self.log_test("获取特定版本", False, "没有可用的DID")
            return False
        
        try:
            # 获取版本1
            response = self.session.get(f"{self.base_url}/did/{self.test_did}/version/1")
            
            if response.status_code == 200:
                data = response.json()
                document = data.get("document", {})
                if document.get("version") == 1:
                    self.log_test("获取特定版本", True, "成功获取版本1")
                    return True
                else:
                    self.log_test("获取特定版本", False, f"版本号不正确: {document.get('version')}")
                    return False
            else:
                self.log_test("获取特定版本", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("获取特定版本", False, f"异常: {str(e)}")
            return False
    
    def test_get_user_dids(self):
        """测试获取用户的所有DID"""
        if not self.test_user_id:
            self.log_test("获取用户DID列表", False, "没有可用的用户ID")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/user/{self.test_user_id}/dids")
            
            if response.status_code == 200:
                data = response.json()
                if self.test_did in data:
                    self.log_test("获取用户DID列表", True, f"成功获取用户DID列表，包含{len(data)}个DID")
                    return True
                else:
                    self.log_test("获取用户DID列表", False, "用户DID列表中不包含测试DID")
                    return False
            else:
                self.log_test("获取用户DID列表", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("获取用户DID列表", False, f"异常: {str(e)}")
            return False
    
    def test_blockchain_registration(self):
        """测试区块链注册"""
        if not self.test_did:
            self.log_test("区块链注册", False, "没有可用的DID")
            return False
        
        try:
            response = self.session.post(f"{self.base_url}/did/{self.test_did}/blockchain/register")
            
            if response.status_code == 200:
                data = response.json()
                if "tx_hash" in data and data.get("status") == "registered":
                    self.log_test("区块链注册", True, f"成功注册到区块链，交易哈希: {data.get('tx_hash')}")
                    return True
                else:
                    self.log_test("区块链注册", False, f"注册响应不正确: {data}")
                    return False
            else:
                self.log_test("区块链注册", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("区块链注册", False, f"异常: {str(e)}")
            return False
    
    def test_blockchain_status(self):
        """测试区块链状态查询"""
        if not self.test_did:
            self.log_test("区块链状态查询", False, "没有可用的DID")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/did/{self.test_did}/blockchain/status")
            
            if response.status_code == 200:
                data = response.json()
                if "tx_hash" in data and "status" in data:
                    self.log_test("区块链状态查询", True, f"成功查询区块链状态: {data.get('status')}")
                    return True
                else:
                    self.log_test("区块链状态查询", False, f"状态响应不正确: {data}")
                    return False
            else:
                self.log_test("区块链状态查询", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("区块链状态查询", False, f"异常: {str(e)}")
            return False
    
    def test_invalid_did(self):
        """测试无效DID处理"""
        invalid_did = "did:credinet:invalid"
        
        try:
            response = self.session.get(f"{self.base_url}/did/{invalid_did}")
            
            if response.status_code == 404:
                self.log_test("无效DID处理", True, "正确返回404状态码")
                return True
            else:
                self.log_test("无效DID处理", False, f"应该返回404但返回: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("无效DID处理", False, f"异常: {str(e)}")
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 CrediNet DID 模块测试")
        print("=" * 50)
        
        # 检查服务健康状态
        if not self.test_service_health():
            print("❌ 服务未运行，请先启动服务: cargo run")
            return
        
        print("\n📝 测试DID创建功能")
        print("-" * 30)
        self.test_create_did()
        
        print("\n📖 测试DID查询功能")
        print("-" * 30)
        self.test_get_did()
        
        print("\n✏️ 测试DID更新功能")
        print("-" * 30)
        self.test_update_did()
        
        print("\n📚 测试版本管理功能")
        print("-" * 30)
        self.test_get_did_versions()
        self.test_get_specific_version()
        
        print("\n👤 测试用户DID管理")
        print("-" * 30)
        self.test_get_user_dids()
        
        print("\n⛓️ 测试区块链功能")
        print("-" * 30)
        self.test_blockchain_registration()
        self.test_blockchain_status()
        
        print("\n🔍 测试错误处理")
        print("-" * 30)
        self.test_invalid_did()
        
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
        with open("tests/did/did_test_report.json", "w", encoding="utf-8") as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        print(f"\n📄 详细测试报告已保存到: tests/did/did_test_report.json")

if __name__ == "__main__":
    tester = DidTester()
    tester.run_all_tests()
