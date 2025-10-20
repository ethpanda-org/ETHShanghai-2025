from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from services import get_products, APYSnapshot, db
import random
from utils import now_utc

scheduler = BackgroundScheduler(timezone="UTC")


def job_pull_apy():
    products = get_products()
    for p in products:
        base = 0.03 + 0.08 * random.random()  # 3%~11%
        snap = APYSnapshot(product_id=p.id, apy=round(base, 4), collected_at=now_utc())
        db.session.add(snap)
    db.session.commit()


def job_check_cooldown():
    # TODO: Implement cooldown check logic
    scheduler.add_job(job_pull_apy, IntervalTrigger(minutes=15))
    scheduler.add_job(job_check_cooldown, IntervalTrigger(minutes=1))
    scheduler.start()
