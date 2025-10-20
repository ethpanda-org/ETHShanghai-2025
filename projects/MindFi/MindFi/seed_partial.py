import random
from datetime import datetime, timedelta
from app import app
from models import db, User, Platform, Product, Stake, APYSnapshot, ProfitSnapshot, AutoStakePlan, AIScoreLog
from utils import eth_to_wei


def seed_platforms():
    """添加示例DeFi平台"""
    platforms = [
        Platform(name="Aave", logo_url="https://cryptologos.cc/logos/aave-aave-logo.svg", description="去中心化借贷协议，提供灵活质押方案"),
        Platform(name="Lido", logo_url="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg", description="以太坊流动性质押平台，支持stETH"),
        Platform(name="Compound", logo_url="https://cryptologos.cc/logos/compound-comp-logo.svg", description="算法化利率市场，支持稳定收益")
    ]
    db.session.bulk_save_objects(platforms)
    db.session.commit()
    print("✅ 平台数据已添加")
    return Platform.query.all()


def seed_products(platforms):
    """添加示例质押产品"""
    products = [
        Product(
            platform_id=platforms[0].id,
            name="Aave 灵活质押池",
            description="支持随时存取，冷却期为1小时，适合短期管理。",
            stake_type="flexible",
            apy_base=0.045,
            cooldown_seconds=3600,
            risk_score=2
        ),
        Product(
            platform_id=platforms[1].id,
            name="Lido 30天定期质押",
            description="锁定30天，收益稳定，适合中期投资者。",
            stake_type="fixed",
            apy_base=0.06,
            term_seconds=30 * 86400,
            risk_score=3
        ),
        Product(
            platform_id=platforms[2].id,
            name="Compound 长期锁仓计划",
            description="180天线性释放期，适合长期收益投资。",
            stake_type="long",
            apy_base=0.08,
            cliff_seconds=7 * 86400,
            vesting_seconds=180 * 86400,
            risk_score=4
        )
    ]
    db.session.bulk_save_objects(products)
    db.session.commit()
    print("✅ 产品数据已添加")
    return Product.query.all()


def seed_stakes(users, products):
    """添加用户质押记录"""
    stakes = []
    for user in users:
        for product in products:
            staked_time = datetime.utcnow() - timedelta(days=random.randint(1, 10))
            amount = eth_to_wei(random.uniform(0.5, 5.0))
            stakes.append(
                Stake(
                    user_id=user.id,
                    product_id=product.id,
                    amount_wei=amount,
                    staked_at=staked_time,
                    unlocked_at=staked_time + timedelta(days=7),
                    status="staked",
                    tx_hash=f"0x{random.randint(10**15, 10**16-1):x}"
                )
            )
    db.session.bulk_save_objects(stakes)
    db.session.commit()
    print("✅ 质押记录已添加")
    return Stake.query.all()


def seed_apy_snapshots(products):
    """为每个产品添加最近5天的APY快照"""
    now = datetime.utcnow()
    snapshots = []
    for product in products:
        for i in range(5):
            snapshots.append(
                APYSnapshot(
                    product_id=product.id,
                    apy=product.apy_base + random.uniform(-0.005, 0.005),
                    collected_at=now - timedelta(days=i)
                )
            )
    db.session.bulk_save_objects(snapshots)
    db.session.commit()
    print("✅ APY 快照数据已添加")


def seed_profit_snapshots(users):
    """为每个用户生成最近7天盈利快照"""
    now = datetime.utcnow()
    snapshots = []
    for user in users:
        base_profit = random.uniform(0.05, 0.15)
        for i in range(7):
            daily_profit = (base_profit + random.uniform(-0.01, 0.02)) * (i + 1)
            snapshots.append(
                ProfitSnapshot(
                    user_id=user.id,
                    date=now - timedelta(days=6 - i),
                    total_profit_wei=eth_to_wei(daily_profit)
                )
            )
    db.session.bulk_save_objects(snapshots)
    db.session.commit()
    print("✅ 盈利快照数据已添加")


def seed_ai_plans(users, products):
    """添加AI推荐与打分示例"""
    plan = AutoStakePlan(
        user_id=users[0].id,
        stake_type="flexible",
        amount_wei=eth_to_wei(3),
        risk_preference=2,
        horizon_days=30,
        selections=[
            {"product_id": products[0].id, "apy": 0.045, "amount_eth": 1.5, "score": 8.7},
            {"product_id": products[1].id, "apy": 0.06, "amount_eth": 1.5, "score": 9.2}
        ],
        expires_at=datetime.utcnow() + timedelta(days=3)
    )
    db.session.add(plan)
    db.session.commit()

    logs = [
        AIScoreLog(plan_id=plan.id, product_id=products[0].id, score=8.7, reason="低风险流动性强"),
        AIScoreLog(plan_id=plan.id, product_id=products[1].id, score=9.2, reason="收益稳定，适合稳健型用户")
    ]
    db.session.bulk_save_objects(logs)
    db.session.commit()
    print("✅ AI 推荐与打分数据已添加")


def seed_partial():
    """不清空users，仅为现有用户插入数据"""
    with app.app_context():
        print("🚀 开始为现有用户模拟插入数据...")

        users = User.query.all()
        print(f"共检测到 {len(users)} 个用户：", [u.address for u in users])

        platforms = seed_platforms()
        products = seed_products(platforms)
        seed_stakes(users, products)
        seed_apy_snapshots(products)
        seed_profit_snapshots(users)
        seed_ai_plans(users, products)

        print("🎉 已成功为现有用户生成完整测试数据！")


if __name__ == "__main__":
    seed_partial()
