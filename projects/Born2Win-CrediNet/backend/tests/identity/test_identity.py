#!/usr/bin/env python3
"""
CrediNet 身份验证与绑定模块测试脚本
使用方法: python3 tests/identity/test_identity.py
"""

import requests
import json
import time
import random
from datetime import datetime
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

class IdentityTester:
    def __init__(self, base_url="http://127.0.0.1:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.test_user_id = f"user_{random.randint(1000, 9999)}"
        
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
    
    # ========== World ID 测试 ==========
    def test_worldid_verify(self):
        """测试World ID验证"""
        payload = {
            "user_id": self.test_user_id,
            "proof": {
                "merkle_root": "0x" + "1234567890abcdef" * 4,
                "nullifier_hash": "0x" + "abcdef1234567890" * 4,
                "proof": "0x" + "fedcba0987654321" * 8,
                "verification_level": "orb"
            },
            "action": "verify_humanity",
            "signal": self.test_user_id
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/identity/worldid/verify",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("verified"):
                    self.log_test("World ID验证", True, "验证成功")
                    return True
                else:
                    self.log_test("World ID验证", False, f"验证失败: {data.get('message')}")
                    return False
            else:
                self.log_test("World ID验证", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("World ID验证", False, f"异常: {str(e)}")
            return False
    
    def test_worldid_status(self):
        """测试World ID状态查询"""
        try:
            response = self.session.get(f"{self.base_url}/identity/worldid/status/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("worldid_verified"):
                    self.log_test("World ID状态查询", True, "用户已通过World ID验证")
                    return True
                else:
                    self.log_test("World ID状态查询", False, "用户未通过World ID验证")
                    return False
            else:
                self.log_test("World ID状态查询", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("World ID状态查询", False, f"异常: {str(e)}")
            return False
    
    # ========== 可验证凭证测试 ==========
    def test_vc_verify(self):
        """测试可验证凭证验证"""
        credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            "id": "http://example.edu/credentials/3732",
            "type": ["VerifiableCredential", "UniversityDegreeCredential"],
            "issuer": "did:example:university",
            "issuanceDate": "2024-01-01T00:00:00Z",
            "expirationDate": "2025-12-31T23:59:59Z",
            "credentialSubject": {
                "id": f"did:example:{self.test_user_id}",
                "degree": {
                    "type": "BachelorDegree",
                    "name": "Computer Science"
                }
            },
            "proof": {
                "type": "Ed25519Signature2020",
                "created": "2024-01-01T00:00:00Z",
                "verificationMethod": "did:example:university#key-1",
                "proofPurpose": "assertionMethod",
                "jws": "eyJhbGciOiJFZERTQSJ9..."
            }
        }
        
        payload = {
            "user_id": self.test_user_id,
            "credential": json.dumps(credential)
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/identity/credential/verify",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("verified"):
                    self.log_test("可验证凭证验证", True, "凭证验证成功")
                    return True
                else:
                    self.log_test("可验证凭证验证", False, f"凭证验证失败: {data.get('message')}")
                    return False
            else:
                self.log_test("可验证凭证验证", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("可验证凭证验证", False, f"异常: {str(e)}")
            return False
    
    def test_get_credentials(self):
        """测试获取用户凭证列表"""
        try:
            response = self.session.get(f"{self.base_url}/identity/credential/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if len(data) > 0:
                    self.log_test("获取凭证列表", True, f"成功获取{len(data)}个凭证")
                    return True
                else:
                    self.log_test("获取凭证列表", False, "凭证列表为空")
                    return False
            else:
                self.log_test("获取凭证列表", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("获取凭证列表", False, f"异常: {str(e)}")
            return False
    
    # ========== OAuth 测试 ==========
    def test_oauth_bind(self):
        """测试OAuth绑定"""
        providers = ["github", "twitter"]
        
        for provider in providers:
            payload = {
                "user_id": self.test_user_id,
                "provider": provider,
                "code": f"test_code_{provider}_{random.randint(1000, 9999)}",
                "redirect_uri": "https://app.credinet.com/callback"
            }
            
            try:
                response = self.session.post(
                    f"{self.base_url}/identity/oauth/bind",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(f"OAuth绑定-{provider}", True, f"成功绑定{provider}账号")
                    else:
                        self.log_test(f"OAuth绑定-{provider}", False, f"绑定失败: {data.get('message')}")
                else:
                    self.log_test(f"OAuth绑定-{provider}", False, f"状态码: {response.status_code}")
            except Exception as e:
                self.log_test(f"OAuth绑定-{provider}", False, f"异常: {str(e)}")
    
    def test_get_oauth_bindings(self):
        """测试获取OAuth绑定列表"""
        try:
            response = self.session.get(f"{self.base_url}/identity/oauth/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if len(data) >= 2:  # 应该有至少2个绑定
                    self.log_test("获取OAuth绑定列表", True, f"成功获取{len(data)}个绑定")
                    return True
                else:
                    self.log_test("获取OAuth绑定列表", False, f"绑定数量不足: {len(data)}")
                    return False
            else:
                self.log_test("获取OAuth绑定列表", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("获取OAuth绑定列表", False, f"异常: {str(e)}")
            return False
    
    def test_oauth_unbind(self):
        """测试OAuth解绑"""
        payload = {
            "user_id": self.test_user_id,
            "provider": "twitter"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/identity/oauth/unbind",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("OAuth解绑", True, "成功解绑Twitter账号")
                    return True
                else:
                    self.log_test("OAuth解绑", False, f"解绑失败: {data.get('message')}")
                    return False
            else:
                self.log_test("OAuth解绑", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("OAuth解绑", False, f"异常: {str(e)}")
            return False
    
    # ========== 钱包地址测试 ==========
    def test_wallet_connect(self):
        """测试钱包连接"""
        wallets = [
            {
                "address": "0x" + "1234567890abcdef" * 5,
                "chain_type": "ethereum"
            },
            {
                "address": "0x" + "abcdef1234567890" * 5,
                "chain_type": "polygon"
            }
        ]
        
        for wallet in wallets:
            payload = {
                "user_id": self.test_user_id,
                "address": wallet["address"],
                "chain_type": wallet["chain_type"],
                "signature": "0x" + "fedcba0987654321" * 8,
                "message": "I am connecting my wallet to CrediNet"
            }
            
            try:
                response = self.session.post(
                    f"{self.base_url}/identity/wallet/connect",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        self.log_test(f"钱包连接-{wallet['chain_type']}", True, f"成功连接{wallet['chain_type']}钱包")
                    else:
                        self.log_test(f"钱包连接-{wallet['chain_type']}", False, f"连接失败: {data.get('message')}")
                else:
                    self.log_test(f"钱包连接-{wallet['chain_type']}", False, f"状态码: {response.status_code}")
            except Exception as e:
                self.log_test(f"钱包连接-{wallet['chain_type']}", False, f"异常: {str(e)}")
    
    def test_get_wallets(self):
        """测试获取钱包列表"""
        try:
            response = self.session.get(f"{self.base_url}/identity/wallet/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                wallets = data.get("wallets", [])
                if len(wallets) >= 2:
                    self.log_test("获取钱包列表", True, f"成功获取{len(wallets)}个钱包")
                    return wallets
                else:
                    self.log_test("获取钱包列表", False, f"钱包数量不足: {len(wallets)}")
                    return []
            else:
                self.log_test("获取钱包列表", False, f"状态码: {response.status_code}")
                return []
        except Exception as e:
            self.log_test("获取钱包列表", False, f"异常: {str(e)}")
            return []
    
    def test_set_primary_wallet(self, wallets):
        """测试设置主钱包"""
        if not wallets:
            self.log_test("设置主钱包", False, "没有可用的钱包")
            return False
        
        primary_address = wallets[0]["address"]
        payload = {
            "user_id": self.test_user_id,
            "address": primary_address
        }
        
        try:
            response = self.session.put(
                f"{self.base_url}/identity/wallet/primary",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("设置主钱包", True, f"成功设置主钱包: {primary_address[:10]}...")
                    return True
                else:
                    self.log_test("设置主钱包", False, f"设置失败: {data.get('message')}")
                    return False
            else:
                self.log_test("设置主钱包", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("设置主钱包", False, f"异常: {str(e)}")
            return False
    
    def test_get_primary_wallet(self):
        """测试获取主钱包"""
        try:
            response = self.session.get(f"{self.base_url}/identity/wallet/primary/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                primary_wallet = data.get("primary_wallet")
                if primary_wallet:
                    self.log_test("获取主钱包", True, f"主钱包: {primary_wallet[:10]}...")
                    return True
                else:
                    self.log_test("获取主钱包", False, "没有设置主钱包")
                    return False
            else:
                self.log_test("获取主钱包", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("获取主钱包", False, f"异常: {str(e)}")
            return False
    
    # ========== 综合测试 ==========
    def test_user_identity_info(self):
        """测试获取用户完整身份信息"""
        try:
            response = self.session.get(f"{self.base_url}/identity/user/{self.test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                # 验证数据完整性
                has_worldid = data.get("worldid_verified", False)
                has_credentials = len(data.get("verified_credentials", [])) > 0
                has_oauth = len(data.get("oauth_bindings", [])) > 0
                has_wallets = len(data.get("wallets", [])) > 0
                
                summary = f"World ID: {has_worldid}, VC: {has_credentials}, OAuth: {has_oauth}, 钱包: {has_wallets}"
                self.log_test("获取用户完整身份信息", True, summary)
                return True
            else:
                self.log_test("获取用户完整身份信息", False, f"状态码: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("获取用户完整身份信息", False, f"异常: {str(e)}")
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 CrediNet 身份验证与绑定模块测试")
        print("=" * 60)
        print(f"测试用户ID: {self.test_user_id}")
        print()
        
        # 检查服务健康状态
        if not self.test_service_health():
            print("❌ 服务未运行，请先启动服务: cargo run")
            return
        
        print("\n🌍 测试 World ID 验证功能")
        print("-" * 40)
        self.test_worldid_verify()
        self.test_worldid_status()
        
        print("\n🎓 测试可验证凭证功能")
        print("-" * 40)
        self.test_vc_verify()
        self.test_get_credentials()
        
        print("\n🔗 测试 OAuth 绑定功能")
        print("-" * 40)
        self.test_oauth_bind()
        self.test_get_oauth_bindings()
        self.test_oauth_unbind()
        
        print("\n💰 测试钱包地址功能")
        print("-" * 40)
        self.test_wallet_connect()
        wallets = self.test_get_wallets()
        self.test_set_primary_wallet(wallets)
        self.test_get_primary_wallet()
        
        print("\n👤 测试综合查询功能")
        print("-" * 40)
        self.test_user_identity_info()
        
        # 输出测试总结
        print("\n📊 测试总结")
        print("=" * 60)
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        print(f"总测试数: {total}")
        print(f"通过: {passed}")
        print(f"失败: {total - passed}")
        print(f"成功率: {passed/total*100:.1f}%")
        
        # 保存测试报告
        with open("tests/identity/identity_test_report.json", "w", encoding="utf-8") as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        print(f"\n📄 详细测试报告已保存到: tests/identity/identity_test_report.json")

if __name__ == "__main__":
    tester = IdentityTester()
    tester.run_all_tests()

