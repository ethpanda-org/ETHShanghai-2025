#!/usr/bin/env python3
"""
智能合约部署脚本
使用 Python Web3 编译和部署 TaskContract 到 Ganache 网络
"""

import os
import sys
import json
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv
from solcx import compile_source, install_solc

def load_environment():
    """加载环境变量"""
    load_dotenv()
    
    # 检查必要的环境变量
    required_vars = ['ETHEREUM_RPC_URL_DEVNET']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ 缺少环境变量: {', '.join(missing_vars)}")
        return False
    
    return True

def compile_contract():
    """编译智能合约"""
    print("�� 编译智能合约...")
    
    contract_file = Path("contracts/TaskContract.sol")
    if not contract_file.exists():
        print("❌ 合约文件不存在: contracts/TaskContract.sol")
        return None, None
    
    try:
        # 安装 Solidity 编译器
        print("📦 安装 Solidity 编译器...")
        install_solc('0.8.19')
        
        # 读取合约源码
        with open(contract_file, 'r') as f:
            source_code = f.read()
        
        # 编译合约
        print("🔧 编译合约源码...")
        compiled_sol = compile_source(
            source_code,
            solc_version='0.8.19',
            optimize=True,
            optimize_runs=200,
            # viaIR=True  # 0.8.19 不支持
        )
        
        # 获取合约
        contract_interface = compiled_sol['<stdin>:TaskContract']
        
        print("✅ 合约编译成功")
        # 保存 ABI 和 BIN 文件到 build 目录
        os.makedirs("build", exist_ok=True)
        with open("build/TaskContract.abi", "w") as f:
            json.dump(contract_interface["abi"], f, indent=2)
        with open("build/TaskContract.bin", "w") as f:
            f.write(contract_interface["bin"])
        print("📁 ABI 和 BIN 文件已保存到 build/ 目录")
        bytecode = contract_interface['bin']
        if not bytecode.startswith("0x"):
            bytecode = "0x" + bytecode
        return contract_interface['abi'], bytecode
        
    except Exception as e:
        print(f"❌ 合约编译失败: {e}")
        return None, None

def deploy_contract(abi, bytecode):
    """部署合约到区块链"""
    print("🚀 部署合约到区块链...")

    print("abi:", abi);
    print("bytecode:", bytecode);

    # 连接网络
    rpc_url = os.getenv('ETHEREUM_RPC_URL_DEVNET')
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        print("❌ 无法连接到区块链网络")
        return None
    
    print(f"✅ 已连接到网络: {rpc_url}")
    
    # 直接使用 Ganache 的第一个账户
    first_account = w3.eth.accounts[0]
    print(f"📝 使用账户: {first_account}")
    
    # 检查余额
    balance = w3.eth.get_balance(first_account)
    balance_eth = w3.from_wei(balance, 'ether')
    print(f"💰 账户余额: {balance_eth:.4f} ETH")
    
    if balance < w3.to_wei(0.01, 'ether'):
        print("⚠️ 账户余额较低，可能无法支付Gas费用")
    
    try:
        # 创建合约实例
        contract = w3.eth.contract(abi=abi, bytecode=bytecode)
        
        # 构建部署交易
        constructor_tx = contract.constructor().build_transaction({
            'from': first_account,
            'gas': 5000000,  # 增加gas限制
            'gasPrice': w3.to_wei(1, 'gwei'),  # 降低gas价格
            'nonce': w3.eth.get_transaction_count(first_account),
        })
        
        # 使用 Ganache 的自动签名功能
        signed_txn = constructor_tx
        
        # 发送交易
        tx_hash = w3.eth.send_transaction(signed_txn)
        print(f"📤 交易已发送: {tx_hash.hex()}")
        
        # 等待交易确认
        print("⏳ 等待交易确认...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if tx_receipt.status == 1:
            contract_address = tx_receipt.contractAddress
            print(f"✅ 合约部署成功!")
            print(f"�� 合约地址: {contract_address}")
            print(f"⛽ Gas使用: {tx_receipt.gasUsed}")
            return contract_address
        else:
            print("❌ 合约部署失败")
            return None
            
    except Exception as e:
        print(f"❌ 部署过程中出错: {e}")
        return None

def update_env_file(contract_address):
    """更新 .env 文件中的合约地址"""
    print("📝 更新环境配置...")
    
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env 文件不存在")
        return False
    
    try:
        # 读取现有内容
        with open(env_file, 'r') as f:
            lines = f.readlines()
        
        # 更新或添加合约地址
        updated = False
        for i, line in enumerate(lines):
            if line.startswith('TASK_CONTRACT_ADDRESS_LOCAL='):
                lines[i] = f'TASK_CONTRACT_ADDRESS_LOCAL={contract_address}\n'
                updated = True
                break
        
        if not updated:
            lines.append(f'TASK_CONTRACT_ADDRESS_LOCAL={contract_address}\n')
        
        # 写回文件
        with open(env_file, 'w') as f:
            f.writelines(lines)
        
        print("✅ 环境配置已更新")
        return True
        
    except Exception as e:
        print(f"❌ 更新环境配置失败: {e}")
        return False

def main():
    """主函数"""
    print("🚀 FlowAI 智能合约部署脚本 (使用 Python Web3)")
    print("=" * 50)
    
    # 加载环境变量
    if not load_environment():
        return False
    
    # 编译合约
    abi, bytecode = compile_contract()
    if not abi or not bytecode:
        return False
    
    # 部署合约
    contract_address = deploy_contract(abi, bytecode)
    if not contract_address:
        return False
    
    # 更新环境配置
    if update_env_file(contract_address):
        print("\n🎉 部署完成!")
        print(f"📍 合约地址: {contract_address}")
        print("📝 请重启应用以使用新部署的合约")
        return True
    else:
        print("⚠️ 合约部署成功，但环境配置更新失败")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
