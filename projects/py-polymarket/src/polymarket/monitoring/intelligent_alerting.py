#!/usr/bin/env python3
"""
Intelligent Alerting System
Advanced alerting system with machine learning-based anomaly detection and adaptive thresholds
"""

import asyncio
import logging
import time
import json
from typing import Dict, Any, List, Optional, Tuple, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import statistics
from collections import deque, defaultdict
import threading
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

import aiohttp
import numpy as np
from scipy import stats
import yaml


logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertCategory(Enum):
    """Alert categories"""
    SYSTEM = "system"
    TRADING = "trading"
    BUSINESS = "business"
    SECURITY = "security"
    PERFORMANCE = "performance"
    EXTERNAL = "external"


class AlertStatus(Enum):
    """Alert status"""
    ACTIVE = "active"
    RESOLVED = "resolved"
    ACKNOWLEDGED = "acknowledged"
    SILENCED = "silenced"


@dataclass
class AlertRule:
    """Alert rule definition"""
    name: str
    metric_name: str
    condition: str  # >, <, ==, !=, contains, anomaly
    threshold: float
    severity: AlertSeverity
    category: AlertCategory
    description: str
    duration: int = 60  # seconds
    cooldown: int = 300  # seconds
    adaptive: bool = False  # Use adaptive thresholds
    enabled: bool = True
    tags: List[str] = None
    notification_channels: List[str] = None


@dataclass
class Alert:
    """Alert instance"""
    id: str
    rule_name: str
    metric_name: str
    current_value: float
    threshold: float
    severity: AlertSeverity
    category: AlertCategory
    message: str
    status: AlertStatus
    created_at: datetime
    last_updated: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    metadata: Dict[str, Any] = None
    notification_sent: bool = False


