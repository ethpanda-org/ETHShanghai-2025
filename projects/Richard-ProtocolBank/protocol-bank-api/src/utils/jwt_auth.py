import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from src.models.user import User, db
import secrets
import hashlib

class JWTAuth:
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        app.config.setdefault('JWT_SECRET_KEY', secrets.token_urlsafe(32))
        app.config.setdefault('JWT_ACCESS_TOKEN_EXPIRES', datetime.timedelta(minutes=15))
        app.config.setdefault('JWT_REFRESH_TOKEN_EXPIRES', datetime.timedelta(days=30))
        app.config.setdefault('JWT_ALGORITHM', 'HS256')  # For demo, use RS256 in production
        
    def generate_tokens(self, user_id, device_fingerprint=None):
        """Generate access and refresh tokens for a user"""
        now = datetime.datetime.utcnow()
        
        # Generate unique token ID
        jti_access = secrets.token_urlsafe(16)
        jti_refresh = secrets.token_urlsafe(16)
        
        # Access token payload
        access_payload = {
            'user_id': user_id,
            'type': 'access',
            'iat': now,
            'exp': now + current_app.config['JWT_ACCESS_TOKEN_EXPIRES'],
            'jti': jti_access,
            'device_fp': device_fingerprint
        }
        
        # Refresh token payload
        refresh_payload = {
            'user_id': user_id,
            'type': 'refresh',
            'iat': now,
            'exp': now + current_app.config['JWT_REFRESH_TOKEN_EXPIRES'],
            'jti': jti_refresh,
            'device_fp': device_fingerprint
        }
        
        # Generate tokens
        access_token = jwt.encode(
            access_payload,
            current_app.config['JWT_SECRET_KEY'],
            algorithm=current_app.config['JWT_ALGORITHM']
        )
        
        refresh_token = jwt.encode(
            refresh_payload,
            current_app.config['JWT_SECRET_KEY'],
            algorithm=current_app.config['JWT_ALGORITHM']
        )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds()
        }
    
    def verify_token(self, token, token_type='access'):
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=[current_app.config['JWT_ALGORITHM']],
                options={'verify_exp': True}
            )
            
            # Verify token type
            if payload.get('type') != token_type:
                return None
            
            # Check if user exists
            user = User.query.get(payload['user_id'])
            if not user or not user.is_active:
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def refresh_access_token(self, refresh_token):
        """Generate new access token using refresh token"""
        payload = self.verify_token(refresh_token, 'refresh')
        if not payload:
            return None
        
        # Generate new access token
        return self.generate_tokens(
            payload['user_id'],
            payload.get('device_fp')
        )
    
    def revoke_token(self, token):
        """Add token to blacklist (implement with Redis in production)"""
        # For demo purposes, we'll just decode to get jti
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=[current_app.config['JWT_ALGORITHM']],
                options={'verify_exp': False}
            )
            # In production, store jti in Redis with expiration
            # redis_client.setex(f"blacklist:{payload['jti']}", 
            #                   payload['exp'] - time.time(), "revoked")
            return True
        except:
            return False

# Global JWT auth instance
jwt_auth = JWTAuth()

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        payload = jwt_auth.verify_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Add user info to request context
        request.current_user_id = payload['user_id']
        request.token_payload = payload
        
        return f(*args, **kwargs)
    
    return decorated

def generate_device_fingerprint(request):
    """Generate device fingerprint from request headers"""
    fingerprint_data = {
        'user_agent': request.headers.get('User-Agent', ''),
        'accept_language': request.headers.get('Accept-Language', ''),
        'accept_encoding': request.headers.get('Accept-Encoding', ''),
        'remote_addr': request.remote_addr or ''
    }
    
    # Create hash of fingerprint data
    fingerprint_string = '|'.join(fingerprint_data.values())
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:16]

def verify_device_fingerprint(token_fingerprint, request_fingerprint):
    """Verify device fingerprint matches"""
    return token_fingerprint == request_fingerprint

class SecurityLogger:
    """Log security events for monitoring"""
    
    @staticmethod
    def log_login_attempt(user_id, success, ip_address, user_agent, method='password'):
        """Log login attempt"""
        # In production, send to security monitoring system
        print(f"LOGIN_ATTEMPT: user_id={user_id}, success={success}, "
              f"ip={ip_address}, method={method}, ua={user_agent}")
    
    @staticmethod
    def log_token_refresh(user_id, ip_address):
        """Log token refresh"""
        print(f"TOKEN_REFRESH: user_id={user_id}, ip={ip_address}")
    
    @staticmethod
    def log_suspicious_activity(user_id, activity, details):
        """Log suspicious activity"""
        print(f"SUSPICIOUS_ACTIVITY: user_id={user_id}, activity={activity}, "
              f"details={details}")
    
    @staticmethod
    def log_mfa_attempt(user_id, method, success, ip_address):
        """Log MFA attempt"""
        print(f"MFA_ATTEMPT: user_id={user_id}, method={method}, "
              f"success={success}, ip={ip_address}")

class RiskAssessment:
    """Assess risk level for authentication requests"""
    
    @staticmethod
    def assess_login_risk(user_id, ip_address, device_fingerprint, user_agent):
        """Assess risk level for login attempt"""
        risk_score = 0
        risk_factors = []
        
        # Check for new device
        # In production, check against known devices in database
        risk_score += 20
        risk_factors.append("new_device")
        
        # Check for new location (IP-based)
        # In production, use IP geolocation service
        risk_score += 15
        risk_factors.append("new_location")
        
        # Check time of access
        current_hour = datetime.datetime.now().hour
        if current_hour < 6 or current_hour > 22:
            risk_score += 10
            risk_factors.append("unusual_time")
        
        # Determine risk level
        if risk_score >= 40:
            risk_level = "high"
        elif risk_score >= 20:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'risk_factors': risk_factors
        }
    
    @staticmethod
    def get_required_auth_factors(risk_level, transaction_amount=None):
        """Get required authentication factors based on risk"""
        if risk_level == "high" or (transaction_amount and transaction_amount > 10000):
            return ["password", "biometric", "sms"]
        elif risk_level == "medium" or (transaction_amount and transaction_amount > 1000):
            return ["password", "biometric"]
        else:
            return ["password"]

