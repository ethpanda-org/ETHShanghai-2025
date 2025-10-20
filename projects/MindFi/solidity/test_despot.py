from web3 import Web3
from decimal import Decimal

# 连接到以太坊节点（通过 Infura 或 Alchemy）
infura_url = ""
web3 = Web3(Web3.HTTPProvider(infura_url))

# 检查连接是否成功
if web3.isConnected():
    print("Connected to Ethereum network")
else:
    print("Failed to connect to Ethereum network")

# 设置钱包私钥和地址
private_key = ""  # 不要公开这个私钥
wallet_address = web3.eth.account.privateKeyToAccount(private_key).address

# 合约地址和 ABI
contract_address = ""
contract_abi = [
    # 合约 ABI 在这里
    {
        "constant": False,
        "inputs": [{"name": "amount", "type": "uint256"}],
        "name": "deposit",
        "outputs": [],
        "payable": True,
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "getDepositBalance",
        "outputs": [{"name": "", "type": "uint256"}],
        "payable": False,
        "stateMutability": "view",
        "type": "function"
    },
    # 添加合约的其他函数和事件
]

# 创建合约实例
contract = web3.eth.contract(address=contract_address, abi=contract_abi)

# 查询用户的存款余额
def get_deposit_balance():
    balance = contract.functions.getDepositBalance().call({'from': wallet_address})
    print(f"Deposit Balance: {balance} wei")

# 存钱到合约池（发送 1 ETH）
def deposit(amount_in_ether):
    # 将 ETH 转换为 wei
    amount_in_wei = web3.toWei(amount_in_ether, 'ether')
    print(amount_in_wei)
    # 构建交易字典
    transaction = {
        'to': contract_address,
        'from': wallet_address,
        'value': amount_in_wei,  # 发送的以太币
        'gas': 2000000,  # 可根据实际情况调整
        'gasPrice': web3.toWei('20', 'gwei'),  # 可根据网络状态调整
        'nonce': web3.eth.getTransactionCount(wallet_address),
    }

    # 签名交易
    signed_transaction = web3.eth.account.signTransaction(transaction, private_key)

    # 发送交易
    tx_hash = web3.eth.sendRawTransaction(signed_transaction.rawTransaction)

    print(f"Transaction sent. Tx hash: {web3.toHex(tx_hash)}")
    return web3.toHex(tx_hash)

# 从合约池中取钱
def withdraw(amount_in_ether):
    # 将 ETH 转换为 wei
    amount_in_wei = web3.toWei(amount_in_ether, 'ether')

    # 构建交易字典
    transaction = {
        'to': contract_address,
        'from': wallet_address,
        'gas': 2000000,
        'gasPrice': web3.toWei('20', 'gwei'),
        'nonce': web3.eth.getTransactionCount(wallet_address),
    }

    # 签名交易
    signed_transaction = web3.eth.account.signTransaction(transaction, private_key)

    # 发送交易
    tx_hash = web3.eth.sendRawTransaction(signed_transaction.rawTransaction)

    print(f"Transaction sent. Tx hash: {web3.toHex(tx_hash)}")
    return web3.toHex(tx_hash)

# 示例：查询存款余额
# get_deposit_balance()

# # 示例：存款 1 ETH
deposit(0.1)
get_deposit_balance()
# # 示例：取款 0.5 ETH
# withdraw(0.01)
