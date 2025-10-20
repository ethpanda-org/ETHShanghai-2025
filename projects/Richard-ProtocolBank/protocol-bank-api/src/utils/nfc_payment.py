import secrets
import hashlib
import json
from datetime import datetime, timedelta
from flask import current_app
from cryptography.fernet import Fernet
import base64

class NFCPaymentService:
    """NFC Payment processing service"""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        app.config.setdefault('NFC_ENCRYPTION_KEY', Fernet.generate_key())
        app.config.setdefault('NFC_TOKEN_EXPIRY_MINUTES', 5)
        app.config.setdefault('NFC_MAX_TRANSACTION_AMOUNT', 1000.0)
        app.config.setdefault('NFC_DAILY_LIMIT', 5000.0)
        app.config.setdefault('NFC_REQUIRE_PIN_ABOVE', 100.0)
        
    def generate_payment_token(self, user_id, account_id, amount, merchant_info=None):
        """Generate secure NFC payment token"""
        try:
            # Create payment token data
            token_data = {
                'user_id': user_id,
                'account_id': account_id,
                'amount': float(amount),
                'merchant_info': merchant_info or {},
                'token_id': secrets.token_hex(16),
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(
                    minutes=current_app.config['NFC_TOKEN_EXPIRY_MINUTES']
                )).isoformat(),
                'nonce': secrets.token_hex(8)
            }
            
            # Encrypt token data
            cipher_suite = Fernet(current_app.config['NFC_ENCRYPTION_KEY'])
            encrypted_token = cipher_suite.encrypt(json.dumps(token_data).encode())
            
            # Create NFC-compatible token (base64 encoded)
            nfc_token = base64.b64encode(encrypted_token).decode()
            
            return {
                'success': True,
                'nfc_token': nfc_token,
                'token_id': token_data['token_id'],
                'expires_at': token_data['expires_at'],
                'amount': amount
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def process_nfc_payment(self, nfc_token, merchant_id, terminal_id, pin=None):
        """Process NFC payment transaction"""
        try:
            # Decrypt and validate token
            token_data = self._decrypt_nfc_token(nfc_token)
            if not token_data['success']:
                return token_data
            
            payment_data = token_data['data']
            
            # Validate token expiry
            expires_at = datetime.fromisoformat(payment_data['expires_at'])
            if datetime.utcnow() > expires_at:
                return {'success': False, 'error': 'Payment token expired'}
            
            # Check transaction limits
            limit_check = self._check_transaction_limits(
                payment_data['user_id'], 
                payment_data['amount']
            )
            if not limit_check['allowed']:
                return {
                    'success': False, 
                    'error': 'Transaction limit exceeded',
                    'details': limit_check
                }
            
            # Check if PIN is required
            if payment_data['amount'] > current_app.config['NFC_REQUIRE_PIN_ABOVE']:
                if not pin:
                    return {
                        'success': False, 
                        'error': 'PIN required for this transaction amount',
                        'pin_required': True
                    }
                
                # Verify PIN
                pin_valid = self._verify_pin(payment_data['user_id'], pin)
                if not pin_valid:
                    return {'success': False, 'error': 'Invalid PIN'}
            
            # Process the payment
            transaction_result = self._execute_payment(
                payment_data, merchant_id, terminal_id
            )
            
            # Log transaction
            self._log_nfc_transaction(payment_data, merchant_id, terminal_id, transaction_result)
            
            return transaction_result
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _decrypt_nfc_token(self, nfc_token):
        """Decrypt NFC payment token"""
        try:
            # Decode base64
            encrypted_data = base64.b64decode(nfc_token.encode())
            
            # Decrypt
            cipher_suite = Fernet(current_app.config['NFC_ENCRYPTION_KEY'])
            decrypted_data = cipher_suite.decrypt(encrypted_data)
            
            # Parse JSON
            token_data = json.loads(decrypted_data.decode())
            
            return {'success': True, 'data': token_data}
            
        except Exception as e:
            return {'success': False, 'error': f'Token decryption failed: {str(e)}'}
    
    def _check_transaction_limits(self, user_id, amount):
        """Check if transaction is within limits"""
        # Check single transaction limit
        max_amount = current_app.config['NFC_MAX_TRANSACTION_AMOUNT']
        if amount > max_amount:
            return {
                'allowed': False,
                'reason': 'single_transaction_limit',
                'limit': max_amount,
                'amount': amount
            }
        
        # Check daily limit (in production, query actual daily spending)
        daily_spent = self._get_daily_spending(user_id)
        daily_limit = current_app.config['NFC_DAILY_LIMIT']
        
        if daily_spent + amount > daily_limit:
            return {
                'allowed': False,
                'reason': 'daily_limit',
                'limit': daily_limit,
                'spent': daily_spent,
                'amount': amount
            }
        
        return {'allowed': True}
    
    def _get_daily_spending(self, user_id):
        """Get user's spending for today"""
        # In production, query database for today's transactions
        # For demo, return mock value
        return 150.0
    
    def _verify_pin(self, user_id, pin):
        """Verify user's PIN"""
        # In production, verify against stored PIN hash
        # For demo, accept any 4-digit PIN
        return len(pin) == 4 and pin.isdigit()
    
    def _execute_payment(self, payment_data, merchant_id, terminal_id):
        """Execute the actual payment transaction"""
        # In production, this would integrate with payment processor
        transaction_id = f"nfc_{secrets.token_hex(12)}"
        
        # Mock payment processing
        payment_result = {
            'success': True,
            'transaction_id': transaction_id,
            'amount': payment_data['amount'],
            'user_id': payment_data['user_id'],
            'account_id': payment_data['account_id'],
            'merchant_id': merchant_id,
            'terminal_id': terminal_id,
            'payment_method': 'nfc',
            'processed_at': datetime.utcnow().isoformat(),
            'status': 'completed'
        }
        
        return payment_result
    
    def _log_nfc_transaction(self, payment_data, merchant_id, terminal_id, result):
        """Log NFC transaction for security and audit"""
        log_entry = {
            'transaction_type': 'nfc_payment',
            'user_id': payment_data['user_id'],
            'amount': payment_data['amount'],
            'merchant_id': merchant_id,
            'terminal_id': terminal_id,
            'success': result.get('success', False),
            'transaction_id': result.get('transaction_id'),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # In production, store in audit log database
        print(f"NFC_TRANSACTION_LOG: {json.dumps(log_entry)}")

class NFCSecurityManager:
    """Manage NFC payment security features"""
    
    @staticmethod
    def generate_dynamic_cvv():
        """Generate dynamic CVV for NFC transactions"""
        # Generate time-based dynamic CVV
        timestamp = int(datetime.utcnow().timestamp() / 60)  # Change every minute
        cvv = str(timestamp)[-3:]  # Last 3 digits
        return cvv.zfill(3)
    
    @staticmethod
    def create_tokenized_card_data(card_number, user_id):
        """Create tokenized version of card data"""
        # In production, use proper tokenization service
        token_prefix = "4000"  # Mock token prefix
        token_suffix = secrets.token_hex(6)
        
        return {
            'token': f"{token_prefix}{token_suffix}",
            'last_four': card_number[-4:] if len(card_number) >= 4 else card_number,
            'token_type': 'nfc_payment',
            'created_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def validate_nfc_device(device_info):
        """Validate NFC-enabled device"""
        required_fields = ['device_id', 'nfc_capability', 'secure_element']
        
        for field in required_fields:
            if field not in device_info:
                return {'valid': False, 'error': f'Missing {field}'}
        
        # Check NFC capability
        if not device_info.get('nfc_capability'):
            return {'valid': False, 'error': 'Device does not support NFC'}
        
        # Check secure element
        if not device_info.get('secure_element'):
            return {'valid': False, 'error': 'Device lacks secure element'}
        
        return {'valid': True}
    
    @staticmethod
    def generate_transaction_cryptogram(transaction_data, key):
        """Generate transaction cryptogram for security"""
        # Create data string for cryptogram
        data_string = f"{transaction_data['amount']}{transaction_data['merchant_id']}{transaction_data['timestamp']}"
        
        # Generate HMAC
        import hmac
        cryptogram = hmac.new(
            key.encode() if isinstance(key, str) else key,
            data_string.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
        
        return cryptogram

class ContactlessPaymentManager:
    """Manage contactless payment methods including NFC"""
    
    def __init__(self):
        self.nfc_service = NFCPaymentService()
        self.security_manager = NFCSecurityManager()
    
    def setup_contactless_payment(self, user_id, payment_method_data):
        """Setup contactless payment for user"""
        try:
            # Validate payment method
            if payment_method_data['type'] not in ['nfc', 'qr_code', 'bluetooth']:
                return {'success': False, 'error': 'Unsupported payment method'}
            
            # For NFC setup
            if payment_method_data['type'] == 'nfc':
                device_validation = self.security_manager.validate_nfc_device(
                    payment_method_data.get('device_info', {})
                )
                
                if not device_validation['valid']:
                    return {'success': False, 'error': device_validation['error']}
                
                # Create tokenized card data
                tokenized_data = self.security_manager.create_tokenized_card_data(
                    payment_method_data['card_number'],
                    user_id
                )
                
                # Store payment method (in production, encrypt and store securely)
                payment_method_id = f"pm_{secrets.token_hex(8)}"
                
                return {
                    'success': True,
                    'payment_method_id': payment_method_id,
                    'token': tokenized_data['token'],
                    'last_four': tokenized_data['last_four'],
                    'type': 'nfc'
                }
            
            return {'success': False, 'error': 'Payment method setup not implemented'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def process_contactless_transaction(self, payment_data):
        """Process contactless transaction"""
        payment_type = payment_data.get('type')
        
        if payment_type == 'nfc':
            return self.nfc_service.process_nfc_payment(
                payment_data['nfc_token'],
                payment_data['merchant_id'],
                payment_data['terminal_id'],
                payment_data.get('pin')
            )
        
        return {'success': False, 'error': 'Unsupported payment type'}

# Global instances
nfc_payment_service = NFCPaymentService()
contactless_payment_manager = ContactlessPaymentManager()

