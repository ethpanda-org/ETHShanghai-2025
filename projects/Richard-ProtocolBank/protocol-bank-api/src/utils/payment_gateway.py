"""
Payment Gateway Integration Module for Protocol Bank
Supports Stripe, Adyen, WorldPay and other payment providers
"""

import logging
import os
from datetime import datetime
import hashlib
import json
from decimal import Decimal
from enum import Enum

logger = logging.getLogger(__name__)


class PaymentProvider(Enum):
    """Supported payment providers"""
    STRIPE = "stripe"
    ADYEN = "adyen"
    WORLDPAY = "worldpay"
    PAYPAL = "paypal"
    SQUARE = "square"


class PaymentGateway:
    """Handle payments through various gateway providers"""
    
    def __init__(self, provider=None, api_key=None, redis_client=None):
        self.provider = provider or os.getenv('PAYMENT_GATEWAY', 'stripe')
        self.api_key = api_key or os.getenv('PAYMENT_API_KEY')
        self.redis = redis_client
        self.sandbox_mode = os.getenv('PAYMENT_SANDBOX_MODE', 'true').lower() == 'true'
    
    # ==================== Stripe Integration ====================
    
    def stripe_create_payment_intent(self, amount, currency='USD', customer_id=None, metadata=None):
        """Create a Stripe payment intent"""
        try:
            # Placeholder - actual implementation uses stripe library
            # import stripe
            # stripe.api_key = self.api_key
            # intent = stripe.PaymentIntent.create(
            #     amount=int(amount * 100),  # Convert to cents
            #     currency=currency,
            #     customer=customer_id,
            #     metadata=metadata
            # )
            
            payment_intent_id = f"pi_{hashlib.sha256(f'{amount}{datetime.utcnow()}'.encode()).hexdigest()[:24]}"
            
            payment_intent = {
                'id': payment_intent_id,
                'amount': str(amount),
                'currency': currency,
                'status': 'requires_payment_method',
                'client_secret': hashlib.sha256(f"{payment_intent_id}{self.api_key}".encode()).hexdigest(),
                'created_at': datetime.utcnow().isoformat()
            }
            
            if self.redis:
                self.redis.setex(
                    f"payment_intent:{payment_intent_id}",
                    3600,
                    json.dumps(payment_intent)
                )
            
            logger.info(f"Stripe payment intent created: {payment_intent_id}")
            
            return {
                'status': 'success',
                'payment_intent_id': payment_intent_id,
                'client_secret': payment_intent['client_secret'],
                'amount': amount,
                'currency': currency
            }
            
        except Exception as e:
            logger.error(f"Error creating Stripe payment intent: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def stripe_confirm_payment(self, payment_intent_id, payment_method_id):
        """Confirm Stripe payment"""
        try:
            # Placeholder - actual implementation uses stripe library
            # import stripe
            # stripe.api_key = self.api_key
            # intent = stripe.PaymentIntent.confirm(
            #     payment_intent_id,
            #     payment_method=payment_method_id
            # )
            
            payment_intent = self._get_payment_intent(payment_intent_id)
            if not payment_intent:
                return {'status': 'error', 'message': 'Payment intent not found'}
            
            payment_intent['status'] = 'succeeded'
            payment_intent['payment_method_id'] = payment_method_id
            payment_intent['updated_at'] = datetime.utcnow().isoformat()
            
            if self.redis:
                self.redis.setex(
                    f"payment_intent:{payment_intent_id}",
                    3600,
                    json.dumps(payment_intent)
                )
            
            logger.info(f"Stripe payment confirmed: {payment_intent_id}")
            
            return {
                'status': 'success',
                'payment_intent_id': payment_intent_id,
                'payment_status': 'succeeded',
                'amount': payment_intent['amount'],
                'currency': payment_intent['currency']
            }
            
        except Exception as e:
            logger.error(f"Error confirming Stripe payment: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def stripe_refund_payment(self, payment_intent_id, amount=None):
        """Refund Stripe payment"""
        try:
            payment_intent = self._get_payment_intent(payment_intent_id)
            if not payment_intent:
                return {'status': 'error', 'message': 'Payment intent not found'}
            
            refund_amount = amount or payment_intent['amount']
            
            # Placeholder - actual implementation uses stripe library
            # import stripe
            # stripe.api_key = self.api_key
            # refund = stripe.Refund.create(
            #     payment_intent=payment_intent_id,
            #     amount=int(refund_amount * 100)
            # )
            
            refund_id = f"ref_{hashlib.sha256(f'{payment_intent_id}{datetime.utcnow()}'.encode()).hexdigest()[:24]}"
            
            refund = {
                'id': refund_id,
                'payment_intent_id': payment_intent_id,
                'amount': str(refund_amount),
                'status': 'succeeded',
                'created_at': datetime.utcnow().isoformat()
            }
            
            if self.redis:
                self.redis.setex(
                    f"refund:{refund_id}",
                    86400,
                    json.dumps(refund)
                )
            
            logger.info(f"Stripe refund created: {refund_id}")
            
            return {
                'status': 'success',
                'refund_id': refund_id,
                'amount': refund_amount,
                'refund_status': 'succeeded'
            }
            
        except Exception as e:
            logger.error(f"Error refunding Stripe payment: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    # ==================== Adyen Integration ====================
    
    def adyen_create_payment(self, amount, currency='USD', reference=None, metadata=None):
        """Create an Adyen payment"""
        try:
            # Placeholder - actual implementation uses Adyen library
            # from adyen import Client
            # client = Client(xapikey=self.api_key)
            # result = client.payment.create({...})
            
            payment_reference = reference or f"adyen_{hashlib.sha256(f'{amount}{datetime.utcnow()}'.encode()).hexdigest()[:24]}"
            
            payment = {
                'reference': payment_reference,
                'amount': str(amount),
                'currency': currency,
                'status': 'pending',
                'created_at': datetime.utcnow().isoformat()
            }
            
            if self.redis:
                self.redis.setex(
                    f"adyen_payment:{payment_reference}",
                    3600,
                    json.dumps(payment)
                )
            
            logger.info(f"Adyen payment created: {payment_reference}")
            
            return {
                'status': 'success',
                'payment_reference': payment_reference,
                'amount': amount,
                'currency': currency
            }
            
        except Exception as e:
            logger.error(f"Error creating Adyen payment: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    # ==================== WorldPay Integration ====================
    
    def worldpay_create_order(self, amount, currency='USD', order_code=None, metadata=None):
        """Create a WorldPay order"""
        try:
            # Placeholder - actual implementation uses WorldPay library
            order_code = order_code or f"wp_{hashlib.sha256(f'{amount}{datetime.utcnow()}'.encode()).hexdigest()[:24]}"
            
            order = {
                'orderCode': order_code,
                'amount': str(amount),
                'currency': currency,
                'status': 'pending',
                'created_at': datetime.utcnow().isoformat()
            }
            
            if self.redis:
                self.redis.setex(
                    f"worldpay_order:{order_code}",
                    3600,
                    json.dumps(order)
                )
            
            logger.info(f"WorldPay order created: {order_code}")
            
            return {
                'status': 'success',
                'order_code': order_code,
                'amount': amount,
                'currency': currency
            }
            
        except Exception as e:
            logger.error(f"Error creating WorldPay order: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    # ==================== Generic Payment Methods ====================
    
    def create_payment(self, amount, currency='USD', payment_method_type='card', metadata=None):
        """Create payment using configured provider"""
        try:
            if self.provider == PaymentProvider.STRIPE.value:
                return self.stripe_create_payment_intent(amount, currency, metadata=metadata)
            elif self.provider == PaymentProvider.ADYEN.value:
                return self.adyen_create_payment(amount, currency, metadata=metadata)
            elif self.provider == PaymentProvider.WORLDPAY.value:
                return self.worldpay_create_order(amount, currency, metadata=metadata)
            else:
                return {'status': 'error', 'message': f'Unsupported payment provider: {self.provider}'}
            
        except Exception as e:
            logger.error(f"Error creating payment: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def confirm_payment(self, payment_id, payment_method_id=None):
        """Confirm payment"""
        try:
            if self.provider == PaymentProvider.STRIPE.value:
                return self.stripe_confirm_payment(payment_id, payment_method_id)
            else:
                return {'status': 'error', 'message': f'Unsupported payment provider: {self.provider}'}
            
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def refund_payment(self, payment_id, amount=None):
        """Refund payment"""
        try:
            if self.provider == PaymentProvider.STRIPE.value:
                return self.stripe_refund_payment(payment_id, amount)
            else:
                return {'status': 'error', 'message': f'Unsupported payment provider: {self.provider}'}
            
        except Exception as e:
            logger.error(f"Error refunding payment: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    # ==================== Webhook Handling ====================
    
    def handle_payment_webhook(self, event_type, event_data):
        """Handle payment provider webhooks"""
        try:
            webhook_log = {
                'event_type': event_type,
                'event_data': event_data,
                'processed_at': datetime.utcnow().isoformat(),
                'status': 'processed'
            }
            
            if self.redis:
                webhook_id = hashlib.sha256(f"{event_type}{datetime.utcnow()}".encode()).hexdigest()[:16]
                self.redis.setex(
                    f"webhook:{webhook_id}",
                    86400,
                    json.dumps(webhook_log)
                )
            
            logger.info(f"Payment webhook processed: {event_type}")
            
            return {
                'status': 'success',
                'message': 'Webhook processed successfully'
            }
            
        except Exception as e:
            logger.error(f"Error handling payment webhook: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    # ==================== Helper Methods ====================
    
    def _get_payment_intent(self, payment_intent_id):
        """Get payment intent from cache"""
        try:
            if self.redis:
                data = self.redis.get(f"payment_intent:{payment_intent_id}")
                if data:
                    return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error retrieving payment intent: {str(e)}")
            return None
    
    def get_payment_status(self, payment_id):
        """Get payment status"""
        try:
            # Try to retrieve from various payment systems
            payment_intent = self._get_payment_intent(payment_id)
            if payment_intent:
                return {
                    'status': 'success',
                    'payment_id': payment_id,
                    'payment_status': payment_intent.get('status'),
                    'amount': payment_intent.get('amount'),
                    'currency': payment_intent.get('currency')
                }
            
            return {'status': 'error', 'message': 'Payment not found'}
            
        except Exception as e:
            logger.error(f"Error getting payment status: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def list_payments(self, limit=10, offset=0):
        """List recent payments"""
        try:
            # Placeholder - actual implementation would query database
            return {
                'status': 'success',
                'payments': [],
                'total': 0,
                'limit': limit,
                'offset': offset
            }
            
        except Exception as e:
            logger.error(f"Error listing payments: {str(e)}")
            return {'status': 'error', 'message': str(e)}

