from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.account import Account
from src.models.defi import DeFiInvestment, StreamingPayment
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

defi_bp = Blueprint('defi', __name__)

@defi_bp.route('/defi/investments', methods=['GET'])
def get_defi_investments():
    """Get DeFi investments for a user"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    investments = DeFiInvestment.query.filter_by(user_id=user_id).all()
    return jsonify([inv.to_dict() for inv in investments])

@defi_bp.route('/defi/investments', methods=['POST'])
def create_defi_investment():
    """Create a new DeFi investment"""
    data = request.get_json()
    
    required_fields = ['user_id', 'account_id', 'protocol_name', 'investment_type', 'amount_invested', 'currency']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Verify account exists and has sufficient balance
    account = Account.query.get(data['account_id'])
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    amount = Decimal(str(data['amount_invested']))
    if account.available_balance < amount:
        return jsonify({'error': 'Insufficient balance'}), 400
    
    investment = DeFiInvestment(
        id=str(uuid.uuid4()),
        user_id=data['user_id'],
        account_id=data['account_id'],
        protocol_name=data['protocol_name'],
        investment_type=data['investment_type'],
        amount_invested=amount,
        currency=data['currency'],
        current_value=amount,  # Initially same as invested amount
        apy=Decimal(str(data.get('apy', 0))),
        blockchain_address=data.get('blockchain_address'),
        transaction_hash=data.get('transaction_hash'),
        investment_metadata=data.get('metadata')
    )
    
    # Update account balance
    account.balance -= amount
    account.available_balance = account.balance - account.frozen_balance
    
    db.session.add(investment)
    db.session.commit()
    
    return jsonify(investment.to_dict()), 201

@defi_bp.route('/defi/investments/<investment_id>', methods=['GET'])
def get_defi_investment(investment_id):
    """Get DeFi investment details"""
    investment = DeFiInvestment.query.get(investment_id)
    if not investment:
        return jsonify({'error': 'Investment not found'}), 404
    
    return jsonify(investment.to_dict())

@defi_bp.route('/defi/investments/<investment_id>', methods=['PUT'])
def update_defi_investment(investment_id):
    """Update DeFi investment (e.g., current value, rewards)"""
    data = request.get_json()
    
    investment = DeFiInvestment.query.get(investment_id)
    if not investment:
        return jsonify({'error': 'Investment not found'}), 404
    
    if 'current_value' in data:
        investment.current_value = Decimal(str(data['current_value']))
    
    if 'rewards_earned' in data:
        investment.rewards_earned = Decimal(str(data['rewards_earned']))
    
    if 'apy' in data:
        investment.apy = Decimal(str(data['apy']))
    
    if 'status' in data:
        investment.status = data['status']
    
    investment.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(investment.to_dict())

@defi_bp.route('/defi/streaming-payments', methods=['GET'])
def get_streaming_payments():
    """Get streaming payments for a user"""
    user_id = request.args.get('user_id')
    direction = request.args.get('direction', 'all')  # 'incoming', 'outgoing', 'all'
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    query = StreamingPayment.query
    
    if direction == 'incoming':
        query = query.filter_by(to_user_id=user_id)
    elif direction == 'outgoing':
        query = query.filter_by(from_user_id=user_id)
    else:
        query = query.filter(
            (StreamingPayment.from_user_id == user_id) | 
            (StreamingPayment.to_user_id == user_id)
        )
    
    streams = query.all()
    return jsonify([stream.to_dict() for stream in streams])

@defi_bp.route('/defi/streaming-payments', methods=['POST'])
def create_streaming_payment():
    """Create a new streaming payment"""
    data = request.get_json()
    
    required_fields = ['from_user_id', 'to_user_id', 'from_account_id', 'to_account_id', 
                      'stream_name', 'total_amount', 'currency', 'start_time', 'end_time']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Parse dates
    start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
    end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
    
    # Calculate rate per second
    total_seconds = (end_time - start_time).total_seconds()
    total_amount = Decimal(str(data['total_amount']))
    rate_per_second = total_amount / Decimal(str(total_seconds))
    
    stream = StreamingPayment(
        id=str(uuid.uuid4()),
        from_user_id=data['from_user_id'],
        to_user_id=data['to_user_id'],
        from_account_id=data['from_account_id'],
        to_account_id=data['to_account_id'],
        stream_name=data['stream_name'],
        total_amount=total_amount,
        currency=data['currency'],
        rate_per_second=rate_per_second,
        start_time=start_time,
        end_time=end_time,
        blockchain_address=data.get('blockchain_address'),
        stream_metadata=data.get('metadata')
    )
    
    db.session.add(stream)
    db.session.commit()
    
    return jsonify(stream.to_dict()), 201

@defi_bp.route('/defi/streaming-payments/<stream_id>/withdraw', methods=['POST'])
def withdraw_from_stream(stream_id):
    """Withdraw available amount from streaming payment"""
    data = request.get_json()
    
    stream = StreamingPayment.query.get(stream_id)
    if not stream:
        return jsonify({'error': 'Stream not found'}), 404
    
    # Calculate available amount
    now = datetime.utcnow()
    if now < stream.start_time:
        available_amount = Decimal('0')
    elif now >= stream.end_time:
        available_amount = stream.total_amount
    else:
        elapsed_seconds = (now - stream.start_time).total_seconds()
        available_amount = stream.rate_per_second * Decimal(str(elapsed_seconds))
    
    # Subtract already withdrawn amount
    withdrawable = available_amount - stream.amount_withdrawn
    
    if withdrawable <= 0:
        return jsonify({'error': 'No amount available for withdrawal'}), 400
    
    # Update stream
    stream.amount_withdrawn += withdrawable
    stream.updated_at = datetime.utcnow()
    
    # Update recipient account balance
    to_account = Account.query.get(stream.to_account_id)
    if to_account:
        to_account.balance += withdrawable
        to_account.available_balance = to_account.balance - to_account.frozen_balance
    
    db.session.commit()
    
    return jsonify({
        'withdrawn_amount': float(withdrawable),
        'stream': stream.to_dict()
    })

@defi_bp.route('/defi/portfolio/<user_id>', methods=['GET'])
def get_defi_portfolio(user_id):
    """Get DeFi portfolio summary for dashboard"""
    investments = DeFiInvestment.query.filter_by(user_id=user_id, status='active').all()
    streams = StreamingPayment.query.filter_by(to_user_id=user_id, status='active').all()
    
    portfolio = {
        'total_invested': 0,
        'total_current_value': 0,
        'total_rewards': 0,
        'active_investments': len(investments),
        'active_streams': len(streams),
        'investments_by_protocol': {},
        'monthly_stream_income': 0
    }
    
    for inv in investments:
        portfolio['total_invested'] += float(inv.amount_invested)
        portfolio['total_current_value'] += float(inv.current_value)
        portfolio['total_rewards'] += float(inv.rewards_earned)
        
        if inv.protocol_name not in portfolio['investments_by_protocol']:
            portfolio['investments_by_protocol'][inv.protocol_name] = {
                'count': 0,
                'total_value': 0,
                'avg_apy': 0
            }
        
        protocol = portfolio['investments_by_protocol'][inv.protocol_name]
        protocol['count'] += 1
        protocol['total_value'] += float(inv.current_value)
        protocol['avg_apy'] = (protocol['avg_apy'] + float(inv.apy)) / protocol['count']
    
    # Calculate monthly stream income
    for stream in streams:
        if stream.status == 'active':
            monthly_rate = float(stream.rate_per_second) * 30 * 24 * 60 * 60  # 30 days
            portfolio['monthly_stream_income'] += monthly_rate
    
    return jsonify(portfolio)

