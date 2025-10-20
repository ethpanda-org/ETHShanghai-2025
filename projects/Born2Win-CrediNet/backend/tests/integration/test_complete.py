#!/usr/bin/env python3
"""
CrediNet 完整系统集成测试脚本
测试所有六个模块: 身份认证 + DID管理 + 身份验证 + 用户授权 + 信用评分 + SBT发放
使用方法: python3 tests/integration/test_complete.py
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

class CompleteTester:
    def __init__(self, base_url="http://127.0.0.1:8080"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.test_user_id = None
        self.test_token = None
        self.test_did = None
        
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
    
    def test_auth_flow(self):
        """测试完整身份认证流程"""
        print("\n🔐 测试身份认证流程")
        print("-" * 30)
        
        # 1. 发送验证码
        test_contact = "test@credinet.com"
        response = self.session.post(
            f"{self.base_url}/auth/send_code",
            json={"contact": test_contact},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            self.log_test("发送验证码", False, f"状态码: {response.status_code}")
            return False
        
        self.log_test("发送验证码", True, "验证码发送成功")
        
        # 2. 获取验证码（从测试接口）
        codes_response = self.session.get(f"{self.base_url}/test/codes")
        if codes_response.status_code != 200:
            self.log_test("获取验证码", False, "无法获取验证码")
            return False
        
        codes = codes_response.json()
        if not codes:
            self.log_test("获取验证码", False, "没有找到验证码")
            return False
        
        test_code = codes[0]["code"]
        self.log_test("获取验证码", True, f"获取到验证码: {test_code}")
        
        # 3. 登录
        login_response = self.session.post(
            f"{self.base_url}/auth/login",
            json={"contact": test_contact, "code": test_code},
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code != 200:
            self.log_test("用户登录", False, f"状态码: {login_response.status_code}")
            return False
        
        login_data = login_response.json()
        self.test_token = login_data.get("token")
        self.test_user_id = login_data.get("user_id")
        
        if not self.test_token or not self.test_user_id:
            self.log_test("用户登录", False, "登录响应缺少必要字段")
            return False
        
        self.log_test("用户登录", True, f"登录成功，用户ID: {self.test_user_id}")
        
        # 4. 访问受保护接口
        headers = {"Authorization": f"Bearer {self.test_token}"}
        protected_response = self.session.get(f"{self.base_url}/protected", headers=headers)
        
        if protected_response.status_code != 200:
            self.log_test("访问受保护接口", False, f"状态码: {protected_response.status_code}")
            return False
        
        self.log_test("访问受保护接口", True, "成功访问受保护接口")
        
        return True
    
    def test_did_flow(self):
        """测试完整DID管理流程"""
        print("\n🆔 测试DID管理流程")
        print("-" * 30)
        
        if not self.test_user_id:
            self.log_test("DID创建", False, "没有可用的用户ID")
            return False
        
        # 1. 创建DID
        test_public_key = "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v"
        test_services = [
            {
                "id": f"{self.test_user_id}#service-1",
                "type": "CrediNetService",
                "service_endpoint": "https://api.credinet.com/v1"
            }
        ]
        
        create_response = self.session.post(
            f"{self.base_url}/did",
            json={
                "user_id": self.test_user_id,
                "public_key": test_public_key,
                "services": test_services
            },
            headers={"Content-Type": "application/json"}
        )
        
        if create_response.status_code != 201:
            self.log_test("创建DID", False, f"状态码: {create_response.status_code}")
            return False
        
        create_data = create_response.json()
        self.test_did = create_data.get("did")
        
        if not self.test_did:
            self.log_test("创建DID", False, "DID创建响应缺少DID字段")
            return False
        
        self.log_test("创建DID", True, f"成功创建DID: {self.test_did}")
        
        # 2. 获取DID文档
        get_response = self.session.get(f"{self.base_url}/did/{self.test_did}")
        
        if get_response.status_code != 200:
            self.log_test("获取DID文档", False, f"状态码: {get_response.status_code}")
            return False
        
        get_data = get_response.json()
        document = get_data.get("document", {})
        
        if document.get("id") != self.test_did:
            self.log_test("获取DID文档", False, "DID文档ID不匹配")
            return False
        
        self.log_test("获取DID文档", True, "成功获取DID文档")
        
        # 3. 更新DID文档
        update_response = self.session.put(
            f"{self.base_url}/did/{self.test_did}",
            json={
                "public_key": test_public_key + "_updated",
                "services": [
                    {
                        "id": f"{self.test_user_id}#service-1",
                        "type": "CrediNetService",
                        "service_endpoint": "https://api.credinet.com/v2"
                    }
                ]
            },
            headers={"Content-Type": "application/json"}
        )
        
        if update_response.status_code != 200:
            self.log_test("更新DID文档", False, f"状态码: {update_response.status_code}")
            return False
        
        update_data = update_response.json()
        updated_document = update_data.get("document", {})
        
        if updated_document.get("version") != 2:
            self.log_test("更新DID文档", False, f"版本号不正确: {updated_document.get('version')}")
            return False
        
        self.log_test("更新DID文档", True, "成功更新DID文档到版本2")
        
        # 4. 获取版本历史
        versions_response = self.session.get(f"{self.base_url}/did/{self.test_did}/versions")
        
        if versions_response.status_code != 200:
            self.log_test("获取版本历史", False, f"状态码: {versions_response.status_code}")
            return False
        
        versions_data = versions_response.json()
        
        if len(versions_data) < 2:
            self.log_test("获取版本历史", False, f"版本数量不足: {len(versions_data)}")
            return False
        
        self.log_test("获取版本历史", True, f"成功获取{len(versions_data)}个版本")
        
        # 5. 获取用户DID列表
        user_dids_response = self.session.get(f"{self.base_url}/user/{self.test_user_id}/dids")
        
        if user_dids_response.status_code != 200:
            self.log_test("获取用户DID列表", False, f"状态码: {user_dids_response.status_code}")
            return False
        
        user_dids_data = user_dids_response.json()
        
        if self.test_did not in user_dids_data:
            self.log_test("获取用户DID列表", False, "用户DID列表中不包含测试DID")
            return False
        
        self.log_test("获取用户DID列表", True, f"成功获取用户DID列表，包含{len(user_dids_data)}个DID")
        
        return True
    
    def test_blockchain_flow(self):
        """测试区块链注册流程"""
        print("\n⛓️ 测试区块链注册流程")
        print("-" * 30)
        
        if not self.test_did:
            self.log_test("区块链注册", False, "没有可用的DID")
            return False
        
        # 1. 注册到区块链
        register_response = self.session.post(f"{self.base_url}/did/{self.test_did}/blockchain/register")
        
        if register_response.status_code != 200:
            self.log_test("区块链注册", False, f"状态码: {register_response.status_code}")
            return False
        
        register_data = register_response.json()
        
        if not register_data.get("tx_hash") or register_data.get("status") != "registered":
            self.log_test("区块链注册", False, f"注册响应不正确: {register_data}")
            return False
        
        self.log_test("区块链注册", True, f"成功注册到区块链，交易哈希: {register_data.get('tx_hash')}")
        
        # 2. 查询区块链状态
        status_response = self.session.get(f"{self.base_url}/did/{self.test_did}/blockchain/status")
        
        if status_response.status_code != 200:
            self.log_test("查询区块链状态", False, f"状态码: {status_response.status_code}")
            return False
        
        status_data = status_response.json()
        
        if not status_data.get("tx_hash") or not status_data.get("status"):
            self.log_test("查询区块链状态", False, f"状态响应不正确: {status_data}")
            return False
        
        self.log_test("查询区块链状态", True, f"成功查询区块链状态: {status_data.get('status')}")
        
        return True
    
    def test_error_handling(self):
        """测试错误处理"""
        print("\n🔍 测试错误处理")
        print("-" * 30)
        
        # 1. 测试无效DID
        invalid_did = "did:credinet:invalid"
        invalid_response = self.session.get(f"{self.base_url}/did/{invalid_did}")
        
        if invalid_response.status_code == 404:
            self.log_test("无效DID处理", True, "正确返回404状态码")
        else:
            self.log_test("无效DID处理", False, f"应该返回404但返回: {invalid_response.status_code}")
        
        # 2. 测试无效Token
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        invalid_protected_response = self.session.get(f"{self.base_url}/protected", headers=invalid_headers)
        
        if invalid_protected_response.status_code == 401:
            self.log_test("无效Token处理", True, "正确返回401状态码")
        else:
            self.log_test("无效Token处理", False, f"应该返回401但返回: {invalid_protected_response.status_code}")
        
        # 3. 测试重复使用验证码
        if self.test_token:
            # 先获取一个验证码
            codes_response = self.session.get(f"{self.base_url}/test/codes")
            if codes_response.status_code == 200:
                codes = codes_response.json()
                if codes:
                    used_code = codes[0]["code"]
                    reuse_response = self.session.post(
                        f"{self.base_url}/auth/login",
                        json={"contact": "test@credinet.com", "code": used_code},
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if reuse_response.status_code == 401:
                        self.log_test("重复使用验证码处理", True, "正确拒绝重复使用的验证码")
                    else:
                        self.log_test("重复使用验证码处理", False, f"应该返回401但返回: {reuse_response.status_code}")
    
    def test_identity_flow(self):
        """测试身份验证与绑定流程"""
        print("\n🔐 测试身份验证与绑定流程")
        print("-" * 30)
        
        if not self.test_user_id:
            self.log_test("身份验证流程", False, "没有可用的用户ID")
            return False
        
        # 1. World ID验证
        worldid_payload = {
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
        
        worldid_response = self.session.post(
            f"{self.base_url}/identity/worldid/verify",
            json=worldid_payload
        )
        
        if worldid_response.status_code == 200:
            data = worldid_response.json()
            if data.get("verified"):
                self.log_test("World ID验证", True, "验证成功")
            else:
                self.log_test("World ID验证", False, "验证失败")
        else:
            self.log_test("World ID验证", False, f"状态码: {worldid_response.status_code}")
        
        # 2. OAuth绑定
        oauth_payload = {
            "user_id": self.test_user_id,
            "provider": "github",
            "code": f"test_code_{random.randint(1000, 9999)}",
            "redirect_uri": "https://app.credinet.com/callback"
        }
        
        oauth_response = self.session.post(
            f"{self.base_url}/identity/oauth/bind",
            json=oauth_payload
        )
        
        if oauth_response.status_code == 200:
            data = oauth_response.json()
            if data.get("success"):
                self.log_test("OAuth绑定", True, "成功绑定GitHub账号")
            else:
                self.log_test("OAuth绑定", False, "绑定失败")
        else:
            self.log_test("OAuth绑定", False, f"状态码: {oauth_response.status_code}")
        
        # 3. 钱包连接
        wallet_payload = {
            "user_id": self.test_user_id,
            "address": "0x" + "1234567890abcdef" * 5,
            "chain_type": "ethereum",
            "signature": "0x" + "fedcba0987654321" * 8,
            "message": "I am connecting my wallet to CrediNet"
        }
        
        wallet_response = self.session.post(
            f"{self.base_url}/identity/wallet/connect",
            json=wallet_payload
        )
        
        if wallet_response.status_code == 200:
            data = wallet_response.json()
            if data.get("success"):
                self.log_test("钱包连接", True, "成功连接钱包")
            else:
                self.log_test("钱包连接", False, "连接失败")
        else:
            self.log_test("钱包连接", False, f"状态码: {wallet_response.status_code}")
        
        return True
    
    def test_authorization_flow(self):
        """测试授权管理流程"""
        print("\n🔒 测试用户授权管理流程")
        print("-" * 30)
        
        if not self.test_user_id:
            self.log_test("授权管理流程", False, "没有可用的用户ID")
            return False
        
        # 1. 设置GitHub授权
        auth_payload = {
            "user_id": self.test_user_id,
            "data_source": "github",
            "authorized": True,
            "purpose": "用于信用评分"
        }
        
        auth_response = self.session.post(
            f"{self.base_url}/authorization/set",
            json=auth_payload
        )
        
        if auth_response.status_code == 200:
            data = auth_response.json()
            if data.get("success"):
                self.log_test("设置授权", True, "成功授权GitHub数据源")
            else:
                self.log_test("设置授权", False, "授权设置失败")
        else:
            self.log_test("设置授权", False, f"状态码: {auth_response.status_code}")
        
        # 2. 查询授权状态
        check_response = self.session.get(
            f"{self.base_url}/authorization/{self.test_user_id}/github"
        )
        
        if check_response.status_code == 200:
            data = check_response.json()
            if data.get("authorized"):
                self.log_test("查询授权状态", True, "GitHub已授权")
            else:
                self.log_test("查询授权状态", False, "授权状态不正确")
        else:
            self.log_test("查询授权状态", False, f"状态码: {check_response.status_code}")
        
        # 3. 获取授权日志
        logs_response = self.session.get(
            f"{self.base_url}/authorization/{self.test_user_id}/logs"
        )
        
        if logs_response.status_code == 200:
            self.log_test("获取授权日志", True, "成功获取授权日志")
        else:
            self.log_test("获取授权日志", False, f"状态码: {logs_response.status_code}")
        
        return True
    
    def test_credit_flow(self):
        """测试信用评分流程"""
        print("\n📊 测试信用评分流程")
        print("-" * 30)
        
        if not self.test_user_id or not self.test_token:
            self.log_test("信用评分流程", False, "没有可用的用户ID或Token")
            return False
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        # 1. 计算信用评分
        calc_response = self.session.post(
            f"{self.base_url}/credit/calculate",
            params={"force_refresh": "true"},
            headers=headers
        )
        
        if calc_response.status_code == 200:
            data = calc_response.json()
            score = data.get("score", {})
            total_score = score.get("total_score", 0)
            self.log_test("计算信用评分", True, f"评分: {total_score}")
        else:
            self.log_test("计算信用评分", False, f"状态码: {calc_response.status_code}")
        
        # 2. 获取信用评分
        get_score_response = self.session.get(
            f"{self.base_url}/credit/score",
            headers=headers
        )
        
        if get_score_response.status_code == 200:
            data = get_score_response.json()
            score = data.get("score", {})
            self.log_test("获取信用评分", True, f"评分: {score.get('total_score', 0)}")
        else:
            self.log_test("获取信用评分", False, f"状态码: {get_score_response.status_code}")
        
        # 3. 获取信用画像
        profile_response = self.session.get(
            f"{self.base_url}/credit/profile",
            headers=headers
        )
        
        if profile_response.status_code == 200:
            self.log_test("获取信用画像", True, "画像数据获取成功")
        elif profile_response.status_code == 404:
            self.log_test("获取信用画像", True, "画像不存在（正常情况）")
        else:
            self.log_test("获取信用画像", False, f"状态码: {profile_response.status_code}")
        
        # 4. 获取评分历史
        history_response = self.session.get(
            f"{self.base_url}/credit/history",
            params={"limit": 10},
            headers=headers
        )
        
        if history_response.status_code == 200:
            data = history_response.json()
            history = data if isinstance(data, list) else []
            self.log_test("获取评分历史", True, f"历史记录数: {len(history)}")
        else:
            self.log_test("获取评分历史", False, f"状态码: {history_response.status_code}")
        
        # 5. 获取数据源状态
        sources_response = self.session.get(
            f"{self.base_url}/credit/data_sources",
            headers=headers
        )
        
        if sources_response.status_code == 200:
            data = sources_response.json()
            sources = data.get("sources", [])
            self.log_test("获取数据源状态", True, f"数据源数量: {len(sources)}")
        else:
            self.log_test("获取数据源状态", False, f"状态码: {sources_response.status_code}")
        
        return True
    
    def test_sbt_flow(self):
        """测试SBT发放流程"""
        print("\n🎁 测试SBT发放流程")
        print("-" * 30)
        
        if not self.test_token:
            self.log_test("SBT发放流程", False, "没有可用的Token")
            return False
        
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        # 1. 获取SBT类型列表
        types_response = self.session.get(f"{self.base_url}/sbt/types")
        
        if types_response.status_code == 200:
            data = types_response.json()
            types = data.get("types", [])
            self.log_test("获取SBT类型列表", True, f"类型数量: {len(types)}")
        else:
            self.log_test("获取SBT类型列表", False, f"状态码: {types_response.status_code}")
        
        # 2. 获取符合条件的SBT
        eligible_response = self.session.get(
            f"{self.base_url}/sbt/eligible",
            headers=headers
        )
        
        if eligible_response.status_code == 200:
            data = eligible_response.json()
            types = data.get("types", [])
            self.log_test("获取符合条件的SBT", True, f"符合条件: {len(types)}个")
        else:
            self.log_test("获取符合条件的SBT", False, f"状态码: {eligible_response.status_code}")
        
        # 3. 自动发放SBT
        auto_issue_response = self.session.post(
            f"{self.base_url}/sbt/auto_issue",
            headers=headers
        )
        
        if auto_issue_response.status_code == 200:
            data = auto_issue_response.json()
            issued_sbts = data.get("issued_sbts", [])
            self.log_test("自动发放SBT", True, f"发放数量: {len(issued_sbts)}")
        else:
            self.log_test("自动发放SBT", False, f"状态码: {auto_issue_response.status_code}")
        
        # 4. 获取我的SBT
        my_sbts_response = self.session.get(
            f"{self.base_url}/sbt/my",
            headers=headers
        )
        
        if my_sbts_response.status_code == 200:
            data = my_sbts_response.json()
            count = data.get("count", 0)
            self.log_test("获取我的SBT", True, f"SBT数量: {count}")
        else:
            self.log_test("获取我的SBT", False, f"状态码: {my_sbts_response.status_code}")
        
        # 5. 获取发放统计
        stats_response = self.session.get(
            f"{self.base_url}/sbt/stats",
            headers=headers
        )
        
        if stats_response.status_code == 200:
            self.log_test("获取发放统计", True, "统计数据获取成功")
        else:
            self.log_test("获取发放统计", False, f"状态码: {stats_response.status_code}")
        
        # 6. 同步待确认交易
        sync_response = self.session.post(f"{self.base_url}/sbt/sync_pending")
        
        if sync_response.status_code == 200:
            data = sync_response.json()
            synced_count = data.get("synced_count", 0)
            self.log_test("同步待确认交易", True, f"同步数量: {synced_count}")
        else:
            self.log_test("同步待确认交易", False, f"状态码: {sync_response.status_code}")
        
        return True
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 CrediNet 完整系统集成测试（六模块）")
        print("=" * 60)
        
        # 检查服务健康状态
        if not self.test_service_health():
            print("❌ 服务未运行，请先启动服务: cargo run")
            return
        
        # 测试身份认证流程
        if not self.test_auth_flow():
            print("❌ 身份认证流程测试失败，跳过后续测试")
            return
        
        # 测试DID管理流程
        if not self.test_did_flow():
            print("❌ DID管理流程测试失败，跳过后续测试")
            return
        
        # 测试区块链注册流程
        self.test_blockchain_flow()
        
        # 测试身份验证与绑定流程
        self.test_identity_flow()
        
        # 测试用户授权管理流程
        self.test_authorization_flow()
        
        # 测试信用评分流程
        self.test_credit_flow()
        
        # 测试SBT发放流程
        self.test_sbt_flow()
        
        # 测试错误处理
        self.test_error_handling()
        
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
        with open("tests/integration/complete_test_report.json", "w", encoding="utf-8") as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        print(f"\n📄 详细测试报告已保存到: tests/integration/complete_test_report.json")
        
        # 显示系统状态
        print(f"\n🔧 系统状态")
        print(f"用户ID: {self.test_user_id}")
        print(f"DID: {self.test_did}")
        print(f"Token: {self.test_token[:20] if self.test_token else 'None'}...")

if __name__ == "__main__":
    tester = CompleteTester()
    tester.run_all_tests()
