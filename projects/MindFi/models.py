from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.sqlite import JSON  # 如果你用 MySQL/PostgreSQL，可替换成原生 JSON 类型

db = SQLAlchemy()

# =============================
# 用户表：存储用户信息
# =============================
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)  # 用户唯一ID
    address = db.Column(db.String(64), unique=True, index=True, nullable=False)  # 钱包地址（唯一）
    alias = db.Column(db.String(64), default="")  # 用户别名
    avatar_url = db.Column(db.String(256), default="")  # 用户头像
    nonce = db.Column(db.String(16), default="")  # 登录nonce（防止重放攻击）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 注册时间


# =============================
# 平台表：存储DeFi平台信息
# =============================
class Platform(db.Model):
    __tablename__ = "platforms"
    id = db.Column(db.Integer, primary_key=True)  # 平台ID
    name = db.Column(db.String(64), nullable=False)  # 平台名称
    chain_id = db.Column(db.Integer, default=11155111)  # 链ID（默认Sepolia）
    logo_url = db.Column(db.String(256), default="")  # 平台logo
    description = db.Column(db.String(256), default="")  # 平台简介
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间


# =============================
# 产品表：存储不同质押产品
# =============================
class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)  # 产品ID
    platform_id = db.Column(db.Integer, db.ForeignKey("platforms.id"), nullable=False)  # 关联平台
    name = db.Column(db.String(64), nullable=False)  # 产品名称
    description = db.Column(db.String(512), default="")  # 产品介绍
    stake_type = db.Column(db.String(16), nullable=False)  # 质押类型（flexible/fixed/long）
    apy_base = db.Column(db.Float, default=0.0)  # 基础APY
    cooldown_seconds = db.Column(db.Integer, default=0)  # 冷却期（灵活质押时为0）
    term_seconds = db.Column(db.Integer, nullable=True)  # 定期质押锁定周期
    cliff_seconds = db.Column(db.Integer, nullable=True)  # 长期质押悬崖期
    vesting_seconds = db.Column(db.Integer, nullable=True)  # 长期质押线性释放期
    early_exit_penalty_bps = db.Column(db.Integer, default=0)  # 提前退出罚金（基点）
    fee_bps = db.Column(db.Integer, default=0)  # 手续费（基点）
    risk_score = db.Column(db.Integer, default=3)  # 风险评分（1~5）
    staking_contract = db.Column(db.String(64), default="0x0000000000000000000000000000000000000000")  # 链上合约
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间


# =============================
# APY 快照表：记录每个产品的APY变化
# =============================
class APYSnapshot(db.Model):
    __tablename__ = "apy_snapshots"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)  # 产品ID
    apy = db.Column(db.Float, default=0.0)  # 年化收益率
    collected_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # 采集时间


# =============================
# 质押记录表：记录用户质押详情
# =============================
class Stake(db.Model):
    __tablename__ = "stakes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)  # 用户ID
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)  # 产品ID
    amount_wei = db.Column(db.Numeric(78, 0), nullable=False)  # 质押金额（Wei）
    staked_at = db.Column(db.DateTime, default=datetime.utcnow)  # 质押时间
    unlocked_at = db.Column(db.DateTime, nullable=True)  # 可解锁时间
    matured_at = db.Column(db.DateTime, nullable=True)  # 到期时间
    status = db.Column(db.String(24), default="staked")  # 状态（staked/withdrawn/expired）
    tx_hash = db.Column(db.String(80), default="")  # 交易哈希
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间


# =============================
# 提现请求表：记录提现操作
# =============================
class WithdrawalRequest(db.Model):
    __tablename__ = "withdrawal_requests"
    id = db.Column(db.Integer, primary_key=True)
    stake_id = db.Column(db.Integer, db.ForeignKey("stakes.id"), nullable=False)  # 质押ID
    amount_wei = db.Column(db.Numeric(78, 0), nullable=False)  # 提现金额
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)  # 请求时间
    eligible_at = db.Column(db.DateTime, nullable=True)  # 可提现时间（冷却结束）
    status = db.Column(db.String(24), default="pending")  # 状态（pending/completed/rejected）
    tx_hash = db.Column(db.String(80), default="")  # 提现哈希


# =============================
# 自动质押计划表（AI推荐结果）
# =============================
class AutoStakePlan(db.Model):
    __tablename__ = "auto_stake_plans"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # 用户ID
    stake_type = db.Column(db.String(16), nullable=False)  # 质押类型（由用户选择）
    amount_wei = db.Column(db.Numeric(78, 0), nullable=False)  # 用户质押总金额
    risk_preference = db.Column(db.Integer, default=3)  # 风险偏好（1~5）
    horizon_days = db.Column(db.Integer, default=30)  # 投资周期（天）
    selections = db.Column(JSON, nullable=False)  # 推荐方案 [{product_id, apy, amount_eth, score}]
    expires_at = db.Column(db.DateTime, nullable=False)  # 推荐计划过期时间
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# =============================
# AI 打分记录表：记录AI分析与选择过程
# =============================
class AIScoreLog(db.Model):
    __tablename__ = "ai_score_logs"
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("auto_stake_plans.id"), nullable=False)  # 所属AI计划
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)  # 被评分的产品
    score = db.Column(db.Float, default=0.0)  # AI打分
    reason = db.Column(db.String(512), default="")  # 评分理由
    model_name = db.Column(db.String(64), default="gpt-4o-mini")  # 使用的模型
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# =============================
# 系统任务表：后台自动任务记录
# =============================
class SystemTask(db.Model):
    __tablename__ = "system_tasks"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)  # 任务名称
    status = db.Column(db.String(24), default="pending")  # 状态（pending/running/completed/failed）
    last_run = db.Column(db.DateTime, nullable=True)  # 上次执行时间
    message = db.Column(db.String(256), default="")  # 执行结果
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# =============================
# 盈利快照表：记录用户每日/每小时收益
# =============================
class ProfitSnapshot(db.Model):
    __tablename__ = "profit_snapshots"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)  # 用户ID
    date = db.Column(db.DateTime, nullable=False, index=True)  # 快照日期（按天/小时）
    total_profit_wei = db.Column(db.Numeric(78, 0), nullable=False)  # 当前累计总收益
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间
