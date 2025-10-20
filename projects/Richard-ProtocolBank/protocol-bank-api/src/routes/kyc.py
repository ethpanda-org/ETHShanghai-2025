from flask import Blueprint, request, jsonify
from src.models.user import db, User
from src.models.kyc import KYCVerification, PaymentMethod
import uuid
from datetime import datetime, date
from decimal import Decimal

kyc_bp = Blueprint('kyc', __name__)

@kyc_bp.route('/kyc/verification', methods=['GET'])
def get_kyc_verification():
    """Get KYC verification status for a user"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    kyc = KYCVerification.query.filter_by(user_id=user_id).first()
    if not kyc:
        return jsonify({'error': 'KYC verification not found'}), 404
    
    return jsonify(kyc.to_dict())

@kyc_bp.route('/kyc/verification', methods=['POST'])
def create_kyc_verification():
    """Create or update KYC verification"""
    data = request.get_json()
    
    required_fields = ['user_id', 'first_name', 'last_name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Check if KYC already exists
    kyc = KYCVerification.query.filter_by(user_id=data['user_id']).first()
    
    if kyc:
        # Update existing KYC
        kyc.first_name = data['first_name']
        kyc.last_name = data['last_name']
        kyc.phone_number = data.get('phone_number')
        kyc.address = data.get('address')
        kyc.nationality = data.get('nationality')
        kyc.document_type = data.get('document_type')
        kyc.document_number = data.get('document_number')
        kyc.updated_at = datetime.utcnow()
        
        if data.get('date_of_birth'):
            kyc.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        
        if data.get('document_expiry'):
            kyc.document_expiry = datetime.strptime(data['document_expiry'], '%Y-%m-%d').date()
    else:
        # Create new KYC
        kyc = KYCVerification(
            id=str(uuid.uuid4()),
            user_id=data['user_id'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone_number=data.get('phone_number'),
            address=data.get('address'),
            nationality=data.get('nationality'),
            document_type=data.get('document_type'),
            document_number=data.get('document_number')
        )
        
        if data.get('date_of_birth'):
            kyc.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        
        if data.get('document_expiry'):
            kyc.document_expiry = datetime.strptime(data['document_expiry'], '%Y-%m-%d').date()
        
        db.session.add(kyc)
    
    db.session.commit()
    return jsonify(kyc.to_dict()), 201

@kyc_bp.route('/kyc/verification/<user_id>/status', methods=['PUT'])
def update_kyc_status(user_id):
    """Update KYC verification status"""
    data = request.get_json()
    
    kyc = KYCVerification.query.filter_by(user_id=user_id).first()
    if not kyc:
        return jsonify({'error': 'KYC verification not found'}), 404
    
    if 'status' in data:
        kyc.status = data['status']
        if data['status'] == 'approved':
            kyc.verified_at = datetime.utcnow()
            # Update user verification status
            user = User.query.get(user_id)
            if user:
                user.is_verified = True
    
    if 'verification_level' in data:
        kyc.verification_level = data['verification_level']
    
    if 'risk_score' in data:
        kyc.risk_score = data['risk_score']
    
    if 'risk_level' in data:
        kyc.risk_level = data['risk_level']
    
    if 'verification_notes' in data:
        kyc.verification_notes = data['verification_notes']
    
    kyc.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(kyc.to_dict())

@kyc_bp.route('/kyc/face-recognition', methods=['POST'])
def setup_face_recognition():
    """Setup or update face recognition data"""
    data = request.get_json()
    
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    kyc = KYCVerification.query.filter_by(user_id=user_id).first()
    if not kyc:
        return jsonify({'error': 'KYC verification not found'}), 404
    
    kyc.face_recognition_data = data.get('face_data')
    kyc.face_verification_status = 'verified'
    kyc.updated_at = datetime.utcnow()
    
    # Update user face recognition status
    user = User.query.get(user_id)
    if user:
        user.face_recognition_enabled = True
    
    db.session.commit()
    
    return jsonify({'message': 'Face recognition setup successful'})

@kyc_bp.route('/payment-methods', methods=['GET'])
def get_payment_methods():
    """Get payment methods for a user"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    methods = PaymentMethod.query.filter_by(user_id=user_id, is_active=True).all()
    return jsonify([method.to_dict() for method in methods])

