from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from src.models.user import User, db
from src.utils.jwt_auth import jwt_auth, generate_device_fingerprint, SecurityLogger, RiskAssessment
from src.utils.face_recognition import face_recognition_service, BiometricSecurity
from src.utils.nfc_payment import nfc_payment_service
import secrets
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login with multiple authentication factors"""
    try:
        data = request.get_json()
        
        # Basic validation
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400
        
        # Find user
        user = User.query.filter_by(email=data['email']).first()
        if not user or not check_password_hash(user.password_hash, data['password']):
            SecurityLogger.log_login_attempt(
                data.get('email'), False, request.remote_addr, 
                request.headers.get('User-Agent'), 'password'
            )
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user is active
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Generate device fingerprint
        device_fingerprint = generate_device_fingerprint(request)
        
        # Assess login risk
        risk_assessment = RiskAssessment.assess_login_risk(
            user.id, request.remote_addr, device_fingerprint,
            request.headers.get('User-Agent')
        )
        
        # Determine required authentication factors
        required_factors = RiskAssessment.get_required_auth_factors(
            risk_assessment['risk_level']
        )
        
        # Check if additional authentication is required
        if len(required_factors) > 1:
            # Store partial login state
            partial_login_token = secrets.token_urlsafe(32)
            # In production, store in Redis with expiration
            
            return jsonify({
                'partial_login': True,
                'partial_token': partial_login_token,
                'required_factors': required_factors,
                'risk_assessment': risk_assessment,
                'message': 'Additional authentication required'
            }), 202
        
        # Generate tokens
        tokens = jwt_auth.generate_tokens(user.id, device_fingerprint)
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Log successful login
        SecurityLogger.log_login_attempt(
            user.id, True, request.remote_addr,
            request.headers.get('User-Agent'), 'password'
        )
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'tokens': tokens,
            'risk_level': risk_assessment['risk_level']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/mfa/verify', methods=['POST'])
def verify_mfa():
    """Verify multi-factor authentication"""
    try:
        data = request.get_json()
        partial_token = data.get('partial_token')
        auth_method = data.get('method')  # 'face', 'sms', 'totp'
        
        if not partial_token:
            return jsonify({'error': 'Partial token required'}), 400
        
        # In production, retrieve partial login state from Redis
        # For demo, extract user info from token (insecure, for demo only)
        
        if auth_method == 'face':
            return verify_face_authentication(data)
        elif auth_method == 'sms':
            return verify_sms_authentication(data)
        elif auth_method == 'totp':
            return verify_totp_authentication(data)
        else:
            return jsonify({'error': 'Unsupported authentication method'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def verify_face_authentication(data):
    """Verify face authentication"""
    user_id = data.get('user_id')  # In production, get from partial login state
    face_data = data.get('face_data')
    
    if not face_data or not face_data.get('image'):
        return jsonify({'error': 'Face image required'}), 400
    
    # Verify face
    verification_result = face_recognition_service.verify_face(
        user_id, face_data['image'], face_data.get('format', 'base64')
    )
    
    # Log MFA attempt
    SecurityLogger.log_mfa_attempt(
        user_id, 'face', verification_result.get('verified', False),
        request.remote_addr
    )
    
    if not verification_result.get('success') or not verification_result.get('verified'):
        return jsonify({
            'error': 'Face verification failed',
            'details': verification_result
        }), 401
    
    # Complete login
    return complete_mfa_login(user_id, verification_result)

def verify_sms_authentication(data):
    """Verify SMS authentication"""
    user_id = data.get('user_id')
    sms_code = data.get('sms_code')
    
    # In production, verify SMS code against stored code
    # For demo, accept any 6-digit code
    if not sms_code or len(sms_code) != 6 or not sms_code.isdigit():
        SecurityLogger.log_mfa_attempt(user_id, 'sms', False, request.remote_addr)
        return jsonify({'error': 'Invalid SMS code'}), 401
    
    SecurityLogger.log_mfa_attempt(user_id, 'sms', True, request.remote_addr)
    return complete_mfa_login(user_id, {'method': 'sms', 'verified': True})

def verify_totp_authentication(data):
    """Verify TOTP (Time-based One-Time Password) authentication"""
    user_id = data.get('user_id')
    totp_code = data.get('totp_code')
    
    # In production, verify TOTP code using user's secret
    # For demo, accept any 6-digit code
    if not totp_code or len(totp_code) != 6 or not totp_code.isdigit():
        SecurityLogger.log_mfa_attempt(user_id, 'totp', False, request.remote_addr)
        return jsonify({'error': 'Invalid TOTP code'}), 401
    
    SecurityLogger.log_mfa_attempt(user_id, 'totp', True, request.remote_addr)
    return complete_mfa_login(user_id, {'method': 'totp', 'verified': True})

def complete_mfa_login(user_id, verification_result):
    """Complete MFA login process"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Generate device fingerprint
    device_fingerprint = generate_device_fingerprint(request)
    
    # Generate tokens
    tokens = jwt_auth.generate_tokens(user.id, device_fingerprint)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'tokens': tokens,
        'mfa_verification': verification_result
    })

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 409
        
        # Create new user
        user = User(
            username=data['email'],  # Use email as username
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone_number=data.get('phone_number'),
            user_type=data.get('user_type', 'individual')
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Generate tokens
        device_fingerprint = generate_device_fingerprint(request)
        tokens = jwt_auth.generate_tokens(user.id, device_fingerprint)
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'tokens': tokens,
            'message': 'Registration successful'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token"""
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'error': 'Refresh token required'}), 400
        
        # Refresh tokens
        new_tokens = jwt_auth.refresh_access_token(refresh_token)
        if not new_tokens:
            return jsonify({'error': 'Invalid refresh token'}), 401
        
        # Log token refresh
        payload = jwt_auth.verify_token(refresh_token, 'refresh')
        if payload:
            SecurityLogger.log_token_refresh(payload['user_id'], request.remote_addr)
        
        return jsonify({
            'success': True,
            'tokens': new_tokens
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """User logout"""
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header:
            token = auth_header.split(" ")[1]
            jwt_auth.revoke_token(token)
        
        return jsonify({'success': True, 'message': 'Logged out successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/face/register', methods=['POST'])
def register_face():
    """Register user's face for biometric authentication"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        face_image = data.get('face_image')
        
        if not user_id or not face_image:
            return jsonify({'error': 'User ID and face image required'}), 400
        
        # Register face
        result = face_recognition_service.register_face(
            user_id, face_image, data.get('format', 'base64')
        )
        
        if result['success']:
            # Update user's face recognition status
            user = User.query.get(user_id)
            if user:
                user.face_recognition_enabled = True
                db.session.commit()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/face/challenge', methods=['POST'])
def face_challenge():
    """Generate biometric challenge for enhanced security"""
    try:
        challenge = BiometricSecurity.generate_biometric_challenge()
        return jsonify({
            'success': True,
            'challenge': challenge
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/nfc/setup', methods=['POST'])
def setup_nfc_payment():
    """Setup NFC payment for user"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        card_data = data.get('card_data')
        device_info = data.get('device_info')
        
        if not all([user_id, card_data, device_info]):
            return jsonify({'error': 'User ID, card data, and device info required'}), 400
        
        # Setup NFC payment
        from src.utils.nfc_payment import contactless_payment_manager
        
        payment_method_data = {
            'type': 'nfc',
            'card_number': card_data['card_number'],
            'device_info': device_info
        }
        
        result = contactless_payment_manager.setup_contactless_payment(
            user_id, payment_method_data
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/security/status', methods=['GET'])
def security_status():
    """Get user's security status"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization required'}), 401
        
        token = auth_header.split(" ")[1]
        payload = jwt_auth.verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid token'}), 401
        
        user = User.query.get(payload['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        security_status = {
            'user_id': user.id,
            'two_factor_enabled': user.two_factor_enabled,
            'face_recognition_enabled': user.face_recognition_enabled,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'account_verified': user.is_verified,
            'security_score': calculate_security_score(user)
        }
        
        return jsonify({
            'success': True,
            'security_status': security_status
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_security_score(user):
    """Calculate user's security score"""
    score = 0
    
    # Base score for verified account
    if user.is_verified:
        score += 30
    
    # Two-factor authentication
    if user.two_factor_enabled:
        score += 25
    
    # Face recognition
    if user.face_recognition_enabled:
        score += 25
    
    # Recent login activity
    if user.last_login:
        days_since_login = (datetime.utcnow() - user.last_login).days
        if days_since_login < 7:
            score += 20
        elif days_since_login < 30:
            score += 10
    
    return min(score, 100)

