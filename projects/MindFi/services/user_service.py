# services.py
from datetime import datetime
from models import db, ProfitSnapshot
from utils import wei_to_eth


def get_user_profit_by_address(user_id: int, start_date: str = None, end_date: str = None):
    """
    获取用户的盈利情况，按日期查询（默认查询所有）
    :param user_id: 用户ID
    :param start_date: 可选，开始日期，格式：YYYY-MM-DD
    :param end_date: 可选，结束日期，格式：YYYY-MM-DD
    :return: 用户盈利情况（按日期排序）
    """
    query = ProfitSnapshot.query.filter_by(user_id=user_id)

    # 处理日期范围
    if start_date:
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
        query = query.filter(ProfitSnapshot.date >= start_date)

    if end_date:
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
        query = query.filter(ProfitSnapshot.date <= end_date)

    # 查询数据
    snapshots = query.order_by(ProfitSnapshot.date).all()

    # 格式化输出数据
    profit_data = [
        {
            "date": snapshot.date.strftime("%Y-%m-%d"),
            "total_profit_eth": wei_to_eth(snapshot.total_profit_wei)  # 将Wei转换为ETH
        }
        for snapshot in snapshots
    ]

    return profit_data