class MetricBuffer:
    """Buffer for storing metric values for analysis"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.values = deque(maxlen=max_size)
        self.timestamps = deque(maxlen=max_size)
        self.lock = threading.RLock()
    
    def add_value(self, value: float, timestamp: float = None):
        """Add a value to the buffer"""
        with self.lock:
            timestamp = timestamp or time.time()
            self.values.append(value)
            self.timestamps.append(timestamp)
    
    def get_recent_values(self, duration_seconds: int = 300) -> List[float]:
        """Get values from the last N seconds"""
        with self.lock:
            cutoff_time = time.time() - duration_seconds
            recent_values = []
            
            for value, timestamp in zip(self.values, self.timestamps):
                if timestamp >= cutoff_time:
                    recent_values.append(value)
            
            return recent_values
    
    def get_statistics(self) -> Dict[str, float]:
        """Get basic statistics for buffered values"""
        with self.lock:
            if not self.values:
                return {}
            
            values = list(self.values)
            return {
                'mean': statistics.mean(values),
                'median': statistics.median(values),
                'stdev': statistics.stdev(values) if len(values) > 1 else 0.0,
                'min': min(values),
                'max': max(values),
                'count': len(values),
                'latest': values[-1] if values else 0.0
            }


class AnomalyDetector:
    """Machine learning-based anomaly detector"""
    
    def __init__(self, window_size: int = 100, sensitivity: float = 2.0):
        self.window_size = window_size
        self.sensitivity = sensitivity  # Number of standard deviations for anomaly
        self.baseline_stats = {}
        self.learning_phase = True
        self.min_samples = 50
    
    def update_baseline(self, metric_name: str, values: List[float]):
        """Update baseline statistics for a metric"""
        if len(values) < self.min_samples:
            return
        
        try:
            # Calculate baseline statistics
            mean = np.mean(values)
            std = np.std(values)
            median = np.median(values)
            q25, q75 = np.percentile(values, [25, 75])
            
            self.baseline_stats[metric_name] = {
                'mean': mean,
                'std': std,
                'median': median,
                'q25': q25,
                'q75': q75,
                'min': np.min(values),
                'max': np.max(values),
                'last_updated': time.time(),
                'sample_count': len(values)
            }
            
            if len(values) >= self.window_size:
                self.learning_phase = False
            
        except Exception as e:
            logger.error(f"Error updating baseline for {metric_name}: {e}")
    
    def detect_anomaly(self, metric_name: str, current_value: float) -> Tuple[bool, float]:
        """Detect if current value is anomalous"""
        if metric_name not in self.baseline_stats or self.learning_phase:
            return False, 0.0
        
        try:
            stats = self.baseline_stats[metric_name]
            mean = stats['mean']
            std = stats['std']
            
            if std == 0:
                return False, 0.0
            
            # Calculate z-score
            z_score = abs(current_value - mean) / std
            is_anomaly = z_score > self.sensitivity
            
            # Additional checks using IQR
            q25, q75 = stats['q25'], stats['q75']
            iqr = q75 - q25
            iqr_lower = q25 - 1.5 * iqr
            iqr_upper = q75 + 1.5 * iqr
            
            is_iqr_anomaly = current_value < iqr_lower or current_value > iqr_upper
            
            # Combine both methods
            final_anomaly = is_anomaly or is_iqr_anomaly
            confidence = min(z_score / self.sensitivity, 1.0) if is_anomaly else 0.0
            
            return final_anomaly, confidence
            
        except Exception as e:
            logger.error(f"Error detecting anomaly for {metric_name}: {e}")
            return False, 0.0
    
    def get_adaptive_threshold(self, metric_name: str, percentile: float = 95) -> float:
        """Get adaptive threshold based on historical data"""
        if metric_name not in self.baseline_stats:
            return 0.0
        
        try:
            stats = self.baseline_stats[metric_name]
            
            # Use percentile-based threshold
            if percentile == 95:
                return stats['mean'] + 2 * stats['std']
            elif percentile == 99:
                return stats['mean'] + 3 * stats['std']
            else:
                # Calculate custom percentile (approximate)
                return stats['mean'] + (percentile / 50 - 1) * stats['std']
                
        except Exception as e:
            logger.error(f"Error calculating adaptive threshold for {metric_name}: {e}")
            return 0.0


class NotificationChannel:
    """Base class for notification channels"""
    
    async def send_notification(self, alert: Alert) -> bool:
        """Send notification for an alert"""
        raise NotImplementedError


class EmailNotificationChannel(NotificationChannel):
    """Email notification channel"""
    
    def __init__(self, smtp_host: str, smtp_port: int, username: str, 
                 password: str, from_email: str, use_tls: bool = True):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        self.from_email = from_email
        self.use_tls = use_tls
    
    async def send_notification(self, alert: Alert, recipients: List[str]) -> bool:
        """Send email notification"""
        try:
            # Create message
            msg = MimeMultipart()
            msg['From'] = self.from_email
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.rule_name}"
            
            # Create email body
            body = self._create_email_body(alert)
            msg.attach(MimeText(body, 'html'))
            
            # Send email
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            if self.use_tls:
                server.starttls()
            server.login(self.username, self.password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email notification sent for alert {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            return False
    
    def _create_email_body(self, alert: Alert) -> str:
        """Create HTML email body"""
        severity_colors = {
            AlertSeverity.INFO: '#17a2b8',
            AlertSeverity.WARNING: '#ffc107',
            AlertSeverity.CRITICAL: '#dc3545',
            AlertSeverity.EMERGENCY: '#6f42c1'
        }
        
        color = severity_colors.get(alert.severity, '#6c757d')
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="border-left: 5px solid {color}; padding: 20px; margin: 20px;">
                <h2 style="color: {color}; margin-top: 0;">
                    {alert.severity.value.upper()} Alert: {alert.rule_name}
                </h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Alert ID:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{alert.id}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Metric:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{alert.metric_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Current Value:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{alert.current_value:.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Threshold:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{alert.threshold:.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{alert.category.value}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Time:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{alert.created_at.strftime('%Y-%m-%d %H:%M:%S')}</td>
                    </tr>
                </table>
                
                <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <h4>Description:</h4>
                    <p>{alert.message}</p>
                </div>
                
                {self._create_metadata_section(alert)}
            </div>
        </body>
        </html>
        """
    
    def _create_metadata_section(self, alert: Alert) -> str:
        """Create metadata section for email"""
        if not alert.metadata:
            return ""
        
        metadata_html = "<div style='margin-top: 15px;'><h4>Additional Information:</h4><ul>"
        for key, value in alert.metadata.items():
            metadata_html += f"<li><strong>{key}:</strong> {value}</li>"
        metadata_html += "</ul></div>"
        
        return metadata_html


