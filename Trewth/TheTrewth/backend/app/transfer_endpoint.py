import json
import os
from flask import Blueprint, request, jsonify
from web3 import Web3
from Websocket import config
import requests
import time
from web3.middleware import ExtraDataToPOAMiddleware

tx_transfer = Blueprint('tx_transfer', __name__)

# 环境配置
RPC_URL = config.RPC_URL
ROUTER_ADDRESS = Web3.to_checksum_address(config.ENENT_ROUTER_ADDRESS)
CHAIN_ID = 40444

w3 = Web3(Web3.HTTPProvider(RPC_URL))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
ROUTER_ABI = json.load(open("./EventTokenRouter.json"))["abi"]

router_contract = w3.eth.contract(address=ROUTER_ADDRESS, abi=ROUTER_ABI)


def _require(cond, msg):
    if not cond:
        raise ValueError(msg)


@tx_transfer.route('/demo', methods=['POST'])
def demo():
    data = request.get_json()
    print(data)
    return jsonify({"ok": True, "msg": "This is a demo endpoint"})


@tx_transfer.route('/token_launch', methods=['POST'])
def token_launch():
    try:
        body = request.get_json(force=True)

        print("=== 接收到的参数 ===")
        for key, value in body.items():
            print(f"{key}: {value}")

        # 参数获取 - 强制使用 eventTime = 0（与forge脚本一致）
        fullname = body.get("fullname", "Test Event")
        ticker = body.get("ticker", "TEST")
        geoTag = body.get("geoTag", "Global")
        weatherTag = body.get("weatherTag", "Clear")
        eventTypes = body.get("eventTypes", ["General"])
        eventDescription = body.get("eventDescription", "Test event description")
        supplementLink = body.get("supplementLink", "https://example.com")

        # 关键修改：强制使用 eventTime = 0
        eventTime = 0

        fee = int(body.get("fee", 3000))
        tokensPerNativeE18 = int(float(body.get("tokensPerNativeE18", 10000 * 10 ** 18)))
        native_liquidity_wei = int(body.get("nativeLiquidityWei", 10 ** 18))
        user_address_raw = body.get("walletAddress")

        # 验证用户地址
        user_address = Web3.to_checksum_address(user_address_raw)

        # 构建元组
        meta_tuple = (
            str(geoTag), str(weatherTag), list(eventTypes),
            str(eventDescription), str(supplementLink), int(eventTime)
        )

        print(f"=== 强制使用 eventTime = 0 ===")
        print(f"事件时间: {eventTime} (强制为0，与Forge脚本一致)")
        print(f"费率: {fee}")
        print(f"代币比例: {tokensPerNativeE18}")
        print(f"流动性: {native_liquidity_wei} wei")

        # 检查基本条件
        valid_fees = [100, 500, 3000, 10000]
        if fee not in valid_fees:
            return jsonify({
                "ok": False,
                "error": f"费率必须是 {valid_fees} 之一",
                "current_fee": fee
            }), 400

        # 检查用户余额
        user_balance = w3.eth.get_balance(user_address)
        if user_balance < native_liquidity_wei:
            return jsonify({
                "ok": False,
                "error": f"用户余额不足",
                "required": native_liquidity_wei,
                "current": user_balance
            }), 400

        # 构建函数调用
        fn = router_contract.functions.createTokenAndPool(
            fullname, ticker, meta_tuple, fee, tokensPerNativeE18
        )

        # 尝试模拟调用
        try:
            print("=== 尝试模拟调用 (eventTime=0) ===")
            result = fn.call({
                'from': user_address,
                'value': native_liquidity_wei,
                'gas': 10000000
            })
            print(f"✅ 模拟调用成功，返回: {result}")
        except Exception as e:
            error_msg = str(e)
            print(f"❌ 模拟调用失败: {error_msg}")

            return jsonify({
                "ok": False,
                "error": "合约执行失败 (即使eventTime=0)",
                "suggestions": [
                    "检查代币比例是否合理",
                    "尝试更小的流动性金额",
                    "确认所有字符串参数格式正确",
                    "运行 /tx_transfer/debug_contract_call 获取详细诊断"
                ],
                "debug_info": {
                    "event_time": 0,
                    "fee_valid": fee in valid_fees,
                    "tokens_valid": tokensPerNativeE18 > 0,
                    "liquidity_valid": native_liquidity_wei > 0
                }
            }), 400

        # 构建交易
        print("=== 构建交易 ===")
        nonce = w3.eth.get_transaction_count(user_address)
        gas_price = w3.eth.gas_price

        try:
            estimated_gas = fn.estimate_gas({
                'from': user_address,
                'value': native_liquidity_wei
            })
            gas_limit = int(estimated_gas * 1.5)
            print(f"✅ Gas估算: {estimated_gas}, 使用: {gas_limit}")
        except Exception as e:
            print(f"⚠️ Gas估算失败: {e}, 使用默认值")
            gas_limit = 5000000

        transaction_data = fn.build_transaction({
            'from': user_address,
            'value': native_liquidity_wei,
            'gas': gas_limit,
            'gasPrice': gas_price,
            'nonce': nonce,
            'chainId': CHAIN_ID
        })

        tx_for_frontend = {
            "to": ROUTER_ADDRESS,
            "from": user_address,
            "value": hex(transaction_data['value']),
            "data": transaction_data['data'],
            "chainId": CHAIN_ID,
            "gas": hex(transaction_data['gas']),
            "nonce": hex(transaction_data['nonce']),
            "gasPrice": hex(transaction_data['gasPrice'])
        }

        print("=== 交易构建完成 ===")

        return jsonify({
            "ok": True,
            "tx": tx_for_frontend,
            "explanation": "前端用钱包签名发送 (eventTime=0)",
            "debug_info": {
                "gas_limit": gas_limit,
                "value_eth": native_liquidity_wei / 10 ** 18,
                "event_time_setting": "0 (与Forge脚本一致)"
            }
        })

    except Exception as e:
        print(f"❌ token_launch 错误: {e}")
        import traceback
        traceback.print_exc()

        return jsonify({
            "ok": False,
            "error": str(e)
        }), 400


