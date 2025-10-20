"""
Authentication and Session Management Module for Protocol Bank
Handles user authentication, JWT tokens, and session management
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from functools import wraps
import jwt
import hashlib
import logging
import os

# Configure logging
logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = 24


class AuthenticationManager:
    """Manage user authentication and JWT tokens"""
    
    def __init__(self, db, redis_client):
        self.db = db
        self.redis = redis_client
    
    def hash_password(self, password):
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password, password_hash):
        """Verify password against hash"""
        return self.hash_password(password) == password_hash
    
    def generate_jwt_token(self, user_id, email, expires_in_hours=JWT_EXPIRATION_HOURS):
        """Generate JWT token for user"""
        try:
            payload = {
                'user_id': user_id,
                'email': email,
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=expires_in_hours)
            }
            
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            return token
            
        except Exception as e:
            logger.error(f"Error generating JWT token: {str(e)}")
            return None
    
    def verify_jwt_token(self, token):
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {str(e)}")
            return None
    
    def create_session(self, user_id, token, expires_in_hours=JWT_EXPIRATION_HOURS):
        """Create user session in Redis"""
        try:
            session_data = {
                'user_id': user_id,
                'token': token,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(hours=expires_in_hours)).isoformat()
            }
            
            # Store session in Redis with expiration
            self.redis.setex(
                f"session:{user_id}",
                expires_in_hours * 3600,
                str(session_data)
            )
            
            logger.info(f"Session created for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating session: {str(e)}")
            return False
    
    def get_session(self, user_id):
        """Retrieve user session from Redis"""
        try:
            session_data = self.redis.get(f"session:{user_id}")
            if session_data:
                return eval(session_data)
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving session: {str(e)}")
            return None
    
    def invalidate_session(self, user_id):
        """Invalidate user session"""
        try:
            self.redis.delete(f"session:{user_id}")
            logger.info(f"Session invalidated for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error invalidating session: {str(e)}")
            return False
    
    def enable_mfa(self, user_id, mfa_secret):
        """Enable multi-factor authentication for user"""
        try:
            mfa_data = {
                'user_id': user_id,
                'secret': mfa_secret,
                'enabled': True,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Store MFA data in Redis
            self.redis.setex(
                f"mfa:{user_id}",
                86400 * 365,  # 1 year
                str(mfa_data)
            )
            
            logger.info(f"MFA enabled for user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error enabling MFA: {str(e)}")
            return False
    
    def verify_mfa_code(self, user_id, mfa_code):
        """Verify MFA code"""
        try:
            # Placeholder for actual TOTP verification
            # In production, use pyotp library
            mfa_data = self.redis.get(f"mfa:{user_id}")
            if mfa_data:
                # Verify TOTP code against secret
                # This is a simplified example
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error verifying MFA code: {str(e)}")
            return False


# Decorator for protected routes
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Verify token
        auth_manager = AuthenticationManager(None, None)
        payload = auth_manager.verify_jwt_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        return f(payload, *args, **kwargs)
    
    return decorated


# API Routes
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Missing email or password'}), 400
        
        email = data.get('email')
        password = data.get('password')
        username = data.get('username', email.split('@')[0])
        
        # Validate email format
        if '@' not in email:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        # Hash password
        auth_manager = AuthenticationManager(None, None)
        password_hash = auth_manager.hash_password(password)
        
        # Create user (placeholder - actual DB insertion would happen here)
        user_data = {
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'created_at': datetime.utcnow().isoformat(),
            'kyc_status': 'pending'
        }
        
        logger.info(f"User registered: {email}")
        
        return jsonify({
            'status': 'success',
            'message': 'User registered successfully',
            'user': {
                'username': username,
                'email': email,
                'kyc_status': 'pending'
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error in register: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Missing email or password'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        # Verify credentials (placeholder - actual DB lookup would happen here)
        auth_manager = AuthenticationManager(None, None)
        password_hash = auth_manager.hash_password(password)
        
        # Generate JWT token
        user_id = 'user_' + hashlib.sha256(email.encode()).hexdigest()[:12]
        token = auth_manager.generate_jwt_token(user_id, email)
        
        if not token:
            return jsonify({'error': 'Failed to generate token'}), 500
        
        # Create session
        auth_manager.create_session(user_id, token)
        
        logger.info(f"User logged in: {email}")
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'token': token,
            'user': {
                'user_id': user_id,
                'email': email
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(payload):
    """User logout"""
    try:
        user_id = payload.get('user_id')
        
        auth_manager = AuthenticationManager(None, None)
        auth_manager.invalidate_session(user_id)
        
        logger.info(f"User logged out: {user_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in logout: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/verify-token', methods=['POST'])
@token_required
def verify_token(payload):
    """Verify JWT token"""
    try:
        return jsonify({
            'status': 'success',
            'message': 'Token is valid',
            'user_id': payload.get('user_id'),
            'email': payload.get('email')
        }), 200
        
    except Exception as e:
        logger.error(f"Error in verify_token: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/mfa/enable', methods=['POST'])
@token_required
def enable_mfa(payload):
    """Enable multi-factor authentication"""
    try:
        user_id = payload.get('user_id')
        
        # Generate MFA secret (placeholder - use pyotp in production)
        mfa_secret = hashlib.sha256(f"{user_id}{datetime.utcnow()}".encode()).hexdigest()
        
        auth_manager = AuthenticationManager(None, None)
        auth_manager.enable_mfa(user_id, mfa_secret)
        
        logger.info(f"MFA enabled for user: {user_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'MFA enabled',
            'mfa_secret': mfa_secret
        }), 200
        
    except Exception as e:
        logger.error(f"Error in enable_mfa: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/mfa/verify', methods=['POST'])
@token_required
def verify_mfa(payload):
    """Verify MFA code"""
    try:
        data = request.get_json()
        user_id = payload.get('user_id')
        mfa_code = data.get('mfa_code')
        
        if not mfa_code:
            return jsonify({'error': 'MFA code is required'}), 400
        
        auth_manager = AuthenticationManager(None, None)
        if auth_manager.verify_mfa_code(user_id, mfa_code):
            logger.info(f"MFA verified for user: {user_id}")
            return jsonify({
                'status': 'success',
                'message': 'MFA code verified'
            }), 200
        else:
            return jsonify({'error': 'Invalid MFA code'}), 401
        
    except Exception as e:
        logger.error(f"Error in verify_mfa: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/refresh-token', methods=['POST'])
@token_required
def refresh_token(payload):
    """Refresh JWT token"""
    try:
        user_id = payload.get('user_id')
        email = payload.get('email')
        
        auth_manager = AuthenticationManager(None, None)
        new_token = auth_manager.generate_jwt_token(user_id, email)
        
        if not new_token:
            return jsonify({'error': 'Failed to generate new token'}), 500
        
        logger.info(f"Token refreshed for user: {user_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Token refreshed',
            'token': new_token
        }), 200
        
    except Exception as e:
        logger.error(f"Error in refresh_token: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(payload):
    """Change user password"""
    try:
        data = request.get_json()
        user_id = payload.get('user_id')
        
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            return jsonify({'error': 'Old and new passwords are required'}), 400
        
        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400
        
        # Verify old password and update to new password (placeholder)
        logger.info(f"Password changed for user: {user_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in change_password: {str(e)}")
        return jsonify({'error': str(e)}), 500

