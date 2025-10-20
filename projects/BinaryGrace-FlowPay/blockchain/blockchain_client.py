import os
import json
import time
from typing import Dict, List, Optional, Any, Union
from web3 import Web3
from web3.middleware import geth_poa_middleware
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class BlockchainClient:
    """区块链客户端 - 处理与以太坊网络的交互"""
    
    def __init__(self):
        self.network_type = self._determine_network_type()
        self.w3 = None
        self.contract = None
        self.contract_address = None
        self.account = None
        
        self._initialize_web3()
        self._load_contract()
    
    def _determine_network_type(self) -> str:
        """确定网络类型"""
        network_type = os.getenv('NETWORK_TYPE', 'testnet')
        print(f"BlockchainClient._determine_network_type: NETWORK_TYPE = '{network_type}'")
        return network_type
    
    def _initialize_web3(self):
        """初始化Web3连接"""
        try:
            if self.network_type == 'devnet':
                # 本地开发网络 (Ganache)
                rpc_url = os.getenv('ETHEREUM_RPC_URL_DEVNET', 'http://localhost:8545')
                self.w3 = Web3(Web3.HTTPProvider(rpc_url))
                
                # 添加POA中间件（Ganache使用POA共识）
                self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                
                # 使用默认账户
                if self.w3.eth.accounts:
                    self.account = self.w3.eth.accounts[0]
                    print(f"🔗 连接到本地开发网络: {rpc_url}")
                    print(f"👤 使用账户: {self.account}")
                else:
                    raise Exception("本地网络中没有可用账户")
                    
            elif self.network_type == 'testnet':
                # Sepolia 测试网
                rpc_url = os.getenv('ETHEREUM_RPC_URL_TESTNET', 'https://sepolia.infura.io/v3/0d48f0a19ad547fe80bb8315505eaa70')
                self.w3 = Web3(Web3.HTTPProvider(rpc_url))
                print(f"🔗 连接到Sepolia测试网: {rpc_url}")
                
            elif self.network_type == 'mainnet':
                # 以太坊主网
                rpc_url = os.getenv('ETHEREUM_RPC_URL_MAINNET', 'https://mainnet.infura.io/v3/0d48f0a19ad547fe80bb8315505eaa70')
                self.w3 = Web3(Web3.HTTPProvider(rpc_url))
                print(f"🔗 连接到以太坊主网: {rpc_url}")
            
            # 检查连接
            if not self.w3.is_connected():
                raise Exception(f"无法连接到网络: {self.network_type}")
                
            print(f"✅ Web3连接成功，网络类型: {self.network_type}")
            
        except Exception as e:
            print(f"❌ 初始化Web3失败: {e}")
            raise
    
    def _load_contract(self):
        """加载智能合约"""
        try:
            # 根据网络类型选择合约地址
            if self.network_type == 'devnet':
                self.contract_address = os.getenv('TASK_CONTRACT_ADDRESS_LOCAL')
            elif self.network_type == 'testnet':
                self.contract_address = os.getenv('TASK_CONTRACT_ADDRESS_TESTNET')
            elif self.network_type == 'mainnet':
                self.contract_address = os.getenv('TASK_CONTRACT_ADDRESS_MAINNET')
            
            if not self.contract_address:
                raise Exception(f"未找到 {self.network_type} 网络的合约地址")
            
            # 加载合约ABI
            abi_path = 'build/TaskContract.abi'
            if not os.path.exists(abi_path):
                raise Exception(f"合约ABI文件不存在: {abi_path}")
            
            with open(abi_path, 'r') as f:
                contract_abi = json.load(f)
            
            # 创建合约实例（使用checksum地址）
            checksum_address = self.w3.to_checksum_address(self.contract_address)
            self.contract = self.w3.eth.contract(
                address=checksum_address,
                abi=contract_abi
            )
            
            print(f"✅ 合约加载成功: {self.contract_address}")
            
        except Exception as e:
            print(f"❌ 加载合约失败: {e}")
            raise
    
    def get_balance(self, address: str) -> int:
        """获取账户余额"""
        try:
            balance_wei = self.w3.eth.get_balance(address)
            return balance_wei
        except Exception as e:
            print(f"❌ 获取余额失败: {e}")
            return 0
    
    def publish_task(self, title: str, description: str, deadline: int, 
                     task_type: str, requirements: str, reward: int, 
                     publisher_address: str, gas_limit: Optional[int] = None, 
                     gas_price: Optional[int] = None) -> Union[bool, Dict]:
        """发布任务到区块链"""
        try:
            print(f"📝 发布任务: {title}")
            
            # 构建交易参数
            if self.network_type == 'devnet':
                # 本地网络直接发送交易
                tx_hash = self.contract.functions.publishTask(
                    title, description, deadline, task_type, requirements, reward
                ).transact({
                    'from': self.account,
                    'gas': gas_limit or 500000,
                    'gasPrice': gas_price or self.w3.eth.gas_price
                })
                
                # 等待交易确认
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
                
                if receipt.status == 1:
                    print(f"✅ 任务发布成功，交易哈希: {tx_hash.hex()}")
                    return True
                else:
                    print(f"❌ 交易失败")
                    return False
                    
            else:
                # 测试网/主网需要前端签名
                transaction = self.contract.functions.publishTask(
                    title, description, deadline, task_type, requirements, reward
                ).build_transaction({
                    'from': publisher_address,
                    'gas': gas_limit or 500000,
                    'gasPrice': gas_price or self.w3.eth.gas_price,
                    'nonce': self.w3.eth.get_transaction_count(publisher_address)
                })
                
                return {
                    'status': 'pending_signature',
                    'transaction': transaction,
                    'sender_address': publisher_address
                }
                
        except Exception as e:
            print(f"❌ 发布任务失败: {e}")
            return False
    
    def get_available_tasks(self) -> List[int]:
        """获取可用任务ID列表"""
        try:
            # 调用合约的只读函数
            task_count = self.contract.functions.getTaskCount().call()
            available_tasks = []
            
            for i in range(task_count):
                task_id = i + 1
                task_data = self.contract.functions.getTask(task_id).call()
                
                # 检查任务是否已完成
                if not task_data[6]:  # isCompleted 字段
                    available_tasks.append(task_id)
            
            print(f"📋 找到 {len(available_tasks)} 个可用任务")
            return available_tasks
            
        except Exception as e:
            print(f"❌ 获取可用任务失败: {e}")
            return []
    
    def get_task(self, task_id: int) -> Optional[Dict]:
        """获取任务详情"""
        try:
            task_data = self.contract.functions.getTask(task_id).call()
            
            return {
                'id': task_id,
                'title': task_data[0],
                'description': task_data[1],
                'deadline': task_data[2],
                'taskType': task_data[3],
                'requirements': task_data[4],
                'reward': task_data[5],
                'isCompleted': task_data[6],
                'publisher': task_data[7]
            }
            
        except Exception as e:
            print(f"❌ 获取任务详情失败: {e}")
            return None
    
    def get_executions(self, task_id: int) -> List[Dict]:
        """获取任务的执行记录"""
        try:
            execution_count = self.contract.functions.getExecutionCount(task_id).call()
            executions = []
            
            for i in range(execution_count):
                execution_data = self.contract.functions.getExecution(task_id, i).call()
                executions.append({
                    'executor': execution_data[0],
                    'result': execution_data[1],
                    'executedAt': execution_data[2],
                    'isWinner': execution_data[3]
                })
            
            return executions
            
        except Exception as e:
            print(f"❌ 获取执行记录失败: {e}")
            return []
    
    def submit_execution(self, task_id: int, executor_address: str, result: str,
                        gas_limit: Optional[int] = None, gas_price: Optional[int] = None) -> Union[bool, Dict]:
        """提交任务执行结果"""
        try:
            print(f"📤 提交执行结果: 任务 {task_id}")
            
            if self.network_type == 'devnet':
                # 本地网络直接发送交易
                tx_hash = self.contract.functions.submitExecution(task_id, result).transact({
                    'from': self.account,
                    'gas': gas_limit or 300000,
                    'gasPrice': gas_price or self.w3.eth.gas_price
                })
                
                # 等待交易确认
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
                
                if receipt.status == 1:
                    print(f"✅ 执行结果提交成功，交易哈希: {tx_hash.hex()}")
                    return True
                else:
                    print(f"❌ 交易失败")
                    return False
                    
            else:
                # 测试网/主网需要前端签名
                transaction = self.contract.functions.submitExecution(task_id, result).build_transaction({
                    'from': executor_address,
                    'gas': gas_limit or 300000,
                    'gasPrice': gas_price or self.w3.eth.gas_price,
                    'nonce': self.w3.eth.get_transaction_count(executor_address)
                })
                
                return {
                    'status': 'pending_signature',
                    'transaction': transaction,
                    'sender_address': executor_address
                }
                
        except Exception as e:
            print(f"❌ 提交执行结果失败: {e}")
            return False
    
    def select_winner_and_pay(self, task_id: int, execution_index: int, 
                            publisher_address: str, reward_amount: int,
                            gas_limit: Optional[int] = None, gas_price: Optional[int] = None) -> Union[bool, Dict]:
        """选择获胜者并支付奖励"""
        try:
            print(f"🏆 选择获胜者: 任务 {task_id}, 执行记录 {execution_index}")
            
            if self.network_type == 'devnet':
                # 本地网络直接发送交易
                tx_hash = self.contract.functions.selectWinnerAndPay(task_id, execution_index).transact({
                    'from': self.account,
                    'gas': gas_limit or 400000,
                    'gasPrice': gas_price or self.w3.eth.gas_price,
                    'value': reward_amount  # 发送奖励金额
                })
                
                # 等待交易确认
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
                
                if receipt.status == 1:
                    print(f"✅ 获胜者选择成功，交易哈希: {tx_hash.hex()}")
                    return True
                else:
                    print(f"❌ 交易失败")
                    return False
                    
            else:
                # 测试网/主网需要前端签名
                transaction = self.contract.functions.selectWinnerAndPay(task_id, execution_index).build_transaction({
                    'from': publisher_address,
                    'gas': gas_limit or 400000,
                    'gasPrice': gas_price or self.w3.eth.gas_price,
                    'value': reward_amount,  # 发送奖励金额
                    'nonce': self.w3.eth.get_transaction_count(publisher_address)
                })
                
                return {
                    'status': 'pending_signature',
                    'transaction': transaction,
                    'sender_address': publisher_address
                }
                
        except Exception as e:
            print(f"❌ 选择获胜者失败: {e}")
            return False
    
    def estimate_gas_for_publish(self) -> int:
        """估算发布任务的Gas消耗"""
        try:
            # 使用默认参数估算
            gas_estimate = self.contract.functions.publishTask(
                "Test Title", "Test Description", int(time.time()) + 3600,
                "Test Type", "Test Requirements", 1000000000000000000
            ).estimate_gas()
            
            return gas_estimate
            
        except Exception as e:
            print(f"❌ 估算Gas失败: {e}")
            return 500000  # 返回默认值
    
    def estimate_gas_for_execution(self) -> int:
        """估算执行任务的Gas消耗"""
        try:
            # 使用默认参数估算
            gas_estimate = self.contract.functions.submitExecution(
                1, "Test Result"
            ).estimate_gas()
            
            return gas_estimate
            
        except Exception as e:
            print(f"❌ 估算Gas失败: {e}")
            return 300000  # 返回默认值
    
    def estimate_gas_for_payment(self) -> int:
        """估算支付奖励的Gas消耗"""
        try:
            # 使用默认参数估算
            gas_estimate = self.contract.functions.selectWinnerAndPay(
                1, 0
            ).estimate_gas()
            
            return gas_estimate
            
        except Exception as e:
            print(f"❌ 估算Gas失败: {e}")
            return 400000  # 返回默认值