@kyc_bp.route('/payment-methods', methods=['POST'])
def create_payment_method():
    """Create a new payment method"""
    data = request.get_json()
    
    required_fields = ['user_id', 'method_type', 'method_name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # If this is set as default, unset other defaults
    if data.get('is_default', False):
        PaymentMethod.query.filter_by(user_id=data['user_id'], is_default=True).update({'is_default': False})
    
    method = PaymentMethod(
        id=str(uuid.uuid4()),
        user_id=data['user_id'],
        method_type=data['method_type'],
        method_name=data['method_name'],
        is_default=data.get('is_default', False),
        card_last_four=data.get('card_last_four'),
        bank_account_mask=data.get('bank_account_mask'),
        nfc_device_id=data.get('nfc_device_id'),
        face_template_id=data.get('face_template_id'),
        daily_limit=Decimal(str(data.get('daily_limit', 1000))),
        monthly_limit=Decimal(str(data.get('monthly_limit', 10000))),
        single_transaction_limit=Decimal(str(data.get('single_transaction_limit', 500))),
        requires_2fa=data.get('requires_2fa', False),
        requires_biometric=data.get('requires_biometric', False),
        payment_metadata=data.get('metadata')
    )
    
    db.session.add(method)
    db.session.commit()
    
    return jsonify(method.to_dict()), 201

@kyc_bp.route('/payment-methods/<method_id>', methods=['PUT'])
def update_payment_method(method_id):
    """Update payment method settings"""
    data = request.get_json()
    
    method = PaymentMethod.query.get(method_id)
    if not method:
        return jsonify({'error': 'Payment method not found'}), 404
    
    # If setting as default, unset other defaults for this user
    if data.get('is_default', False):
        PaymentMethod.query.filter_by(user_id=method.user_id, is_default=True).update({'is_default': False})
    
    # Update fields
    updatable_fields = ['method_name', 'is_active', 'is_default', 'daily_limit', 
                       'monthly_limit', 'single_transaction_limit', 'requires_2fa', 'requires_biometric']
    
    for field in updatable_fields:
        if field in data:
            if field in ['daily_limit', 'monthly_limit', 'single_transaction_limit']:
                setattr(method, field, Decimal(str(data[field])))
            else:
                setattr(method, field, data[field])
    
    method.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(method.to_dict())

@kyc_bp.route('/payment-methods/<method_id>', methods=['DELETE'])
def delete_payment_method(method_id):
    """Delete (deactivate) a payment method"""
    method = PaymentMethod.query.get(method_id)
    if not method:
        return jsonify({'error': 'Payment method not found'}), 404
    
    method.is_active = False
    method.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Payment method deactivated'})

@kyc_bp.route('/compliance/summary/<user_id>', methods=['GET'])
def get_compliance_summary(user_id):
    """Get compliance summary for dashboard"""
    kyc = KYCVerification.query.filter_by(user_id=user_id).first()
    payment_methods = PaymentMethod.query.filter_by(user_id=user_id, is_active=True).all()
    
    summary = {
        'kyc_status': kyc.status if kyc else 'not_started',
        'verification_level': kyc.verification_level if kyc else 'none',
        'risk_level': kyc.risk_level if kyc else 'unknown',
        'face_recognition_status': kyc.face_verification_status if kyc else 'not_setup',
        'payment_methods_count': len(payment_methods),
        'nfc_enabled': any(pm.method_type == 'nfc' for pm in payment_methods),
        'face_payment_enabled': any(pm.method_type == 'face_recognition' for pm in payment_methods),
        'compliance_checks': {
            'pep_check': kyc.pep_check if kyc else False,
            'sanctions_check': kyc.sanctions_check if kyc else False,
            'adverse_media_check': kyc.adverse_media_check if kyc else False
        }
    }
    
    return jsonify(summary)

