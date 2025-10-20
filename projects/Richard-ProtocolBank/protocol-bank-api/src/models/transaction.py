from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from src.models.user import db

class Transaction(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    from_account_id = db.Column(db.String(36), db.ForeignKey('account.id'), nullable=True)
    to_account_id = db.Column(db.String(36), db.ForeignKey('account.id'), nullable=True)
    transaction_type = db.Column(db.String(30), nullable=False)  # 'transfer', 'deposit', 'withdrawal', 'defi_investment', 'payment', 'auto_split'
    amount = db.Column(db.Numeric(20, 8), nullable=False)
    currency = db.Column(db.String(10), nullable=False)
    fee = db.Column(db.Numeric(20, 8), default=0.0)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'completed', 'failed', 'cancelled'
    description = db.Column(db.Text)
    reference_id = db.Column(db.String(100))  # External reference (blockchain tx hash, etc.)
    transaction_metadata = db.Column(db.JSON)  # Additional transaction data
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    # Relationships
    from_account = db.relationship('Account', foreign_keys=[from_account_id], backref='outgoing_transactions')
    to_account = db.relationship('Account', foreign_keys=[to_account_id], backref='incoming_transactions')

    def __repr__(self):
        return f'<Transaction {self.id} - {self.transaction_type}>'

    def to_dict(self):
        return {
            'id': self.id,
            'from_account_id': self.from_account_id,
            'to_account_id': self.to_account_id,
            'transaction_type': self.transaction_type,
            'amount': float(self.amount),
            'currency': self.currency,
            'fee': float(self.fee),
            'status': self.status,
            'description': self.description,
            'reference_id': self.reference_id,
            'metadata': self.transaction_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class AutoSplitRule(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    master_account_id = db.Column(db.String(36), db.ForeignKey('account.id'), nullable=False)
    rule_name = db.Column(db.String(100), nullable=False)
    trigger_condition = db.Column(db.JSON)  # Conditions that trigger the split
    split_rules = db.Column(db.JSON)  # Array of split rules with percentages/amounts
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='auto_split_rules')
    master_account = db.relationship('Account', backref='split_rules')

    def __repr__(self):
        return f'<AutoSplitRule {self.id} - {self.rule_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'master_account_id': self.master_account_id,
            'rule_name': self.rule_name,
            'trigger_condition': self.trigger_condition,
            'split_rules': self.split_rules,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

