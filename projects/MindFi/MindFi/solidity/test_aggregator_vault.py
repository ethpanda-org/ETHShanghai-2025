from web3 import Web3
from solcx import compile_source
import json
# 1232114214
# 连接到以太坊节点（通过 Infura 或 Alchemy）
infura_url = ""
w3 = Web3(Web3.HTTPProvider(infura_url))

# 连接到你的钱包
wallet_address = ""  # 替换为你的账户地址
private_key = ""  # 替换为你的私钥

# 合约 ABI 和地址
# contract_address = "0xc1781346ffb4b273d4f8472e5a2e416f6a392059"  # 替换为你的合约地址
address = ""
checksum_address = Web3.toChecksumAddress(address)
with open('./AggregatorVault.json') as f:  # 替换为你的 ABI 文件
    contract_abi = json.load(f)

# 获取合约实例
contract = w3.eth.contract(address=checksum_address, abi=contract_abi["abi"])

# 获取nonce（交易计数器）
nonce = w3.eth.getTransactionCount(wallet_address)

# ====== 用户充值 ======
def deposit(amount_in_ether):
    try:
        # 将金额转换为 wei
        amount_in_wei = w3.toWei(amount_in_ether, 'ether')

        # 创建交易
        transaction = contract.functions.deposit().buildTransaction({
            'from': wallet_address,
            'value': amount_in_wei,
            'gas': 200000,  # 设置适当的gas limit
            'gasPrice': w3.toWei('20', 'gwei'),  # 设置gas price
            'nonce': nonce,
        })

        # 签署交易
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

        # 发送交易
        txn_hash = w3.eth.sendRawTransaction(signed_txn.rawTransaction)
        print(f"Transaction hash: {txn_hash.hex()}")

        # 等待交易被确认
        receipt = w3.eth.waitForTransactionReceipt(txn_hash)
        print(f"Transaction receipt: {receipt}")
    except Exception as e:
        print(f"Error during deposit: {str(e)}")

# ====== 添加/激活/停用质押平台 ======
def add_strategy(name, strategy_address, logo_url, description):
    try:
        nonce_now = w3.eth.getTransactionCount(wallet_address)
        # 创建交易
        transaction = contract.functions.addStrategy(
            name,
            strategy_address,
            logo_url,
            description
        ).buildTransaction({
            'from': wallet_address,
            'gas': 400000,  # 增加gas limit
            'gasPrice': w3.toWei('20', 'gwei'),
            'nonce': nonce,
        })

        # 签署交易
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

        # 发送交易
        txn_hash = w3.eth.sendRawTransaction(signed_txn.rawTransaction)
        print(f"Transaction hash: {txn_hash.hex()}")

        # 等待交易被确认
        receipt = w3.eth.waitForTransactionReceipt(txn_hash)
        print(f"Transaction receipt: {receipt}")
    except Exception as e:
        print(f"Error during addStrategy: {str(e)}")

# ====== 切换策略激活状态 ======
def toggle_strategy_activation(strategy_address):
    try:
        # 创建交易
        transaction = contract.functions.toggleStrategyActivation(strategy_address).buildTransaction({
            'from': wallet_address,
            'gas': 200000,  # 设置适当的gas limit
            'gasPrice': w3.toWei('20', 'gwei'),  # 设置gas price
            'nonce': nonce,
        })

        # 签署交易
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

        # 发送交易
        txn_hash = w3.eth.sendRawTransaction(signed_txn.rawTransaction)
        print(f"Transaction hash: {txn_hash.hex()}")

        # 等待交易被确认
        receipt = w3.eth.waitForTransactionReceipt(txn_hash)
        print(f"Transaction receipt: {receipt}")
    except Exception as e:
        print(f"Error during toggleStrategyActivation: {str(e)}")

# ====== 查询平台信息 ======
def get_strategy_info(strategy_addr):
    try:
        # 调用合约查询单个平台信息
        strategy_info = contract.functions.getStrategyInfo(strategy_addr).call()
        print(f"Strategy Info: {strategy_info}")
    except Exception as e:
        print(f"Error during getStrategyInfo: {str(e)}")

# ====== 查询所有平台信息 ======
def get_all_strategies():
    try:
        # 调用合约查询所有平台信息
        strategies = contract.functions.getAllStrategies().call()
        print("All strategies:")
        for i in range(len(strategies[0])):  # 获取策略数量
            print(f"Name: {strategies[0][i]}, Address: {strategies[1][i]}, Active: {strategies[2][i]}")
            print(f"Logo URL: {strategies[3][i]}, Description: {strategies[4][i]}, Added At: {strategies[5][i]}")
    except Exception as e:
        print(f"Error during getAllStrategies: {str(e)}")

