"""
Transaction Handler Module for Protocol Bank
Handles both fiat and cryptocurrency transactions
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging
from decimal import Decimal
import hashlib
import json

# Configure logging
logger = logging.getLogger(__name__)

transaction_bp = Blueprint('transactions', __name__, url_prefix='/api/transactions')


class TransactionProcessor:
    """Process and validate transactions"""
    
    def __init__(self, db, solana_client, ethereum_client, redis_client):
        self.db = db
        self.solana_client = solana_client
        self.ethereum_client = ethereum_client
        self.redis = redis_client
        
    def validate_transaction(self, transaction_data):
        """Validate transaction data before processing"""
        required_fields = ['from_account_id', 'to_account_id', 'amount', 'transaction_type']
        
        for field in required_fields:
            if field not in transaction_data:
                return False, f"Missing required field: {field}"
        
        try:
            amount = Decimal(str(transaction_data['amount']))
            if amount <= 0:
                return False, "Amount must be greater than 0"
        except:
            return False, "Invalid amount format"
        
        return True, "Valid"
    
    def process_fiat_transaction(self, from_account, to_account, amount, payment_gateway):
        """Process fiat currency transaction"""
        try:
            transaction_id = self._generate_transaction_id()
            
            # Deduct from source account
            from_account.balance -= Decimal(str(amount))
            
            # Add to destination account
            to_account.balance += Decimal(str(amount))
            
            # Record transaction in database
            transaction_record = {
                'id': transaction_id,
                'from_account_id': from_account.id,
                'to_account_id': to_account.id,
                'amount': amount,
                'transaction_type': 'fiat_transfer',
                'status': 'completed',
                'payment_gateway': payment_gateway,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Cache transaction for quick retrieval
            self.redis.setex(
                f"transaction:{transaction_id}",
                3600,  # 1 hour expiry
                json.dumps(transaction_record, default=str)
            )
            
            logger.info(f"Fiat transaction processed: {transaction_id}")
            return True, transaction_record
            
        except Exception as e:
            logger.error(f"Error processing fiat transaction: {str(e)}")
            return False, {"error": str(e)}
    
    def process_crypto_transaction(self, from_account, to_account, amount, blockchain='solana'):
        """Process cryptocurrency transaction on blockchain"""
        try:
            transaction_id = self._generate_transaction_id()
            
            if blockchain.lower() == 'solana':
                return self._process_solana_transaction(
                    from_account, to_account, amount, transaction_id
                )
            elif blockchain.lower() == 'ethereum':
                return self._process_ethereum_transaction(
                    from_account, to_account, amount, transaction_id
                )
            else:
                return False, {"error": f"Unsupported blockchain: {blockchain}"}
                
        except Exception as e:
            logger.error(f"Error processing crypto transaction: {str(e)}")
            return False, {"error": str(e)}
    
    def _process_solana_transaction(self, from_account, to_account, amount, transaction_id):
        """Process transaction on Solana blockchain"""
        try:
            # Prepare transaction data for Solana
            tx_data = {
                'from_pubkey': from_account.solana_address,
                'to_pubkey': to_account.solana_address,
                'amount': int(float(amount) * 1e9),  # Convert to lamports
                'mint': 'PBXTokenProgram11111111111111111111111111111111'
            }
            
            # Send transaction to Solana (placeholder - actual implementation depends on Solana SDK)
            # tx_signature = self.solana_client.send_transaction(tx_data)
            
            # Record transaction
            transaction_record = {
                'id': transaction_id,
                'from_account_id': from_account.id,
                'to_account_id': to_account.id,
                'amount': amount,
                'transaction_type': 'crypto_transfer_solana',
                'status': 'pending',
                'blockchain': 'solana',
                'blockchain_hash': 'pending_signature',  # Will be updated when confirmed
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Cache transaction
            self.redis.setex(
                f"transaction:{transaction_id}",
                3600,
                json.dumps(transaction_record, default=str)
            )
            
            logger.info(f"Solana transaction initiated: {transaction_id}")
            return True, transaction_record
            
        except Exception as e:
            logger.error(f"Error processing Solana transaction: {str(e)}")
            return False, {"error": str(e)}
    
    def _process_ethereum_transaction(self, from_account, to_account, amount, transaction_id):
        """Process transaction on Ethereum blockchain"""
        try:
            # Prepare transaction data for Ethereum
            tx_data = {
                'from': from_account.ethereum_address,
                'to': to_account.ethereum_address,
                'value': int(float(amount) * 1e18),  # Convert to wei
                'gas': 21000,
                'gasPrice': self.ethereum_client.eth.gas_price
            }
            
            # Send transaction to Ethereum (placeholder - actual implementation depends on Web3.py)
            # tx_hash = self.ethereum_client.eth.send_transaction(tx_data)
            
            # Record transaction
            transaction_record = {
                'id': transaction_id,
                'from_account_id': from_account.id,
                'to_account_id': to_account.id,
                'amount': amount,
                'transaction_type': 'crypto_transfer_ethereum',
                'status': 'pending',
                'blockchain': 'ethereum',
                'blockchain_hash': 'pending_hash',  # Will be updated when confirmed
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Cache transaction
            self.redis.setex(
                f"transaction:{transaction_id}",
                3600,
                json.dumps(transaction_record, default=str)
            )
            
            logger.info(f"Ethereum transaction initiated: {transaction_id}")
            return True, transaction_record
            
        except Exception as e:
            logger.error(f"Error processing Ethereum transaction: {str(e)}")
            return False, {"error": str(e)}
    
    def process_split_payment(self, from_account, split_recipients, total_amount):
        """Process automatic split payment for B2B transactions"""
        try:
            transaction_id = self._generate_transaction_id()
            split_transactions = []
            
            # Calculate individual amounts
            num_recipients = len(split_recipients)
            amount_per_recipient = Decimal(str(total_amount)) / num_recipients
            
            # Process each split payment
            for recipient in split_recipients:
                recipient_account = recipient.get('account')
                recipient_amount = recipient.get('amount', amount_per_recipient)
                
                # Deduct from source
                from_account.balance -= recipient_amount
                
                # Add to recipient
                recipient_account.balance += recipient_amount
                
                # Record individual split transaction
                split_tx = {
                    'parent_transaction_id': transaction_id,
                    'from_account_id': from_account.id,
                    'to_account_id': recipient_account.id,
                    'amount': str(recipient_amount),
                    'transaction_type': 'split_payment',
                    'status': 'completed',
                    'created_at': datetime.utcnow().isoformat()
                }
                
                split_transactions.append(split_tx)
            
            # Record parent transaction
            parent_transaction = {
                'id': transaction_id,
                'from_account_id': from_account.id,
                'amount': total_amount,
                'transaction_type': 'split_payment_batch',
                'status': 'completed',
                'split_count': num_recipients,
                'split_transactions': split_transactions,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Cache transaction
            self.redis.setex(
                f"transaction:{transaction_id}",
                3600,
                json.dumps(parent_transaction, default=str)
            )
            
            logger.info(f"Split payment processed: {transaction_id} with {num_recipients} recipients")
            return True, parent_transaction
            
        except Exception as e:
            logger.error(f"Error processing split payment: {str(e)}")
            return False, {"error": str(e)}
    
    def process_streaming_payment(self, from_account, to_account, total_amount, duration_days, milestone_based=False):
        """Process streaming payment (e.g., for freelancers)"""
        try:
            transaction_id = self._generate_transaction_id()
            
            # Calculate daily amount
            daily_amount = Decimal(str(total_amount)) / Decimal(str(duration_days))
            
            streaming_payment = {
                'id': transaction_id,
                'from_account_id': from_account.id,
                'to_account_id': to_account.id,
                'total_amount': str(total_amount),
                'daily_amount': str(daily_amount),
                'duration_days': duration_days,
                'milestone_based': milestone_based,
                'transaction_type': 'streaming_payment',
                'status': 'active',
                'start_date': datetime.utcnow().isoformat(),
                'end_date': None,  # Will be calculated based on duration
                'paid_amount': '0',
                'remaining_amount': str(total_amount),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Cache streaming payment
            self.redis.setex(
                f"streaming_payment:{transaction_id}",
                86400 * duration_days,  # Cache for duration of payment
                json.dumps(streaming_payment, default=str)
            )
            
            logger.info(f"Streaming payment initiated: {transaction_id}")
            return True, streaming_payment
            
        except Exception as e:
            logger.error(f"Error processing streaming payment: {str(e)}")
            return False, {"error": str(e)}
    
    def _generate_transaction_id(self):
        """Generate unique transaction ID"""
        timestamp = datetime.utcnow().isoformat()
        hash_input = f"{timestamp}{datetime.utcnow().timestamp()}".encode()
        return hashlib.sha256(hash_input).hexdigest()[:16]


# API Routes
@transaction_bp.route('/send', methods=['POST'])
def send_transaction():
    """Send a transaction"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Process transaction (implementation depends on database and client setup)
        return jsonify({
            'status': 'success',
            'message': 'Transaction initiated',
            'transaction_id': 'tx_' + hashlib.sha256(str(data).encode()).hexdigest()[:12]
        }), 200
        
    except Exception as e:
        logger.error(f"Error in send_transaction: {str(e)}")
        return jsonify({'error': str(e)}), 500


