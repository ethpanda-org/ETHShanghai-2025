from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.account import Account
from src.models.transaction import Transaction, AutoSplitRule
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

transaction_bp = Blueprint('transaction', __name__)

@transaction_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """Get transactions for a user or account"""
    user_id = request.args.get('user_id')
    account_id = request.args.get('account_id')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    
    query = Transaction.query
    
    if account_id:
        query = query.filter(
            (Transaction.from_account_id == account_id) | 
            (Transaction.to_account_id == account_id)
        )
    elif user_id:
        # Get all accounts for the user first
        user_accounts = Account.query.filter_by(user_id=user_id).all()
        account_ids = [acc.id for acc in user_accounts]
        query = query.filter(
            (Transaction.from_account_id.in_(account_ids)) | 
            (Transaction.to_account_id.in_(account_ids))
        )
    else:
        return jsonify({'error': 'user_id or account_id is required'}), 400
    
    transactions = query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()
    return jsonify([tx.to_dict() for tx in transactions])

@transaction_bp.route('/transactions', methods=['POST'])
def create_transaction():
    """Create a new transaction"""
    data = request.get_json()
    
    required_fields = ['transaction_type', 'amount', 'currency']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Validate accounts exist
    from_account = None
    to_account = None
    
    if data.get('from_account_id'):
        from_account = Account.query.get(data['from_account_id'])
        if not from_account:
            return jsonify({'error': 'From account not found'}), 404
    
    if data.get('to_account_id'):
        to_account = Account.query.get(data['to_account_id'])
        if not to_account:
            return jsonify({'error': 'To account not found'}), 404
    
    # Create transaction
    transaction = Transaction(
        id=str(uuid.uuid4()),
        from_account_id=data.get('from_account_id'),
        to_account_id=data.get('to_account_id'),
        transaction_type=data['transaction_type'],
        amount=Decimal(str(data['amount'])),
        currency=data['currency'],
        fee=Decimal(str(data.get('fee', 0))),
        description=data.get('description'),
        reference_id=data.get('reference_id'),
        transaction_metadata=data.get('metadata')
    )
    
    db.session.add(transaction)
    
    # Update account balances for completed transactions
    if data.get('status') == 'completed' or data['transaction_type'] in ['deposit', 'withdrawal']:
        if from_account and data['transaction_type'] != 'deposit':
            from_account.balance -= transaction.amount + transaction.fee
            from_account.available_balance = from_account.balance - from_account.frozen_balance
        
        if to_account and data['transaction_type'] != 'withdrawal':
            to_account.balance += transaction.amount
            to_account.available_balance = to_account.balance - to_account.frozen_balance
        
        transaction.status = 'completed'
        transaction.completed_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(transaction.to_dict()), 201

@transaction_bp.route('/transactions/<transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """Get transaction details"""
    transaction = Transaction.query.get(transaction_id)
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    
    return jsonify(transaction.to_dict())

@transaction_bp.route('/transactions/<transaction_id>/status', methods=['PUT'])
def update_transaction_status(transaction_id):
    """Update transaction status"""
    data = request.get_json()
    
    transaction = Transaction.query.get(transaction_id)
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    
    old_status = transaction.status
    new_status = data.get('status')
    
    if new_status not in ['pending', 'completed', 'failed', 'cancelled']:
        return jsonify({'error': 'Invalid status'}), 400
    
    transaction.status = new_status
    
    if new_status == 'completed' and old_status == 'pending':
        transaction.completed_at = datetime.utcnow()
        
        # Update account balances
        if transaction.from_account_id:
            from_account = Account.query.get(transaction.from_account_id)
            if from_account:
                from_account.balance -= transaction.amount + transaction.fee
                from_account.available_balance = from_account.balance - from_account.frozen_balance
        
        if transaction.to_account_id:
            to_account = Account.query.get(transaction.to_account_id)
            if to_account:
                to_account.balance += transaction.amount
                to_account.available_balance = to_account.balance - to_account.frozen_balance
    
    db.session.commit()
    
    return jsonify(transaction.to_dict())

@transaction_bp.route('/auto-split-rules', methods=['GET'])
def get_auto_split_rules():
    """Get auto-split rules for a user"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    rules = AutoSplitRule.query.filter_by(user_id=user_id, is_active=True).all()
    return jsonify([rule.to_dict() for rule in rules])

@transaction_bp.route('/auto-split-rules', methods=['POST'])
def create_auto_split_rule():
    """Create a new auto-split rule"""
    data = request.get_json()
    
    required_fields = ['user_id', 'master_account_id', 'rule_name', 'split_rules']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    rule = AutoSplitRule(
        id=str(uuid.uuid4()),
        user_id=data['user_id'],
        master_account_id=data['master_account_id'],
        rule_name=data['rule_name'],
        trigger_condition=data.get('trigger_condition', {}),
        split_rules=data['split_rules']
    )
    
    db.session.add(rule)
    db.session.commit()
    
    return jsonify(rule.to_dict()), 201

@transaction_bp.route('/transactions/recent/<user_id>', methods=['GET'])
def get_recent_transactions(user_id):
    """Get recent transactions for dashboard"""
    limit = int(request.args.get('limit', 10))
    
    # Get user accounts
    user_accounts = Account.query.filter_by(user_id=user_id).all()
    account_ids = [acc.id for acc in user_accounts]
    
    if not account_ids:
        return jsonify([])
    
    transactions = Transaction.query.filter(
        (Transaction.from_account_id.in_(account_ids)) | 
        (Transaction.to_account_id.in_(account_ids))
    ).order_by(Transaction.created_at.desc()).limit(limit).all()
    
    # Enrich with account information
    result = []
    for tx in transactions:
        tx_dict = tx.to_dict()
        
        # Add account names for better display
        if tx.from_account_id:
            from_acc = Account.query.get(tx.from_account_id)
            tx_dict['from_account_name'] = from_acc.account_name if from_acc else None
        
        if tx.to_account_id:
            to_acc = Account.query.get(tx.to_account_id)
            tx_dict['to_account_name'] = to_acc.account_name if to_acc else None
        
        result.append(tx_dict)
    
    return jsonify(result)