class SlackNotificationChannel(NotificationChannel):
    """Slack notification channel"""
    
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
    
    async def send_notification(self, alert: Alert) -> bool:
        """Send Slack notification"""
        try:
            # Create Slack message
            message = self._create_slack_message(alert)
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.webhook_url, json=message) as response:
                    if response.status == 200:
                        logger.info(f"Slack notification sent for alert {alert.id}")
                        return True
                    else:
                        logger.error(f"Slack notification failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
            return False
    
    def _create_slack_message(self, alert: Alert) -> Dict[str, Any]:
        """Create Slack message payload"""
        severity_colors = {
            AlertSeverity.INFO: '#17a2b8',
            AlertSeverity.WARNING: '#ffc107',
            AlertSeverity.CRITICAL: '#dc3545',
            AlertSeverity.EMERGENCY: '#6f42c1'
        }
        
        severity_emojis = {
            AlertSeverity.INFO: ':information_source:',
            AlertSeverity.WARNING: ':warning:',
            AlertSeverity.CRITICAL: ':exclamation:',
            AlertSeverity.EMERGENCY: ':rotating_light:'
        }
        
        color = severity_colors.get(alert.severity, '#6c757d')
        emoji = severity_emojis.get(alert.severity, ':bell:')
        
        return {
            "attachments": [
                {
                    "color": color,
                    "title": f"{emoji} {alert.severity.value.upper()} Alert: {alert.rule_name}",
                    "fields": [
                        {
                            "title": "Metric",
                            "value": alert.metric_name,
                            "short": True
                        },
                        {
                            "title": "Current Value",
                            "value": f"{alert.current_value:.2f}",
                            "short": True
                        },
                        {
                            "title": "Threshold",
                            "value": f"{alert.threshold:.2f}",
                            "short": True
                        },
                        {
                            "title": "Category",
                            "value": alert.category.value,
                            "short": True
                        }
                    ],
                    "text": alert.message,
                    "footer": "Polymarket Trading System",
                    "ts": int(alert.created_at.timestamp())
                }
            ]
        }


class IntelligentAlertingSystem:
    """Intelligent alerting system with ML-based anomaly detection"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.metric_buffers: Dict[str, MetricBuffer] = defaultdict(lambda: MetricBuffer())
        self.anomaly_detector = AnomalyDetector()
        self.notification_channels: Dict[str, NotificationChannel] = {}
        
        # Alert management
        self.alert_counter = 0
        self.last_alert_times: Dict[str, float] = {}
        self.silenced_rules: Dict[str, float] = {}  # rule_name -> until_timestamp
        
        # Background tasks
        self.running = False
        self.evaluation_task = None
        self.cleanup_task = None
        self.learning_task = None
        
        # Configuration
        self.evaluation_interval = 15  # seconds
        self.cleanup_interval = 3600  # seconds
        self.learning_interval = 300  # seconds
        self.max_history_size = 10000
        
        # Load configuration if provided
        if config_file:
            self.load_configuration(config_file)
    
    def load_configuration(self, config_file: str):
        """Load alerting configuration from file"""
        try:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)
            
            # Load alert rules
            for rule_config in config.get('alert_rules', []):
                rule = AlertRule(
                    name=rule_config['name'],
                    metric_name=rule_config['metric_name'],
                    condition=rule_config['condition'],
                    threshold=rule_config['threshold'],
                    severity=AlertSeverity(rule_config['severity']),
                    category=AlertCategory(rule_config['category']),
                    description=rule_config['description'],
                    duration=rule_config.get('duration', 60),
                    cooldown=rule_config.get('cooldown', 300),
                    adaptive=rule_config.get('adaptive', False),
                    enabled=rule_config.get('enabled', True),
                    tags=rule_config.get('tags', []),
                    notification_channels=rule_config.get('notification_channels', [])
                )
                self.add_alert_rule(rule)
            
            # Load notification channels
            for channel_config in config.get('notification_channels', []):
                if channel_config['type'] == 'email':
                    channel = EmailNotificationChannel(
                        smtp_host=channel_config['smtp_host'],
                        smtp_port=channel_config['smtp_port'],
                        username=channel_config['username'],
                        password=channel_config['password'],
                        from_email=channel_config['from_email'],
                        use_tls=channel_config.get('use_tls', True)
                    )
                elif channel_config['type'] == 'slack':
                    channel = SlackNotificationChannel(
                        webhook_url=channel_config['webhook_url']
                    )
                else:
                    continue
                
                self.notification_channels[channel_config['name']] = channel
            
            # Load system configuration
            system_config = config.get('system', {})
            self.evaluation_interval = system_config.get('evaluation_interval', 15)
            self.cleanup_interval = system_config.get('cleanup_interval', 3600)
            self.learning_interval = system_config.get('learning_interval', 300)
            
            logger.info(f"Loaded configuration from {config_file}")
            
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
    
    def add_alert_rule(self, rule: AlertRule):
        """Add an alert rule"""
        self.rules[rule.name] = rule
        logger.info(f"Added alert rule: {rule.name}")
    
    def remove_alert_rule(self, rule_name: str):
        """Remove an alert rule"""
        if rule_name in self.rules:
            del self.rules[rule_name]
            logger.info(f"Removed alert rule: {rule_name}")
    
    def add_metric_value(self, metric_name: str, value: float, timestamp: float = None):
        """Add a metric value for evaluation"""
        self.metric_buffers[metric_name].add_value(value, timestamp)
    
    def silence_rule(self, rule_name: str, duration_seconds: int = 3600):
        """Silence an alert rule for a specified duration"""
        until_timestamp = time.time() + duration_seconds
        self.silenced_rules[rule_name] = until_timestamp
        logger.info(f"Silenced rule {rule_name} until {datetime.fromtimestamp(until_timestamp)}")
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str = "system"):
        """Acknowledge an alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_at = datetime.now()
            alert.acknowledged_by = acknowledged_by
            logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
    
    def resolve_alert(self, alert_id: str):
        """Resolve an alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.RESOLVED
            alert.resolved_at = datetime.now()
            
            # Move to history
            self.alert_history.append(alert)
            del self.active_alerts[alert_id]
            
            logger.info(f"Alert {alert_id} resolved")
    
    async def start(self):
        """Start the alerting system"""
        if self.running:
            return
        
        self.running = True
        
        # Start background tasks
        self.evaluation_task = asyncio.create_task(self._evaluation_loop())
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        self.learning_task = asyncio.create_task(self._learning_loop())
        
        logger.info("Intelligent alerting system started")
    
    async def stop(self):
        """Stop the alerting system"""
        self.running = False
        
        # Cancel tasks
        for task in [self.evaluation_task, self.cleanup_task, self.learning_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        logger.info("Intelligent alerting system stopped")
    
    async def _evaluation_loop(self):
        """Main evaluation loop"""
        while self.running:
            try:
                await self._evaluate_all_rules()
                await asyncio.sleep(self.evaluation_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in evaluation loop: {e}")
                await asyncio.sleep(self.evaluation_interval)
    
    async def _cleanup_loop(self):
        """Cleanup old alerts and data"""
        while self.running:
            try:
                await self._cleanup_old_data()
                await asyncio.sleep(self.cleanup_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                await asyncio.sleep(self.cleanup_interval)
    
    async def _learning_loop(self):
        """Machine learning and adaptation loop"""
        while self.running:
            try:
                await self._update_ml_models()
                await asyncio.sleep(self.learning_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in learning loop: {e}")
                await asyncio.sleep(self.learning_interval)
    
    async def _evaluate_all_rules(self):
        """Evaluate all alert rules"""
        for rule_name, rule in self.rules.items():
            if not rule.enabled:
                continue
            
            # Check if rule is silenced
            if rule_name in self.silenced_rules:
                if time.time() < self.silenced_rules[rule_name]:
                    continue
                else:
                    del self.silenced_rules[rule_name]
            
            await self._evaluate_rule(rule)
    
    async def _evaluate_rule(self, rule: AlertRule):
        """Evaluate a single alert rule"""
        try:
            metric_buffer = self.metric_buffers.get(rule.metric_name)
            if not metric_buffer:
                return
            
            recent_values = metric_buffer.get_recent_values(rule.duration)
            if not recent_values:
                return
            
            current_value = recent_values[-1]
            
            # Check if alert should be triggered
            should_alert = await self._check_alert_condition(rule, current_value, recent_values)
            
            existing_alert = self._find_active_alert(rule.name)
            
            if should_alert and not existing_alert:
                # Create new alert
                await self._create_alert(rule, current_value)
            elif not should_alert and existing_alert:
                # Resolve existing alert
                self.resolve_alert(existing_alert.id)
            
        except Exception as e:
            logger.error(f"Error evaluating rule {rule.name}: {e}")
    
    async def _check_alert_condition(self, rule: AlertRule, current_value: float, 
                                   recent_values: List[float]) -> bool:
        """Check if alert condition is met"""
        try:
            threshold = rule.threshold
            
            # Use adaptive threshold if enabled
            if rule.adaptive:
                adaptive_threshold = self.anomaly_detector.get_adaptive_threshold(rule.metric_name)
                if adaptive_threshold > 0:
                    threshold = adaptive_threshold
            
            # Check condition
            if rule.condition == '>':
                return current_value > threshold
            elif rule.condition == '<':
                return current_value < threshold
            elif rule.condition == '==':
                return abs(current_value - threshold) < 0.001
            elif rule.condition == '!=':
                return abs(current_value - threshold) >= 0.001
            elif rule.condition == 'anomaly':
                is_anomaly, confidence = self.anomaly_detector.detect_anomaly(rule.metric_name, current_value)
                return is_anomaly and confidence > (threshold / 100.0)
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking alert condition for {rule.name}: {e}")
            return False
    
    def _find_active_alert(self, rule_name: str) -> Optional[Alert]:
        """Find active alert for a rule"""
        for alert in self.active_alerts.values():
            if alert.rule_name == rule_name and alert.status == AlertStatus.ACTIVE:
                return alert
        return None
    
    async def _create_alert(self, rule: AlertRule, current_value: float):
        """Create a new alert"""
        try:
            # Check cooldown
            if rule.name in self.last_alert_times:
                time_since_last = time.time() - self.last_alert_times[rule.name]
                if time_since_last < rule.cooldown:
                    return
            
            # Create alert
            self.alert_counter += 1
            alert_id = f"alert_{self.alert_counter}_{int(time.time())}"
            
            # Get additional metadata
            metadata = self._collect_alert_metadata(rule, current_value)
            
            alert = Alert(
                id=alert_id,
                rule_name=rule.name,
                metric_name=rule.metric_name,
                current_value=current_value,
                threshold=rule.threshold,
                severity=rule.severity,
                category=rule.category,
                message=rule.description,
                status=AlertStatus.ACTIVE,
                created_at=datetime.now(),
                last_updated=datetime.now(),
                metadata=metadata
            )
            
            self.active_alerts[alert_id] = alert
            self.last_alert_times[rule.name] = time.time()
            
            # Send notifications
            await self._send_alert_notifications(alert, rule)
            
            logger.warning(f"Alert created: {alert_id} - {rule.name}")
            
        except Exception as e:
            logger.error(f"Error creating alert for rule {rule.name}: {e}")
    
    def _collect_alert_metadata(self, rule: AlertRule, current_value: float) -> Dict[str, Any]:
        """Collect additional metadata for the alert"""
        try:
            metric_buffer = self.metric_buffers.get(rule.metric_name)
            if not metric_buffer:
                return {}
            
            stats = metric_buffer.get_statistics()
            
            metadata = {
                'rule_tags': rule.tags or [],
                'metric_statistics': stats,
                'alert_frequency': self._calculate_alert_frequency(rule.name),
                'system_load': self._get_system_load(),
                'related_metrics': self._get_related_metrics(rule.metric_name)
            }
            
            # Add anomaly information if applicable
            if rule.condition == 'anomaly':
                is_anomaly, confidence = self.anomaly_detector.detect_anomaly(rule.metric_name, current_value)
                metadata['anomaly_confidence'] = confidence
                metadata['anomaly_baseline'] = self.anomaly_detector.baseline_stats.get(rule.metric_name, {})
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error collecting alert metadata: {e}")
            return {}
    
    def _calculate_alert_frequency(self, rule_name: str) -> float:
        """Calculate alert frequency for a rule"""
        try:
            # Count alerts in the last 24 hours
            cutoff_time = datetime.now() - timedelta(hours=24)
            count = 0
            
            for alert in self.alert_history:
                if alert.rule_name == rule_name and alert.created_at >= cutoff_time:
                    count += 1
            
            # Include active alerts
            for alert in self.active_alerts.values():
                if alert.rule_name == rule_name and alert.created_at >= cutoff_time:
                    count += 1
            
            return count / 24.0  # alerts per hour
            
        except Exception:
            return 0.0
    
    def _get_system_load(self) -> Dict[str, Any]:
        """Get current system load information"""
        try:
            import psutil
            return {
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'active_alerts': len(self.active_alerts),
                'total_rules': len(self.rules)
            }
        except Exception:
            return {}
    
    def _get_related_metrics(self, metric_name: str) -> List[str]:
        """Get names of related metrics"""
        # Simple implementation - find metrics with similar names
        related = []
        for name in self.metric_buffers.keys():
            if name != metric_name and (metric_name in name or name in metric_name):
                related.append(name)
        return related[:5]  # Limit to 5 related metrics
    
    async def _send_alert_notifications(self, alert: Alert, rule: AlertRule):
        """Send notifications for an alert"""
        try:
            if not rule.notification_channels:
                return
            
            for channel_name in rule.notification_channels:
                if channel_name in self.notification_channels:
                    channel = self.notification_channels[channel_name]
                    success = await channel.send_notification(alert)
                    
                    if success:
                        alert.notification_sent = True
                        logger.info(f"Notification sent via {channel_name} for alert {alert.id}")
                    else:
                        logger.error(f"Failed to send notification via {channel_name} for alert {alert.id}")
            
        except Exception as e:
            logger.error(f"Error sending alert notifications: {e}")
    
    async def _cleanup_old_data(self):
        """Clean up old alerts and metric data"""
        try:
            # Clean up old alert history
            if len(self.alert_history) > self.max_history_size:
                self.alert_history = self.alert_history[-self.max_history_size:]
            
            # Clean up resolved alerts older than 7 days
            cutoff_time = datetime.now() - timedelta(days=7)
            self.alert_history = [
                alert for alert in self.alert_history
                if not alert.resolved_at or alert.resolved_at > cutoff_time
            ]
            
            logger.debug("Completed alert data cleanup")
            
        except Exception as e:
            logger.error(f"Error in cleanup: {e}")
    
    async def _update_ml_models(self):
        """Update machine learning models with recent data"""
        try:
            for metric_name, buffer in self.metric_buffers.items():
                # Get recent values for baseline update
                values = buffer.get_recent_values(3600)  # Last hour
                if len(values) >= 20:  # Minimum samples required
                    self.anomaly_detector.update_baseline(metric_name, values)
            
            logger.debug("Updated ML models with recent data")
            
        except Exception as e:
            logger.error(f"Error updating ML models: {e}")
    
    # API Methods for external integration
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get list of active alerts"""
        return [asdict(alert) for alert in self.active_alerts.values()]
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alerting system statistics"""
        try:
            total_alerts = len(self.alert_history) + len(self.active_alerts)
            
            # Count by severity
            severity_counts = defaultdict(int)
            for alert in list(self.active_alerts.values()) + self.alert_history:
                severity_counts[alert.severity.value] += 1
            
            # Count by category
            category_counts = defaultdict(int)
            for alert in list(self.active_alerts.values()) + self.alert_history:
                category_counts[alert.category.value] += 1
            
            return {
                'total_alerts': total_alerts,
                'active_alerts': len(self.active_alerts),
                'resolved_alerts': len(self.alert_history),
                'total_rules': len(self.rules),
                'enabled_rules': len([r for r in self.rules.values() if r.enabled]),
                'silenced_rules': len(self.silenced_rules),
                'by_severity': dict(severity_counts),
                'by_category': dict(category_counts),
                'notification_channels': len(self.notification_channels),
                'metrics_being_monitored': len(self.metric_buffers)
            }
            
        except Exception as e:
            logger.error(f"Error getting alert statistics: {e}")
            return {}


# Global intelligent alerting system instance
intelligent_alerting_system = IntelligentAlertingSystem()


if __name__ == "__main__":
    # Example usage
    async def test_intelligent_alerting():
        # Create email notification channel
        email_channel = EmailNotificationChannel(
            smtp_host="smtp.gmail.com",
            smtp_port=587,
            username="alerts@example.com",
            password="password",
            from_email="alerts@example.com"
        )
        
        # Create Slack notification channel
        slack_channel = SlackNotificationChannel(
            webhook_url="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
        )
        
        # Add notification channels
        intelligent_alerting_system.notification_channels["email"] = email_channel
        intelligent_alerting_system.notification_channels["slack"] = slack_channel
        
        # Create alert rules
        cpu_rule = AlertRule(
            name="high_cpu_usage",
            metric_name="cpu_usage_percent",
            condition=">",
            threshold=80.0,
            severity=AlertSeverity.WARNING,
            category=AlertCategory.PERFORMANCE,
            description="CPU usage is above 80%",
            notification_channels=["email", "slack"]
        )
        
        anomaly_rule = AlertRule(
            name="trading_volume_anomaly",
            metric_name="trading_volume",
            condition="anomaly",
            threshold=95.0,  # 95% confidence
            severity=AlertSeverity.CRITICAL,
            category=AlertCategory.BUSINESS,
            description="Anomalous trading volume detected",
            adaptive=True,
            notification_channels=["slack"]
        )
        
        # Add rules
        intelligent_alerting_system.add_alert_rule(cpu_rule)
        intelligent_alerting_system.add_alert_rule(anomaly_rule)
        
        # Start alerting system
        await intelligent_alerting_system.start()
        
        # Simulate metric data
        for i in range(100):
            # Normal CPU usage
            cpu_value = 60 + (i % 10) * 2
            intelligent_alerting_system.add_metric_value("cpu_usage_percent", cpu_value)
            
            # Normal trading volume with occasional anomaly
            base_volume = 10000
            if i == 80:  # Inject anomaly
                volume = base_volume * 5
            else:
                volume = base_volume + (i % 20) * 100
            
            intelligent_alerting_system.add_metric_value("trading_volume", volume)
            
            await asyncio.sleep(1)
        
        # Wait for processing
        await asyncio.sleep(10)
        
        # Get statistics
        stats = intelligent_alerting_system.get_alert_statistics()
        print(f"Alert Statistics: {json.dumps(stats, indent=2)}")
        
        # Get active alerts
        active_alerts = intelligent_alerting_system.get_active_alerts()
        print(f"Active Alerts: {json.dumps(active_alerts, indent=2, default=str)}")
        
        # Stop alerting system
        await intelligent_alerting_system.stop()
    
    asyncio.run(test_intelligent_alerting())