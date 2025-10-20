"""
Real-time Updates Module for Protocol Bank
Handles WebSocket connections and real-time data streaming
"""

import logging
import json
from datetime import datetime
from enum import Enum
from typing import Dict, List, Set
import asyncio

logger = logging.getLogger(__name__)


class EventType(Enum):
    """Real-time event types"""
    TRANSACTION_CREATED = "transaction_created"
    TRANSACTION_UPDATED = "transaction_updated"
    TRANSACTION_COMPLETED = "transaction_completed"
    BALANCE_UPDATED = "balance_updated"
    PRICE_UPDATED = "price_updated"
    ORDER_CREATED = "order_created"
    ORDER_FILLED = "order_filled"
    LOAN_APPROVED = "loan_approved"
    LOAN_REPAID = "loan_repaid"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_SENT = "payment_sent"
    STREAMING_PAYMENT_PROGRESS = "streaming_payment_progress"
    ALERT = "alert"
    NOTIFICATION = "notification"


class RealtimeUpdateManager:
    """Manage real-time updates and WebSocket connections"""
    
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.connections: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids
        self.subscriptions: Dict[str, Set[str]] = {}  # channel -> set of user_ids
    
    def subscribe_user(self, user_id: str, connection_id: str, channels: List[str] = None):
        """Subscribe user to real-time updates"""
        try:
            # Add connection for user
            if user_id not in self.connections:
                self.connections[user_id] = set()
            self.connections[user_id].add(connection_id)
            
            # Subscribe to channels
            if channels:
                for channel in channels:
                    if channel not in self.subscriptions:
                        self.subscriptions[channel] = set()
                    self.subscriptions[channel].add(user_id)
            
            logger.info(f"User {user_id} subscribed with connection {connection_id}")
            
            return {
                'status': 'success',
                'message': f'Subscribed to {len(channels) if channels else 0} channels'
            }
            
        except Exception as e:
            logger.error(f"Error subscribing user: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def unsubscribe_user(self, user_id: str, connection_id: str):
        """Unsubscribe user from real-time updates"""
        try:
            if user_id in self.connections:
                self.connections[user_id].discard(connection_id)
                if not self.connections[user_id]:
                    del self.connections[user_id]
            
            logger.info(f"User {user_id} unsubscribed from connection {connection_id}")
            
            return {
                'status': 'success',
                'message': 'Unsubscribed successfully'
            }
            
        except Exception as e:
            logger.error(f"Error unsubscribing user: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    # ==================== Event Broadcasting ====================
    
    def broadcast_transaction_event(self, user_id: str, event_type: EventType, transaction_data: dict):
        """Broadcast transaction event to user"""
        try:
            event = {
                'type': event_type.value,
                'data': transaction_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self._broadcast_to_user(user_id, event)
            
            # Also cache in Redis for persistence
            if self.redis:
                event_id = f"{user_id}_{event_type.value}_{datetime.utcnow().timestamp()}"
                self.redis.setex(
                    f"event:{event_id}",
                    86400,  # 24 hours
                    json.dumps(event)
                )
            
            logger.info(f"Transaction event broadcasted: {event_type.value} for user {user_id}")
            
            return {'status': 'success', 'message': 'Event broadcasted'}
            
        except Exception as e:
            logger.error(f"Error broadcasting transaction event: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def broadcast_balance_update(self, user_id: str, account_id: str, new_balance: float, currency: str):
        """Broadcast balance update event"""
        try:
            event = {
                'type': EventType.BALANCE_UPDATED.value,
                'data': {
                    'account_id': account_id,
                    'new_balance': str(new_balance),
                    'currency': currency,
                    'updated_at': datetime.utcnow().isoformat()
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self._broadcast_to_user(user_id, event)
            
            logger.info(f"Balance update broadcasted for user {user_id}")
            
            return {'status': 'success', 'message': 'Balance update broadcasted'}
            
        except Exception as e:
            logger.error(f"Error broadcasting balance update: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def broadcast_price_update(self, token: str, price: float, change_percent: float):
        """Broadcast price update to all subscribed users"""
        try:
            event = {
                'type': EventType.PRICE_UPDATED.value,
                'data': {
                    'token': token,
                    'price': str(price),
                    'change_percent': str(change_percent),
                    'updated_at': datetime.utcnow().isoformat()
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Broadcast to all subscribed users
            channel = f"price:{token}"
            if channel in self.subscriptions:
                for user_id in self.subscriptions[channel]:
                    self._broadcast_to_user(user_id, event)
            
            logger.info(f"Price update broadcasted for {token}")
            
            return {'status': 'success', 'message': 'Price update broadcasted'}
            
        except Exception as e:
            logger.error(f"Error broadcasting price update: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def broadcast_streaming_payment_progress(self, user_id: str, streaming_payment_id: str, 
                                            paid_amount: float, remaining_amount: float):
        """Broadcast streaming payment progress"""
        try:
            event = {
                'type': EventType.STREAMING_PAYMENT_PROGRESS.value,
                'data': {
                    'streaming_payment_id': streaming_payment_id,
                    'paid_amount': str(paid_amount),
                    'remaining_amount': str(remaining_amount),
                    'progress_percent': str((paid_amount / (paid_amount + remaining_amount)) * 100),
                    'updated_at': datetime.utcnow().isoformat()
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self._broadcast_to_user(user_id, event)
            
            logger.info(f"Streaming payment progress broadcasted for user {user_id}")
            
            return {'status': 'success', 'message': 'Streaming payment progress broadcasted'}
            
        except Exception as e:
            logger.error(f"Error broadcasting streaming payment progress: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def broadcast_notification(self, user_id: str, title: str, message: str, notification_type: str = 'info'):
        """Broadcast notification to user"""
        try:
            event = {
                'type': EventType.NOTIFICATION.value,
                'data': {
                    'title': title,
                    'message': message,
                    'notification_type': notification_type,
                    'created_at': datetime.utcnow().isoformat()
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self._broadcast_to_user(user_id, event)
            
            # Store notification in Redis
            if self.redis:
                notification_id = f"{user_id}_notif_{datetime.utcnow().timestamp()}"
                self.redis.setex(
                    f"notification:{notification_id}",
                    86400 * 30,  # 30 days
                    json.dumps(event)
                )
            
            logger.info(f"Notification broadcasted to user {user_id}")
            
            return {'status': 'success', 'message': 'Notification broadcasted'}
            
        except Exception as e:
            logger.error(f"Error broadcasting notification: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def broadcast_alert(self, user_id: str, alert_type: str, message: str, severity: str = 'warning'):
        """Broadcast alert to user"""
        try:
            event = {
                'type': EventType.ALERT.value,
                'data': {
                    'alert_type': alert_type,
                    'message': message,
                    'severity': severity,
                    'created_at': datetime.utcnow().isoformat()
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self._broadcast_to_user(user_id, event)
            
            logger.info(f"Alert broadcasted to user {user_id}")
            
            return {'status': 'success', 'message': 'Alert broadcasted'}
            
        except Exception as e:
            logger.error(f"Error broadcasting alert: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    # ==================== Helper Methods ====================
    
    def _broadcast_to_user(self, user_id: str, event: dict):
        """Broadcast event to user's connections"""
        try:
            if user_id in self.connections:
                for connection_id in self.connections[user_id]:
                    # In production, use WebSocket to send message
                    logger.debug(f"Sending event to {user_id} via {connection_id}: {event['type']}")
            
        except Exception as e:
            logger.error(f"Error broadcasting to user: {str(e)}")
    
    def get_user_events(self, user_id: str, limit: int = 50):
        """Get recent events for user"""
        try:
            events = []
            
            if self.redis:
                # Retrieve events from Redis
                # This is a simplified example
                pass
            
            return {
                'status': 'success',
                'events': events,
                'total': len(events)
            }
            
        except Exception as e:
            logger.error(f"Error retrieving user events: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def get_active_connections(self, user_id: str = None):
        """Get active WebSocket connections"""
        try:
            if user_id:
                count = len(self.connections.get(user_id, set()))
            else:
                count = sum(len(conns) for conns in self.connections.values())
            
            return {
                'status': 'success',
                'active_connections': count
            }
            
        except Exception as e:
            logger.error(f"Error getting active connections: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def clear_user_connections(self, user_id: str):
        """Clear all connections for user (e.g., on logout)"""
        try:
            if user_id in self.connections:
                del self.connections[user_id]
            
            # Remove from all subscriptions
            for channel in list(self.subscriptions.keys()):
                self.subscriptions[channel].discard(user_id)
                if not self.subscriptions[channel]:
                    del self.subscriptions[channel]
            
            logger.info(f"Cleared all connections for user {user_id}")
            
            return {'status': 'success', 'message': 'Connections cleared'}
            
        except Exception as e:
            logger.error(f"Error clearing user connections: {str(e)}")
            return {'status': 'error', 'message': str(e)}

