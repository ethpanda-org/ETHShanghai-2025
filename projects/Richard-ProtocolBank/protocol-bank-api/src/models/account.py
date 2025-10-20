from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from src.models.user import db

class Account(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    account_type = db.Column(db.String(20), nullable=False)  # 'fiat', 'crypto', 'virtual_master', 'sub_account'
    currency = db.Column(db.String(10), nullable=False)  # USD, EUR, SOL, ETH, etc.
    balance = db.Column(db.Numeric(20, 8), default=0.0)
    available_balance = db.Column(db.Numeric(20, 8), default=0.0)
    frozen_balance = db.Column(db.Numeric(20, 8), default=0.0)
    account_name = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    parent_account_id = db.Column(db.String(36), db.ForeignKey('account.id'), nullable=True)  # For sub-accounts
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='accounts')
    sub_accounts = db.relationship('Account', backref=db.backref('parent_account', remote_side=[id]))

    def __repr__(self):
        return f'<Account {self.id} - {self.currency}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_type': self.account_type,
            'currency': self.currency,
            'balance': float(self.balance),
            'available_balance': float(self.available_balance),
            'frozen_balance': float(self.frozen_balance),
            'account_name': self.account_name,
            'is_active': self.is_active,
            'parent_account_id': self.parent_account_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

