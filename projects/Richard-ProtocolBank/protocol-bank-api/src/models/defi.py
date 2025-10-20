from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from src.models.user import db

class DeFiInvestment(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    account_id = db.Column(db.String(36), db.ForeignKey('account.id'), nullable=False)
    protocol_name = db.Column(db.String(50), nullable=False)  # 'solana_lending', 'liquidity_pool', etc.
    investment_type = db.Column(db.String(30), nullable=False)  # 'lending', 'liquidity', 'staking', 'yield_farming'
    amount_invested = db.Column(db.Numeric(20, 8), nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    current_value = db.Column(db.Numeric(20, 8), default=0.0)
    apy = db.Column(db.Numeric(8, 4), default=0.0)  # Annual Percentage Yield
    rewards_earned = db.Column(db.Numeric(20, 8), default=0.0)
    status = db.Column(db.String(20), default='active')  # 'active', 'withdrawn', 'pending'
    blockchain_address = db.Column(db.String(100))  # Smart contract or pool address
    transaction_hash = db.Column(db.String(100))  # Initial investment transaction
    investment_metadata = db.Column(db.JSON)  # Additional protocol-specific data
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='defi_investments')
    account = db.relationship('Account', backref='defi_investments')

    def __repr__(self):
        return f'<DeFiInvestment {self.id} - {self.protocol_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'protocol_name': self.protocol_name,
            'investment_type': self.investment_type,
            'amount_invested': float(self.amount_invested),
            'currency': self.currency,
            'current_value': float(self.current_value),
            'apy': float(self.apy),
            'rewards_earned': float(self.rewards_earned),
            'status': self.status,
            'blockchain_address': self.blockchain_address,
            'transaction_hash': self.transaction_hash,
            'metadata': self.investment_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class StreamingPayment(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    from_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    to_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    from_account_id = db.Column(db.String(36), db.ForeignKey('account.id'), nullable=False)
    to_account_id = db.Column(db.String(36), db.ForeignKey('account.id'), nullable=False)
    stream_name = db.Column(db.String(100), nullable=False)
    total_amount = db.Column(db.Numeric(20, 8), nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    rate_per_second = db.Column(db.Numeric(20, 8), nullable=False)
    amount_streamed = db.Column(db.Numeric(20, 8), default=0.0)
    amount_withdrawn = db.Column(db.Numeric(20, 8), default=0.0)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='active')  # 'active', 'paused', 'completed', 'cancelled'
    blockchain_address = db.Column(db.String(100))  # Stream contract address
    stream_metadata = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    from_user = db.relationship('User', foreign_keys=[from_user_id], backref='outgoing_streams')
    to_user = db.relationship('User', foreign_keys=[to_user_id], backref='incoming_streams')
    from_account = db.relationship('Account', foreign_keys=[from_account_id])
    to_account = db.relationship('Account', foreign_keys=[to_account_id])

    def __repr__(self):
        return f'<StreamingPayment {self.id} - {self.stream_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'from_user_id': self.from_user_id,
            'to_user_id': self.to_user_id,
            'from_account_id': self.from_account_id,
            'to_account_id': self.to_account_id,
            'stream_name': self.stream_name,
            'total_amount': float(self.total_amount),
            'currency': self.currency,
            'rate_per_second': float(self.rate_per_second),
            'amount_streamed': float(self.amount_streamed),
            'amount_withdrawn': float(self.amount_withdrawn),
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'status': self.status,
            'blockchain_address': self.blockchain_address,
            'metadata': self.stream_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