# ====== 质押分发：将用户资金分发到各个平台 ======
def delegate_stake(user_address, strategy_address, amount_in_ether):
    try:
        # 将金额转换为 wei
        amount_in_wei = w3.toWei(amount_in_ether, 'ether')

        # 创建交易
        transaction = contract.functions.delegateStake(user_address, strategy_address, amount_in_wei).buildTransaction({
            'from': wallet_address,
            'gas': 200000,  # 设置适当的gas limit
            'gasPrice': w3.toWei('20', 'gwei'),  # 设置gas price
            'nonce': nonce,
        })

        # 签署交易
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

        # 发送交易
        txn_hash = w3.eth.sendRawTransaction(signed_txn.rawTransaction)
        print(f"Transaction hash: {txn_hash.hex()}")

        # 等待交易被确认
        receipt = w3.eth.waitForTransactionReceipt(txn_hash)
        print(f"Transaction receipt: {receipt}")
    except Exception as e:
        print(f"Error during delegateStake: {str(e)}")

# ====== 提取资金：从外部平台提取资金 ======
def withdraw(strategy_address, amount_in_ether):
    try:
        # 将金额转换为 wei
        amount_in_wei = w3.toWei(amount_in_ether, 'ether')

        # 创建交易
        transaction = contract.functions.withdraw(strategy_address, amount_in_wei).buildTransaction({
            'from': wallet_address,
            'gas': 200000,  # 设置适当的gas limit
            'gasPrice': w3.toWei('20', 'gwei'),  # 设置gas price
            'nonce': nonce,
        })

        # 签署交易
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

        # 发送交易
        txn_hash = w3.eth.sendRawTransaction(signed_txn.rawTransaction)
        print(f"Transaction hash: {txn_hash.hex()}")

        # 等待交易被确认
        receipt = w3.eth.waitForTransactionReceipt(txn_hash)
        print(f"Transaction receipt: {receipt}")
    except Exception as e:
        print(f"Error during withdraw: {str(e)}")


def get_user_balance(user_address):
    try:
        # 调用合约的 `getUserBalance` 函数
        balance = contract.functions.getUserBalance(user_address).call()
        print(f"User balance: {balance} wei")
        # 转换为 ETH 单位
        balance_in_eth = w3.fromWei(balance, 'ether')
        print(f"User balance: {balance_in_eth} ETH")
    except Exception as e:
        print(f"Error during getUserBalance: {str(e)}")


# ====== 领取奖励：领取在平台上的收益 ======
def claim(strategy_address):
    try:
        # 创建交易
        transaction = contract.functions.claim(strategy_address).buildTransaction({
            'from': wallet_address,
            'gas': 200000,  # 设置适当的gas limit
            'gasPrice': w3.toWei('20', 'gwei'),  # 设置gas price
            'nonce': nonce,
        })

        # 签署交易
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

        # 发送交易
        txn_hash = w3.eth.sendRawTransaction(signed_txn.rawTransaction)
        print(f"Transaction hash: {txn_hash.hex()}")

        # 等待交易被确认
        receipt = w3.eth.waitForTransactionReceipt(txn_hash)
        print(f"Transaction receipt: {receipt}")
    except Exception as e:
        print(f"Error during claim: {str(e)}")

# ====== 从池子中提现到钱包 ======
def withdraw_to_wallet(amount_in_ether):
    try:
        # 将金额转换为 wei
        amount_in_wei = w3.toWei(amount_in_ether, 'ether')

        # 创建交易
        transaction = contract.functions.withdrawToWallet(amount_in_wei).buildTransaction({
            'from': wallet_address,
            'gas': 200000,  # 设置适当的gas limit
            'gasPrice': w3.toWei('20', 'gwei'),  # 设置gas price
            'nonce': nonce,
        })

        # 签署交易
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

        # 发送交易
        txn_hash = w3.eth.sendRawTransaction(signed_txn.rawTransaction)
        print(f"Transaction hash: {txn_hash.hex()}")

        # 等待交易被确认
        receipt = w3.eth.waitForTransactionReceipt(txn_hash)
        print(f"Transaction receipt: {receipt}")
    except Exception as e:
        print(f"Error during withdrawToWallet: {str(e)}")

# ====== 执行所有操作 ======
t_address = "0x65Fdf6DBd9b24c6e77601929844E9245ff108FC1"
# 调用不同函数进行操作
# deposit(0.1)  # 存款 0.1 ETH
get_user_balance(wallet_address)
# add_strategy("MindFiTwo", t_address, "https://remix.ethereum.org/assets/img/remixai-logoDefault.webp", "High-yield and high-return projects")
# toggle_strategy_activation(t_address)  # 切换策略状态
# get_strategy_info(t_address)
# get_all_strategies()
# delegate_stake(wallet_address, t_address, 0.1)
# withdraw(t_address, 0.1)
# claim(t_address)
# withdraw_to_wallet(0.18)  # 提现 0.05 ETH