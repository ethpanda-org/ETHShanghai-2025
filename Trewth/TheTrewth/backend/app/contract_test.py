from flask import Blueprint, request, jsonify

c_test = Blueprint('c_test', __name__)


@c_test.route('/decode_error', methods=['POST'])
def decode_error():
    """解码自定义错误"""
    try:
        body = request.get_json(force=True)
        error_data = body.get("error_data")

        if not error_data:
            return jsonify({"ok": False, "error": "需要 error_data 参数"})

        # 常见的自定义错误选择器
        custom_errors = {
            "0xf4b3b1bc": "AlreadyInitialized()",
            "0x90bfb865": "LockedBy()",  # 这看起来像 v4-core 的错误
            "0x4e487b71": "Panic(uint256)",
            # 添加你的合约可能抛出的其他错误
        }

        # 检查错误数据
        if isinstance(error_data, tuple) and len(error_data) > 0:
            error_hex = error_data[0]
        else:
            error_hex = str(error_data)

        # 提取错误选择器（前4字节）
        if len(error_hex) >= 10:  # 0x + 8字符
            selector = error_hex[2:10]  # 提取 f4b3b1bc
            error_name = custom_errors.get(selector, f"未知错误: 0x{selector}")
        else:
            selector = "unknown"
            error_name = "无法解析的错误格式"

        return jsonify({
            "ok": True,
            "error_data": error_data,
            "selector": f"0x{selector}",
            "error_name": error_name,
            "known_errors": custom_errors
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 400

