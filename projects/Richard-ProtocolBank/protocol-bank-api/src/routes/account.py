from flask import Blueprint, request, jsonify
from src.models.user import db, User
from src.models.account import Account
import uuid
from datetime import datetime

account_bp = Blueprint('account', __name__)

@account_bp.route('/accounts', methods=['GET'])
def get_accounts():
    """Get all accounts for a user"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    accounts = Account.query.filter_by(user_id=user_id, is_active=True).all()
    return jsonify([account.to_dict() for account in accounts])

@account_bp.route('/accounts', methods=['POST'])
def create_account():
    """Create a new account"""
    data = request.get_json()
    
    required_fields = ['user_id', 'account_type', 'currency']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Verify user exists
    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    account = Account(
        id=str(uuid.uuid4()),
        user_id=data['user_id'],
        account_type=data['account_type'],
        currency=data['currency'],
        account_name=data.get('account_name'),
        parent_account_id=data.get('parent_account_id')
    )
    
    db.session.add(account)
    db.session.commit()
    
    return jsonify(account.to_dict()), 201

@account_bp.route('/accounts/<account_id>', methods=['GET'])
def get_account(account_id):
    """Get account details"""
    account = Account.query.get(account_id)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    return jsonify(account.to_dict())

@account_bp.route('/accounts/<account_id>/balance', methods=['PUT'])
def update_balance(account_id):
    """Update account balance (for testing purposes)"""
    data = request.get_json()
    
    account = Account.query.get(account_id)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    if 'balance' in data:
        account.balance = data['balance']
        account.available_balance = data.get('available_balance', data['balance'])
    
    if 'frozen_balance' in data:
        account.frozen_balance = data['frozen_balance']
    
    account.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(account.to_dict())

@account_bp.route('/accounts/<account_id>/sub-accounts', methods=['GET'])
def get_sub_accounts(account_id):
    """Get all sub-accounts for a master account"""
    master_account = Account.query.get(account_id)
    if not master_account:
        return jsonify({'error': 'Master account not found'}), 404
    
    sub_accounts = Account.query.filter_by(parent_account_id=account_id, is_active=True).all()
    return jsonify([account.to_dict() for account in sub_accounts])

@account_bp.route('/accounts/summary/<user_id>', methods=['GET'])
def get_account_summary(user_id):
    """Get account summary for dashboard"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    accounts = Account.query.filter_by(user_id=user_id, is_active=True).all()
    
    summary = {
        'total_balance': 0,
        'crypto_balance': 0,
        'fiat_balance': 0,
        'account_count': len(accounts),
        'accounts_by_type': {}
    }
    
    for account in accounts:
        balance = float(account.balance)
        summary['total_balance'] += balance
        
        if account.account_type == 'crypto':
            summary['crypto_balance'] += balance
        elif account.account_type == 'fiat':
            summary['fiat_balance'] += balance
        
        if account.account_type not in summary['accounts_by_type']:
            summary['accounts_by_type'][account.account_type] = []
        summary['accounts_by_type'][account.account_type].append(account.to_dict())
    
    return jsonify(summary)

