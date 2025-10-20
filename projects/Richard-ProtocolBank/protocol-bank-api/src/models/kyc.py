from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from src.models.user import db

class KYCVerification(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    verification_level = db.Column(db.String(20), default='none')  # 'none', 'basic', 'enhanced', 'premium'
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected', 'expired'
    risk_score = db.Column(db.Integer, default=0)  # 0-100, lower is better
    risk_level = db.Column(db.String(20), default='unknown')  # 'low', 'medium', 'high', 'unknown'
    
    # Personal Information
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    date_of_birth = db.Column(db.Date)
    nationality = db.Column(db.String(50))
    phone_number = db.Column(db.String(20))
    address = db.Column(db.Text)
    
    # Document Information
    document_type = db.Column(db.String(30))  # 'passport', 'driver_license', 'national_id'
    document_number = db.Column(db.String(50))
    document_expiry = db.Column(db.Date)
    document_front_url = db.Column(db.String(255))
    document_back_url = db.Column(db.String(255))
    
    # Biometric Information
    face_recognition_data = db.Column(db.JSON)  # Encoded face recognition data
    face_verification_status = db.Column(db.String(20), default='pending')  # 'pending', 'verified', 'failed'
    
    # Verification Details
    verification_provider = db.Column(db.String(50))  # 'jumio', 'onfido', 'sumsub', etc.
    provider_reference_id = db.Column(db.String(100))
    verification_notes = db.Column(db.Text)
    verified_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    
    # Compliance Flags
    pep_check = db.Column(db.Boolean, default=False)  # Politically Exposed Person
    sanctions_check = db.Column(db.Boolean, default=False)
    adverse_media_check = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('kyc_verification', uselist=False))

    def __repr__(self):
        return f'<KYCVerification {self.id} - {self.status}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'verification_level': self.verification_level,
            'status': self.status,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'nationality': self.nationality,
            'phone_number': self.phone_number,
            'address': self.address,
            'document_type': self.document_type,
            'document_number': self.document_number,
            'document_expiry': self.document_expiry.isoformat() if self.document_expiry else None,
            'face_verification_status': self.face_verification_status,
            'verification_provider': self.verification_provider,
            'provider_reference_id': self.provider_reference_id,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'pep_check': self.pep_check,
            'sanctions_check': self.sanctions_check,
            'adverse_media_check': self.adverse_media_check,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PaymentMethod(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    method_type = db.Column(db.String(20), nullable=False)  # 'nfc', 'face_recognition', 'card', 'bank_transfer'
    method_name = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    is_default = db.Column(db.Boolean, default=False)
    
    # Method-specific data
    card_last_four = db.Column(db.String(4))  # For card payments
    bank_account_mask = db.Column(db.String(20))  # For bank transfers
    nfc_device_id = db.Column(db.String(100))  # For NFC payments
    face_template_id = db.Column(db.String(100))  # For face recognition
    
    # Limits and settings
    daily_limit = db.Column(db.Numeric(20, 2), default=1000.00)
    monthly_limit = db.Column(db.Numeric(20, 2), default=10000.00)
    single_transaction_limit = db.Column(db.Numeric(20, 2), default=500.00)
    
    # Security settings
    requires_2fa = db.Column(db.Boolean, default=False)
    requires_biometric = db.Column(db.Boolean, default=False)
    
    payment_metadata = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='payment_methods')

    def __repr__(self):
        return f'<PaymentMethod {self.id} - {self.method_type}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'method_type': self.method_type,
            'method_name': self.method_name,
            'is_active': self.is_active,
            'is_default': self.is_default,
            'card_last_four': self.card_last_four,
            'bank_account_mask': self.bank_account_mask,
            'daily_limit': float(self.daily_limit) if self.daily_limit else None,
            'monthly_limit': float(self.monthly_limit) if self.monthly_limit else None,
            'single_transaction_limit': float(self.single_transaction_limit) if self.single_transaction_limit else None,
            'requires_2fa': self.requires_2fa,
            'requires_biometric': self.requires_biometric,
            'metadata': self.payment_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

