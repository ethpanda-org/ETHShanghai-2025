import base64
import hashlib
import secrets
from datetime import datetime, timedelta
from flask import current_app
import requests
import json

class FaceRecognitionService:
    """Face recognition service integration"""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        # Configuration for different face recognition providers
        app.config.setdefault('FACE_RECOGNITION_PROVIDER', 'aws_rekognition')
        app.config.setdefault('AWS_REKOGNITION_REGION', 'us-east-1')
        app.config.setdefault('FACE_RECOGNITION_CONFIDENCE_THRESHOLD', 85.0)
        app.config.setdefault('FACE_RECOGNITION_MAX_FACES', 1)
        app.config.setdefault('LIVENESS_DETECTION_ENABLED', True)
    
    def register_face(self, user_id, image_data, image_format='base64'):
        """Register a user's face for recognition"""
        try:
            # Validate image
            if not self._validate_image(image_data, image_format):
                return {'success': False, 'error': 'Invalid image format'}
            
            # Detect face and extract features
            face_data = self._extract_face_features(image_data, image_format)
            if not face_data['success']:
                return face_data
            
            # Check for liveness (anti-spoofing)
            if current_app.config['LIVENESS_DETECTION_ENABLED']:
                liveness_result = self._check_liveness(image_data, image_format)
                if not liveness_result['is_live']:
                    return {
                        'success': False, 
                        'error': 'Liveness check failed',
                        'details': liveness_result
                    }
            
            # Store face template (in production, encrypt this data)
            face_template = {
                'user_id': user_id,
                'face_encoding': face_data['encoding'],
                'confidence_score': face_data['confidence'],
                'created_at': datetime.utcnow().isoformat(),
                'provider': current_app.config['FACE_RECOGNITION_PROVIDER'],
                'template_version': '1.0'
            }
            
            # In production, store in secure database with encryption
            template_id = self._store_face_template(face_template)
            
            return {
                'success': True,
                'template_id': template_id,
                'confidence': face_data['confidence']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def verify_face(self, user_id, image_data, image_format='base64'):
        """Verify a face against registered template"""
        try:
            # Validate image
            if not self._validate_image(image_data, image_format):
                return {'success': False, 'error': 'Invalid image format'}
            
            # Check for liveness
            if current_app.config['LIVENESS_DETECTION_ENABLED']:
                liveness_result = self._check_liveness(image_data, image_format)
                if not liveness_result['is_live']:
                    return {
                        'success': False,
                        'error': 'Liveness check failed',
                        'is_live': False
                    }
            
            # Extract features from verification image
            face_data = self._extract_face_features(image_data, image_format)
            if not face_data['success']:
                return face_data
            
            # Get stored face template
            stored_template = self._get_face_template(user_id)
            if not stored_template:
                return {'success': False, 'error': 'No face template found for user'}
            
            # Compare faces
            similarity_score = self._compare_faces(
                face_data['encoding'], 
                stored_template['face_encoding']
            )
            
            # Determine if verification passed
            threshold = current_app.config['FACE_RECOGNITION_CONFIDENCE_THRESHOLD']
            verification_passed = similarity_score >= threshold
            
            return {
                'success': True,
                'verified': verification_passed,
                'confidence': similarity_score,
                'threshold': threshold,
                'is_live': liveness_result.get('is_live', True)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _validate_image(self, image_data, image_format):
        """Validate image format and size"""
        if image_format == 'base64':
            try:
                # Decode base64 to check validity
                image_bytes = base64.b64decode(image_data)
                # Check file size (max 5MB)
                if len(image_bytes) > 5 * 1024 * 1024:
                    return False
                return True
            except:
                return False
        return False
    
    def _extract_face_features(self, image_data, image_format):
        """Extract face features using configured provider"""
        provider = current_app.config['FACE_RECOGNITION_PROVIDER']
        
        if provider == 'aws_rekognition':
            return self._aws_rekognition_extract(image_data, image_format)
        elif provider == 'face_plus_plus':
            return self._face_plus_plus_extract(image_data, image_format)
        elif provider == 'azure_face':
            return self._azure_face_extract(image_data, image_format)
        else:
            # Demo implementation
            return self._demo_extract_features(image_data, image_format)
    
    def _demo_extract_features(self, image_data, image_format):
        """Demo face feature extraction (for development)"""
        # Generate a mock face encoding
        mock_encoding = hashlib.sha256(image_data.encode()).hexdigest()
        
        return {
            'success': True,
            'encoding': mock_encoding,
            'confidence': 95.5,
            'face_count': 1
        }
    
    def _aws_rekognition_extract(self, image_data, image_format):
        """Extract features using AWS Rekognition"""
        # This would integrate with AWS Rekognition API
        # For demo, return mock data
        return {
            'success': True,
            'encoding': f"aws_encoding_{secrets.token_hex(16)}",
            'confidence': 92.3,
            'face_count': 1
        }
    
    def _face_plus_plus_extract(self, image_data, image_format):
        """Extract features using Face++ API"""
        # This would integrate with Face++ API
        return {
            'success': True,
            'encoding': f"facepp_encoding_{secrets.token_hex(16)}",
            'confidence': 94.1,
            'face_count': 1
        }
    
    def _azure_face_extract(self, image_data, image_format):
        """Extract features using Azure Face API"""
        # This would integrate with Azure Face API
        return {
            'success': True,
            'encoding': f"azure_encoding_{secrets.token_hex(16)}",
            'confidence': 91.8,
            'face_count': 1
        }
    
    def _check_liveness(self, image_data, image_format):
        """Check if the face is from a live person (anti-spoofing)"""
        # In production, this would use specialized liveness detection
        # For demo, return positive result
        return {
            'is_live': True,
            'confidence': 88.5,
            'checks': ['blink_detection', 'texture_analysis', 'depth_analysis']
        }
    
    def _compare_faces(self, encoding1, encoding2):
        """Compare two face encodings and return similarity score"""
        # In production, this would use proper face comparison algorithms
        # For demo, simulate comparison based on string similarity
        if encoding1 == encoding2:
            return 100.0
        
        # Simple mock comparison
        common_chars = sum(1 for a, b in zip(encoding1, encoding2) if a == b)
        similarity = (common_chars / max(len(encoding1), len(encoding2))) * 100
        
        return min(similarity + secrets.randbelow(20), 100.0)
    
    def _store_face_template(self, face_template):
        """Store face template securely"""
        # In production, store in encrypted database
        # For demo, generate template ID
        template_id = f"template_{secrets.token_hex(8)}"
        
        # Mock storage (in production, use encrypted database)
        # encrypted_template = encrypt_data(json.dumps(face_template))
        # db.store_face_template(template_id, encrypted_template)
        
        return template_id
    
    def _get_face_template(self, user_id):
        """Retrieve stored face template for user"""
        # In production, retrieve from encrypted database
        # For demo, return mock template
        return {
            'user_id': user_id,
            'face_encoding': f"stored_encoding_{user_id}",
            'confidence_score': 95.0,
            'created_at': datetime.utcnow().isoformat()
        }

class BiometricSecurity:
    """Additional biometric security measures"""
    
    @staticmethod
    def generate_biometric_challenge():
        """Generate a challenge for biometric verification"""
        challenges = [
            {'type': 'blink', 'instruction': 'Please blink twice'},
            {'type': 'smile', 'instruction': 'Please smile'},
            {'type': 'turn_head', 'instruction': 'Please turn your head left, then right'},
            {'type': 'nod', 'instruction': 'Please nod your head up and down'}
        ]
        
        challenge = secrets.choice(challenges)
        challenge['challenge_id'] = secrets.token_hex(8)
        challenge['expires_at'] = (datetime.utcnow() + timedelta(minutes=2)).isoformat()
        
        return challenge
    
    @staticmethod
    def verify_biometric_challenge(challenge_id, response_data):
        """Verify biometric challenge response"""
        # In production, this would analyze the response video/images
        # For demo, return success
        return {
            'success': True,
            'challenge_id': challenge_id,
            'verified': True,
            'confidence': 92.5
        }
    
    @staticmethod
    def assess_biometric_risk(verification_result, user_history):
        """Assess risk based on biometric verification"""
        risk_factors = []
        risk_score = 0
        
        # Check confidence score
        if verification_result.get('confidence', 0) < 85:
            risk_score += 30
            risk_factors.append('low_confidence')
        
        # Check liveness
        if not verification_result.get('is_live', True):
            risk_score += 50
            risk_factors.append('liveness_failed')
        
        # Check verification history
        # In production, analyze user's biometric verification patterns
        
        return {
            'risk_score': risk_score,
            'risk_factors': risk_factors,
            'risk_level': 'high' if risk_score >= 40 else 'medium' if risk_score >= 20 else 'low'
        }

# Global face recognition service instance
face_recognition_service = FaceRecognitionService()

def face_auth_required(f):
    """Decorator to require face authentication"""
    from functools import wraps
    from flask import request, jsonify
    
    @wraps(f)
    def decorated(*args, **kwargs):
        # Check if face verification data is provided
        face_data = request.json.get('face_verification')
        if not face_data:
            return jsonify({'error': 'Face verification required'}), 401
        
        # Verify face
        user_id = getattr(request, 'current_user_id', None)
        if not user_id:
            return jsonify({'error': 'User authentication required'}), 401
        
        verification_result = face_recognition_service.verify_face(
            user_id, 
            face_data.get('image'), 
            face_data.get('format', 'base64')
        )
        
        if not verification_result.get('success') or not verification_result.get('verified'):
            return jsonify({
                'error': 'Face verification failed',
                'details': verification_result
            }), 401
        
        # Add verification result to request context
        request.face_verification = verification_result
        
        return f(*args, **kwargs)
    
    return decorated

