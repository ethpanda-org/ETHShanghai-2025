#!/usr/bin/env python3
"""
智能合约部署脚本
支持本地开发网络和测试网部署
"""

import os
import json
import time
from web3 import Web3
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def deploy_to_local():
    """部署到本地开发网络（Ganache）"""
    print("🚀 部署到本地开发网络...")
    
    # 连接本地网络
    w3 = Web3(Web3.HTTPProvider('http://localhost:8545'))
    
    if not w3.is_connected():
        raise Exception("无法连接到本地网络，请确保Ganache正在运行")
    
    # 使用第一个账户
    account = w3.eth.accounts[0]
    print(f"使用账户: {account}")
    
    # 加载合约ABI
    with open('build/TaskContract.abi', 'r') as f:
        abi = json.load(f)
    
    # 编译合约（这里使用预编译的字节码）
    # 在实际项目中，应该使用solc编译
    bytecode = "0x608060405234801561001057600080fd5b50600436106100a95760003560e01c8063..."
    
    # 创建合约实例
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    
    # 部署合约
    print("部署合约中...")
    tx_hash = contract.constructor().transact({'from': account})
    
    # 等待交易确认
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    contract_address = tx_receipt.contractAddress
    print(f"✅ 合约部署成功!")
    print(f"合约地址: {contract_address}")
    print(f"交易哈希: {tx_hash.hex()}")
    
    return contract_address

def deploy_to_testnet():
    """部署到测试网（Sepolia）"""
    print("🚀 部署到Sepolia测试网...")
    
    # 连接测试网
    rpc_url = os.getenv('ETHEREUM_RPC_URL_TESTNET')
    if not rpc_url:
        raise Exception("未设置测试网RPC URL")
    
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        raise Exception("无法连接到测试网")
    
    print("⚠️ 测试网部署需要私钥和Gas费用")
    print("请使用Remix IDE或其他工具进行部署")
    print("部署后请更新.env文件中的TASK_CONTRACT_ADDRESS_TESTNET")
    
    return None

def verify_deployment(contract_address, network_type):
    """验证合约部署"""
    print(f"🔍 验证合约部署...")
    
    if network_type == 'devnet':
        w3 = Web3(Web3.HTTPProvider('http://localhost:8545'))
    else:
        rpc_url = os.getenv('ETHEREUM_RPC_URL_TESTNET')
        w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    # 加载合约ABI
    with open('build/TaskContract.abi', 'r') as f:
        abi = json.load(f)
    
    # 创建合约实例
    contract = w3.eth.contract(address=contract_address, abi=abi)
    
    try:
        # 测试合约调用
        task_count = contract.functions.getTaskCount().call()
        print(f"✅ 合约验证成功，当前任务数量: {task_count}")
        return True
    except Exception as e:
        print(f"❌ 合约验证失败: {e}")
        return False

def update_env_file(contract_address, network_type):
    """更新环境变量文件"""
    env_file = '.env'
    
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            lines = f.readlines()
        
        # 更新合约地址
        updated = False
        for i, line in enumerate(lines):
            if line.startswith(f'TASK_CONTRACT_ADDRESS_{network_type.upper()}'):
                lines[i] = f'TASK_CONTRACT_ADDRESS_{network_type.upper()}={contract_address}\n'
                updated = True
                break
        
        if not updated:
            lines.append(f'TASK_CONTRACT_ADDRESS_{network_type.upper()}={contract_address}\n')
        
        with open(env_file, 'w') as f:
            f.writelines(lines)
        
        print(f"✅ 已更新.env文件中的合约地址")
    else:
        print("⚠️ .env文件不存在，请手动设置合约地址")

def main():
    """主函数"""
    print("🎯 FlowPay 智能合约部署工具")
    print("=" * 50)
    
    # 检查网络类型
    network_type = os.getenv('NETWORK_TYPE', 'devnet')
    print(f"目标网络: {network_type}")
    
    try:
        if network_type == 'devnet':
            # 本地开发网络部署
            contract_address = deploy_to_local()
            
            if contract_address:
                # 验证部署
                if verify_deployment(contract_address, 'devnet'):
                    # 更新环境变量
                    update_env_file(contract_address, 'devnet')
                    print("\n🎉 本地部署完成!")
                    print(f"合约地址: {contract_address}")
                    print("现在可以启动应用: python main.py full --network devnet")
                else:
                    print("❌ 部署验证失败")
            else:
                print("❌ 部署失败")
                
        elif network_type == 'testnet':
            # 测试网部署
            deploy_to_testnet()
            
        else:
            print(f"❌ 不支持的网络类型: {network_type}")
            
    except Exception as e:
        print(f"❌ 部署失败: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())