@tx_transfer.route('/token_launch_bak', methods=['POST'])
def token_launch_bak():
    try:
        body = request.get_json(force=True)

        # 详细的参数打印
        print("=== 接收到的参数 ===")
        for key, value in body.items():
            print(f"{key}: {value}")

        # 参数获取（保持不变）
        fullname = body.get("fullname", "Test Event")
        ticker = body.get("ticker", "TEST")
        geoTag = body.get("geoTag", "Global")
        weatherTag = body.get("weatherTag", "Clear")
        eventTypes = body.get("eventTypes", ["General"])
        eventDescription = body.get("eventDescription", "Test event description")
        supplementLink = body.get("supplementLink", "https://example.com")
        eventTime = int(body.get("eventTime", 1735684503))

        fee = int(body.get("fee", 3000))
        tokensPerNativeE18 = int(body.get("tokensPerNativeE18", 10000 * 10 ** 18))
        native_liquidity_wei = int(body.get("nativeLiquidityWei", 10 ** 18))
        user_address_raw = body.get("walletAddress")

        # 验证用户地址
        user_address = Web3.to_checksum_address(user_address_raw)

        # 构建元组
        meta_tuple = (
            geoTag,
            weatherTag,
            eventTypes,
            eventDescription,
            supplementLink,
            eventTime
        )

        print(f"=== 合约调用参数 ===")
        print(f"名称: {fullname}")
        print(f"代号: {ticker}")
        print(f"元数据: {meta_tuple}")
        print(f"费率: {fee}")
        print(f"代币/原生币比例: {tokensPerNativeE18}")
        print(f"流动性: {native_liquidity_wei} wei ({native_liquidity_wei / 10 ** 18} ETH)")
        print(f"用户地址: {user_address}")

        # 检查用户余额
        user_balance = w3.eth.get_balance(user_address)
        print(f"用户余额: {user_balance} wei ({user_balance / 10 ** 18} ETH)")

        if user_balance < native_liquidity_wei:
            return jsonify({
                "ok": False,
                "error": f"用户余额不足。需要: {native_liquidity_wei / 10 ** 18} ETH, 当前: {user_balance / 10 ** 18} ETH"
            }), 400

        # 构建函数调用
        fn = router_contract.functions.createTokenAndPool(
            fullname,
            ticker,
            meta_tuple,
            fee,
            tokensPerNativeE18
        )

        # 尝试模拟调用以捕获错误
        try:
            print("=== 尝试模拟调用 ===")
            result = fn.call({
                'from': user_address,
                'value': native_liquidity_wei
            })
            print(f"模拟调用成功，返回: {result}")
        except Exception as e:
            print(f"模拟调用失败: {e}")
            # 尝试解码错误信息
            try:
                # 这里可以添加错误解码逻辑
                pass
            except:
                pass
            # 继续构建交易，让用户尝试

        # 构建交易
        nonce = w3.eth.get_transaction_count(user_address)
        gas_price = w3.eth.gas_price

        # 使用更大的 gas limit
        gas_limit = 1000000  # 100万 gas

        transaction_data = fn.build_transaction({
            'from': user_address,
            'value': native_liquidity_wei,
            'gas': gas_limit,
            'gasPrice': gas_price,
            'nonce': nonce,
            'chainId': CHAIN_ID
        })

        tx_for_frontend = {
            "to": ROUTER_ADDRESS,
            "from": user_address,
            "value": hex(transaction_data['value']),
            "data": transaction_data['data'],
            "chainId": CHAIN_ID,
            "gas": hex(transaction_data['gas']),
            "nonce": transaction_data['nonce'],
            "gasPrice": hex(transaction_data['gasPrice'])
        }

        print("=== 交易构建完成 ===")
        print(f"交易哈希预览: 0x...{transaction_data['data'][-20:]}")

        return jsonify({
            "ok": True,
            "tx": tx_for_frontend,
            "explanation": "前端用钱包签名发送, msg.sender=publisher",
            "debug_info": {
                "gas_limit": gas_limit,
                "value_eth": native_liquidity_wei / 10 ** 18,
                "estimated_gas_price": gas_price / 10 ** 9  # Gwei
            }
        })

    except Exception as e:
        print(f"token_launch 错误: {e}")
        import traceback
        traceback.print_exc()

        return jsonify({
            "ok": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 400


@tx_transfer.route('/debug_with_forge_env', methods=['POST'])
def debug_with_forge_env():
    """使用与 Forge 完全相同的环境测试"""
    try:
        # 使用你的环境变量中的确切参数
        test_params = {
            "fullname": "DEMO6",
            "ticker": "DEMO6",
            "geoTag": "NYC",
            "weatherTag": "Sunny",
            "eventTypes": ["F", "G", "H", "I"],
            "eventDescription": "DEMO6",
            "supplementLink": "https://example.com/DEMO6",
            "eventTime": 0,
            "fee": 3000,
            "tokensPerNativeE18": 1000000000000000000,  # 你的环境变量值
            "nativeLiquidityWei": 10 ** 18,
            "walletAddress": "0x36ad58b9846a208279EE91C605FE3cA548Db5d8F"
        }

        print("=== 使用 Forge 环境参数测试 ===")
        print(f"代币比例: {test_params['tokensPerNativeE18'] / 10 ** 18}")
        print(f"地址: {test_params['walletAddress']}")

        # 构建调用
        meta_tuple = (
            test_params["geoTag"], test_params["weatherTag"], test_params["eventTypes"],
            test_params["eventDescription"], test_params["supplementLink"], test_params["eventTime"]
        )

        fn = router_contract.functions.createTokenAndPool(
            test_params["fullname"], test_params["ticker"], meta_tuple,
            test_params["fee"], test_params["tokensPerNativeE18"]
        )

        # 尝试调用
        try:
            result = fn.call({
                'from': Web3.to_checksum_address(test_params["walletAddress"]),
                'value': test_params["nativeLiquidityWei"],
                'gas': 10000000
            })

            return jsonify({
                "ok": True,
                "success": True,
                "result": str(result),
                "used_exact_forge_params": True
            })

        except Exception as e:
            error_msg = str(e)
            print(f"调用失败: {error_msg}")

            # 分析可能的内部失败点
            analysis = {
                "possible_failure_points": [
                    "EventToken 构造函数中的参数验证",
                    "initialMint 函数的权限检查",
                    "addInitialLiquidity 的池初始化",
                    "代币比例计算溢出",
                    "PoolManager 交互失败"
                ],
                "suggestions": [
                    "检查 EventToken 构造函数的所有 require 语句",
                    "验证 tokensPerNativeE18 计算不会导致溢出",
                    "确认 PoolManager 和 LiquidityRouter 状态正常"
                ]
            }

            return jsonify({
                "ok": False,
                "error": error_msg,
                "analysis": analysis,
                "debug_info": {
                    "tokensPerNativeE18": test_params["tokensPerNativeE18"],
                    "liquidity_tokens_calculated": (test_params["nativeLiquidityWei"] * test_params[
                        "tokensPerNativeE18"]) // 10 ** 18,
                    "address_used": test_params["walletAddress"]
                }
            })

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@tx_transfer.route('/test_minimal_parameters', methods=['POST'])
def test_minimal_parameters():
    """测试最小化参数"""
    try:
        test_cases = [
            {
                "name": "minimal_1",
                "params": ("MIN", "MIN", ("G", "W", ["A", "B", "C", "D"], "D", "L", 0), 3000, 100 * 10 ** 18),
                "value": 10 ** 16
            },
            {
                "name": "minimal_2",
                "params": ("T", "T", ("X", "Y", ["1", "2", "3", "4"], "D", "L", 0), 3000, 10 * 10 ** 18),
                "value": 10 ** 15
            }
        ]

        results = {}
        user_address = "0x36ad58b9846a208279EE91C605FE3cA548Db5d8F"

        for test_case in test_cases:
            try:
                fn = router_contract.functions.createTokenAndPool(*test_case["params"])
                result = fn.call({
                    'from': user_address,
                    'value': test_case["value"],
                    'gas': 10000000
                })
                results[test_case["name"]] = {"success": True, "result": str(result)}
            except Exception as e:
                results[test_case["name"]] = {"success": False, "error": str(e)}

        return jsonify({
            "ok": True,
            "minimal_tests": results,
            "conclusion": "如果最小参数也失败，问题在合约逻辑而非参数"
        })

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400