@transaction_bp.route('/split', methods=['POST'])
def send_split_payment():
    """Send split payment to multiple recipients"""
    try:
        data = request.get_json()
        
        if not data or 'recipients' not in data:
            return jsonify({'error': 'Invalid split payment data'}), 400
        
        return jsonify({
            'status': 'success',
            'message': 'Split payment initiated',
            'transaction_id': 'split_' + hashlib.sha256(str(data).encode()).hexdigest()[:12]
        }), 200
        
    except Exception as e:
        logger.error(f"Error in send_split_payment: {str(e)}")
        return jsonify({'error': str(e)}), 500


@transaction_bp.route('/stream', methods=['POST'])
def create_streaming_payment():
    """Create a streaming payment"""
    try:
        data = request.get_json()
        
        required_fields = ['to_account_id', 'amount', 'duration_days']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        return jsonify({
            'status': 'success',
            'message': 'Streaming payment created',
            'transaction_id': 'stream_' + hashlib.sha256(str(data).encode()).hexdigest()[:12]
        }), 200
        
    except Exception as e:
        logger.error(f"Error in create_streaming_payment: {str(e)}")
        return jsonify({'error': str(e)}), 500


@transaction_bp.route('/<transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """Get transaction details"""
    try:
        return jsonify({
            'transaction_id': transaction_id,
            'status': 'completed',
            'amount': '1000.00',
            'created_at': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_transaction: {str(e)}")
        return jsonify({'error': str(e)}), 500


@transaction_bp.route('/history/<account_id>', methods=['GET'])
def get_transaction_history(account_id):
    """Get transaction history for an account"""
    try:
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        return jsonify({
            'account_id': account_id,
            'transactions': [],
            'total': 0,
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_transaction_history: {str(e)}")
        return jsonify({'error': str(e)}), 500

