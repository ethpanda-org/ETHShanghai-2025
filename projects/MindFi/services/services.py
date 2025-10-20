from models import db, User, Platform, Product, Stake, WithdrawalRequest, APYSnapshot
from datetime import datetime, timedelta
import secrets

def get_user_by_address(address: str) -> User:
    return User.query.filter_by(address=address.lower()).first()

def create_user(address: str) -> User:
    user = User(
        address=address.lower(),
        nonce=secrets.token_hex(4),
        alias="ETH User",
        avatar_url="https://ethereum.org/_next/image/?url=%2F_next%2Fstatic%2Fmedia%2Fimpact_transparent.7420c423.png&w=640&q=75"
    )
    db.session.add(user)
    db.session.commit()
    return user

def get_platforms() -> list:
    return Platform.query.all()

def get_products() -> list:
    return Product.query.all()

def create_stake(user_id: int, product_id: int, amount_wei: int) -> Stake:
    stake = Stake(user_id=user_id, product_id=product_id, amount_wei=amount_wei, staked_at=datetime.utcnow())
    db.session.add(stake)
    db.session.commit()
    return stake

def create_withdrawal_request(stake_id: int, amount_wei: int) -> WithdrawalRequest:
    withdrawal_request = WithdrawalRequest(stake_id=stake_id, amount_wei=amount_wei, requested_at=datetime.utcnow())
    db.session.add(withdrawal_request)
    db.session.commit()
    return withdrawal_request
