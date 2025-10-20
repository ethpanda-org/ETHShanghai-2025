# routes.py
from flask import request, jsonify, Blueprint
from services.services import get_user_by_address, create_user, get_platforms, create_stake
from services.user_service import get_user_profit_by_address
from models import User
from flask_jwt_extended import jwt_required, get_jwt_identity

from utils import eth_to_wei

user_blueprint = Blueprint('user', __name__, url_prefix='/user')


@user_blueprint.route("/profit/snapshot", methods=["GET"])
def get_user_profit_snapshot():
    """根据用户地址查询盈利情况"""
    address = request.args.get('address')
    start_date = request.args.get('start_date')  # 可选的起始日期，格式：YYYY-MM-DD
    end_date = request.args.get('end_date')  # 可选的结束日期，格式：YYYY-MM-DD

    if not address:
        return jsonify({"ok": False, "error": "address is required"}), 400

    # 根据地址查询用户
    user = User.query.filter_by(address=address).first()
    if not user:
        return jsonify({"ok": False, "error": "User not found"}), 404

    # 获取该用户的盈利情况
    result = get_user_profit_by_address(user.id, start_date, end_date)

    return jsonify({
        "ok": True,
        "data": result
    })


@user_blueprint.route("/auth/nonce", methods=["POST"])
def auth_nonce():
    data = request.json
    address = data.get("address")
    user = get_user_by_address(address)
    if not user:
        user = create_user(address)
    return jsonify(
        {
            "ok": True,
            "data": {
                "address": user.address,
                "nonce": user.nonce,
                "alias": user.alias,
                "avatar_url": user.avatar_url,
                "amount": 0.1,
                "profit": 0.001,
                "number": 5,
                "avgAnnualized": 5
            }
        })


@user_blueprint.route("/platforms", methods=["GET"])
def list_platforms():
    platforms = get_platforms()
    return jsonify({"ok": True, "data": [p.name for p in platforms]})


@user_blueprint.route("/stake", methods=["POST"])
def create_stake_route():
    data = request.json
    user_id = get_jwt_identity()
    amount_eth = data["amount_eth"]
    product_id = data["product_id"]
    stake = create_stake(user_id, product_id, eth_to_wei(amount_eth))
    return jsonify({"ok": True, "data": {"stake_id": stake.id, "tx_hash": stake.tx_hash}})
