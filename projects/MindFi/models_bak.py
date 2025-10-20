from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# 初始化 SQLAlchemy 对象，后端会通过它来操作数据库
db = SQLAlchemy()


# 用户表：存储用户信息
class User(db.Model):
    __tablename__ = "users"  # 表名
    id = db.Column(db.Integer, primary_key=True)  # 用户的唯一ID
    address = db.Column(db.String(64), unique=True, index=True, nullable=False)  # 用户地址，唯一且不可为空
    alias = db.Column(db.String(64), default="")  # 用户别名，默认为空字符串
    avatar_url = db.Column(db.String(256), default="")  # 用户头像URL，默认为空字符串
    nonce = db.Column(db.String(16), default="")  # nonce值，用于防止重放攻击，默认为空字符串
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 用户创建时间，默认为当前时间


# 平台表：存储不同的DeFi平台
class Platform(db.Model):
    __tablename__ = "platforms"  # 表名
    id = db.Column(db.Integer, primary_key=True)  # 平台ID
    name = db.Column(db.String(64), nullable=False)  # 平台名称，不可为空
    chain_id = db.Column(db.Integer, default=11155111)  # 链ID，默认为 11155111（Sepolia）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 平台创建时间，默认为当前时间


# 产品表：存储不同平台的质押产品
class Product(db.Model):
    __tablename__ = "products"  # 表名
    id = db.Column(db.Integer, primary_key=True)  # 产品ID
    platform_id = db.Column(db.Integer, db.ForeignKey("platforms.id"), nullable=False)  # 关联平台ID，不可为空
    name = db.Column(db.String(64), nullable=False)  # 产品名称，不可为空
    cooldown_seconds = db.Column(db.Integer, default=7 * 24 * 3600)  # 冷却期，默认为7天
    fee_bps = db.Column(db.Integer, default=0)  # 手续费（基点），默认为0
    risk_score = db.Column(db.Integer, default=3)  # 风险评分，默认为3（1~5分）
    staking_contract = db.Column(db.String(64), default="0x0000000000000000000000000000000000000000")  # 质押合约地址，默认为空地址
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 产品创建时间，默认为当前时间


# APY快照表：存储产品的APY（年化收益率）数据
class APYSnapshot(db.Model):
    __tablename__ = "apy_snapshots"  # 表名
    id = db.Column(db.Integer, primary_key=True)  # 快照ID
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)  # 关联产品ID，不可为空
    apy = db.Column(db.Float, default=0.0)  # 年化收益率，默认为0.0
    collected_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # 快照收集时间，默认为当前时间并加上索引


# 质押记录表：记录每个用户在不同产品的质押信息
class Stake(db.Model):
    __tablename__ = "stakes"  # 表名
    id = db.Column(db.Integer, primary_key=True)  # 质押ID
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)  # 关联用户ID，不可为空
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)  # 关联产品ID，不可为空
    amount_wei = db.Column(db.Numeric(78, 0), nullable=False)  # 质押金额，以 Wei 为单位
    staked_at = db.Column(db.DateTime, default=datetime.utcnow)  # 质押时间，默认为当前时间
    unlocked_at = db.Column(db.DateTime, nullable=True)  # 解锁时间（如果有的话）
    status = db.Column(db.String(24), default="staked")  # 质押状态，默认为 "staked"
    tx_hash = db.Column(db.String(80), default="")  # 交易哈希，用于追踪交易


# 提现请求表：记录用户提出的提现请求
class WithdrawalRequest(db.Model):
    __tablename__ = "withdrawal_requests"  # 表名
    id = db.Column(db.Integer, primary_key=True)  # 提现请求ID
    stake_id = db.Column(db.Integer, db.ForeignKey("stakes.id"), nullable=False)  # 关联质押记录ID，不可为空
    amount_wei = db.Column(db.Numeric(78, 0), nullable=False)  # 提现金额，以 Wei 为单位
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)  # 提现请求时间，默认为当前时间
    eligible_at = db.Column(db.DateTime, nullable=True)  # 提现资格时间（冷却期结束后）
    status = db.Column(db.String(24), default="pending")  # 请求状态，默认为 "pending"
    tx_hash = db.Column(db.String(80), default="")  # 交易哈希，用于追踪提现交易
