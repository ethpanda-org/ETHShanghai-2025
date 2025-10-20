#!/usr/bin/env python3
"""
Application-Level Metrics Collector
Comprehensive Prometheus metrics for Polymarket Trading System
"""

import asyncio
import logging
import time
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from enum import Enum
import threading
import json
from datetime import datetime, timedelta

from prometheus_client import (
    Counter, Gauge, Histogram, Summary, CollectorRegistry, 
    generate_latest, CONTENT_TYPE_LATEST
)
import psutil
import aiohttp


logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Metric type enumeration"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


@dataclass
class MetricDefinition:
    """Metric definition"""
    name: str
    metric_type: MetricType
    description: str
    labels: List[str] = None
    buckets: List[float] = None  # For histograms


class ApplicationMetricsCollector:
    """Application-level metrics collector for Prometheus"""
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or CollectorRegistry()
        self.metrics: Dict[str, Any] = {}
        self._lock = threading.RLock()
        
        # Initialize core metrics
        self._initialize_core_metrics()
        
        # Performance tracking
        self.start_time = time.time()
        self.last_update = time.time()
        
        # Business metrics cache
        self.business_metrics_cache = {}
        self.cache_ttl = 60  # Cache TTL in seconds
        
    def _initialize_core_metrics(self):
        """Initialize core application metrics"""
        
        # Trading Performance Metrics
        self.metrics['trading_total_trades'] = Counter(
            'trading_total_trades_total',
            'Total number of trades executed',
            ['strategy', 'market_type', 'direction'],
            registry=self.registry
        )
        
        self.metrics['trading_successful_trades'] = Counter(
            'trading_successful_trades_total',
            'Total number of successful trades',
            ['strategy', 'market_type'],
            registry=self.registry
        )
        
        self.metrics['trading_failed_trades'] = Counter(
            'trading_failed_trades_total',
            'Total number of failed trades',
            ['strategy', 'reason'],
            registry=self.registry
        )
        
        self.metrics['trading_active_positions'] = Gauge(
            'trading_active_positions_total',
            'Current number of active positions',
            ['strategy', 'market_type'],
            registry=self.registry
        )
        
        self.metrics['trading_total_pnl'] = Gauge(
            'trading_total_pnl',
            'Total profit and loss in USD',
            registry=self.registry
        )
        
        self.metrics['trading_unrealized_pnl'] = Gauge(
            'trading_unrealized_pnl',
            'Unrealized profit and loss in USD',
            registry=self.registry
        )
        
        self.metrics['trading_realized_pnl'] = Gauge(
            'trading_realized_pnl',
            'Realized profit and loss in USD',
            registry=self.registry
        )
        
        self.metrics['trading_success_rate'] = Gauge(
            'trading_success_rate',
            'Trading success rate as percentage',
            ['strategy'],
            registry=self.registry
        )
        
        # Portfolio Metrics
        self.metrics['portfolio_value'] = Gauge(
            'portfolio_value_usd',
            'Total portfolio value in USD',
            registry=self.registry
        )
        
        self.metrics['portfolio_cash_balance'] = Gauge(
            'portfolio_cash_balance_usd',
            'Available cash balance in USD',
            registry=self.registry
        )
        
        self.metrics['portfolio_risk_score'] = Gauge(
            'portfolio_risk_score',
            'Portfolio risk score (0-1)',
            registry=self.registry
        )
        
        # Strategy Performance Metrics
        self.metrics['strategy_signals_generated'] = Counter(
            'strategy_signals_generated_total',
            'Total number of trading signals generated',
            ['strategy', 'signal_type'],
            registry=self.registry
        )
        
        self.metrics['strategy_signal_strength'] = Histogram(
            'strategy_signal_strength',
            'Distribution of signal strengths',
            ['strategy'],
            buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            registry=self.registry
        )
        
        self.metrics['strategy_execution_time'] = Histogram(
            'strategy_execution_time_seconds',
            'Time taken to execute strategy calculations',
            ['strategy'],
            buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
            registry=self.registry
        )
        
        # Market Data Metrics
        self.metrics['market_data_requests'] = Counter(
            'market_data_requests_total',
            'Total market data requests',
            ['source', 'endpoint', 'status'],
            registry=self.registry
        )
        
        self.metrics['market_data_latency'] = Histogram(
            'market_data_latency_seconds',
            'Market data request latency',
            ['source', 'endpoint'],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
            registry=self.registry
        )
        
        self.metrics['market_data_last_update'] = Gauge(
            'market_data_last_update_timestamp',
            'Timestamp of last successful market data update',
            ['source'],
            registry=self.registry
        )
        
        # Risk Management Metrics
        self.metrics['risk_violations'] = Counter(
            'risk_violations_total',
            'Total number of risk violations',
            ['rule_type', 'severity'],
            registry=self.registry
        )
        
        self.metrics['position_size_limits'] = Gauge(
            'position_size_limits',
            'Current position size limits',
            ['market_type'],
            registry=self.registry
        )
        
        self.metrics['drawdown_current'] = Gauge(
            'drawdown_current_percent',
            'Current drawdown percentage',
            registry=self.registry
        )
        
        self.metrics['drawdown_max'] = Gauge(
            'drawdown_max_percent',
            'Maximum drawdown percentage',
            registry=self.registry
        )
        
        # System Performance Metrics
        self.metrics['application_uptime'] = Gauge(
            'application_uptime_seconds',
            'Application uptime in seconds',
            registry=self.registry
        )
        
        self.metrics['memory_usage'] = Gauge(
            'application_memory_usage_bytes',
            'Application memory usage in bytes',
            ['type'],
            registry=self.registry
        )
        
        self.metrics['cpu_usage'] = Gauge(
            'application_cpu_usage_percent',
            'Application CPU usage percentage',
            registry=self.registry
        )
        
        self.metrics['database_connections'] = Gauge(
            'database_connections_active',
            'Number of active database connections',
            ['pool'],
            registry=self.registry
        )
        
        self.metrics['database_query_time'] = Histogram(
            'database_query_time_seconds',
            'Database query execution time',
            ['operation', 'table'],
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
            registry=self.registry
        )
        
        # External API Metrics
        self.metrics['external_api_requests'] = Counter(
            'external_api_requests_total',
            'Total external API requests',
            ['api', 'endpoint', 'status'],
            registry=self.registry
        )
        
        self.metrics['external_api_latency'] = Histogram(
            'external_api_latency_seconds',
            'External API request latency',
            ['api', 'endpoint'],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
            registry=self.registry
        )
        
        self.metrics['external_api_success_rate'] = Gauge(
            'external_api_success_rate',
            'External API success rate',
            ['api'],
            registry=self.registry
        )
        
        # Proxy Metrics
        self.metrics['proxy_requests'] = Counter(
            'proxy_requests_total',
            'Total proxy requests',
            ['proxy_type', 'country', 'status'],
            registry=self.registry
        )
        
        self.metrics['proxy_success_rate'] = Gauge(
            'proxy_success_rate',
            'Proxy success rate',
            ['proxy_type', 'country'],
            registry=self.registry
        )
        
        # Business Intelligence Metrics
        self.metrics['daily_volume'] = Gauge(
            'daily_trading_volume_usd',
            'Daily trading volume in USD',
            registry=self.registry
        )
        
        self.metrics['market_opportunities'] = Gauge(
            'market_opportunities_identified',
            'Number of identified market opportunities',
            ['strategy', 'confidence'],
            registry=self.registry
        )
        
        logger.info("Core application metrics initialized")
    
    # Trading Metrics Methods
    def record_trade(self, strategy: str, market_type: str, direction: str, 
                    success: bool, pnl: float = 0.0):
        """Record a trade execution"""
        with self._lock:
            self.metrics['trading_total_trades'].labels(
                strategy=strategy, 
                market_type=market_type, 
                direction=direction
            ).inc()
            
            if success:
                self.metrics['trading_successful_trades'].labels(
                    strategy=strategy, 
                    market_type=market_type
                ).inc()
                
                # Update PnL
                if pnl != 0:
                    current_pnl = self.metrics['trading_total_pnl']._value._value
                    self.metrics['trading_total_pnl'].set(current_pnl + pnl)
                    self.metrics['trading_realized_pnl'].inc(pnl)
    
    def record_failed_trade(self, strategy: str, reason: str):
        """Record a failed trade"""
        with self._lock:
            self.metrics['trading_failed_trades'].labels(
                strategy=strategy, 
                reason=reason
            ).inc()
    
    def update_active_positions(self, strategy: str, market_type: str, count: int):
        """Update active positions count"""
        with self._lock:
            self.metrics['trading_active_positions'].labels(
                strategy=strategy, 
                market_type=market_type
            ).set(count)
    
    def update_portfolio_metrics(self, total_value: float, cash_balance: float, 
                               unrealized_pnl: float, risk_score: float):
        """Update portfolio metrics"""
        with self._lock:
            self.metrics['portfolio_value'].set(total_value)
            self.metrics['portfolio_cash_balance'].set(cash_balance)
            self.metrics['trading_unrealized_pnl'].set(unrealized_pnl)
            self.metrics['portfolio_risk_score'].set(risk_score)
    
    # Strategy Metrics Methods
    def record_signal_generation(self, strategy: str, signal_type: str, 
                               signal_strength: float, execution_time: float):
        """Record strategy signal generation"""
        with self._lock:
            self.metrics['strategy_signals_generated'].labels(
                strategy=strategy, 
                signal_type=signal_type
            ).inc()
            
            self.metrics['strategy_signal_strength'].labels(
                strategy=strategy
            ).observe(signal_strength)
            
            self.metrics['strategy_execution_time'].labels(
                strategy=strategy
            ).observe(execution_time)
    
    def update_strategy_success_rate(self, strategy: str, success_rate: float):
        """Update strategy success rate"""
        with self._lock:
            self.metrics['trading_success_rate'].labels(
                strategy=strategy
            ).set(success_rate)
    
    # Market Data Metrics Methods
    def record_market_data_request(self, source: str, endpoint: str, 
                                 status: str, latency: float):
        """Record market data request"""
        with self._lock:
            self.metrics['market_data_requests'].labels(
                source=source, 
                endpoint=endpoint, 
                status=status
            ).inc()
            
            self.metrics['market_data_latency'].labels(
                source=source, 
                endpoint=endpoint
            ).observe(latency)
            
            if status == 'success':
                self.metrics['market_data_last_update'].labels(
                    source=source
                ).set(time.time())
    
    # Risk Management Methods
    def record_risk_violation(self, rule_type: str, severity: str):
        """Record risk violation"""
        with self._lock:
            self.metrics['risk_violations'].labels(
                rule_type=rule_type, 
                severity=severity
            ).inc()
    
    def update_risk_metrics(self, current_drawdown: float, max_drawdown: float):
        """Update risk metrics"""
        with self._lock:
            self.metrics['drawdown_current'].set(current_drawdown)
            self.metrics['drawdown_max'].set(max(
                max_drawdown, 
                self.metrics['drawdown_max']._value._value
            ))
    
    # System Performance Methods
    def update_system_metrics(self):
        """Update system performance metrics"""
        with self._lock:
            try:
                # Update uptime
                uptime = time.time() - self.start_time
                self.metrics['application_uptime'].set(uptime)
                
                # Update memory usage
                process = psutil.Process()
                memory_info = process.memory_info()
                self.metrics['memory_usage'].labels(type='rss').set(memory_info.rss)
                self.metrics['memory_usage'].labels(type='vms').set(memory_info.vms)
                
                # Update CPU usage
                cpu_percent = process.cpu_percent()
                self.metrics['cpu_usage'].set(cpu_percent)
                
            except Exception as e:
                logger.error(f"Error updating system metrics: {e}")
    
    # External API Methods
    def record_external_api_request(self, api: str, endpoint: str, 
                                  status: str, latency: float):
        """Record external API request"""
        with self._lock:
            self.metrics['external_api_requests'].labels(
                api=api, 
                endpoint=endpoint, 
                status=status
            ).inc()
            
            self.metrics['external_api_latency'].labels(
                api=api, 
                endpoint=endpoint
            ).observe(latency)
    
    def update_external_api_success_rate(self, api: str, success_rate: float):
        """Update external API success rate"""
        with self._lock:
            self.metrics['external_api_success_rate'].labels(api=api).set(success_rate)
    
    # Proxy Methods
    def record_proxy_request(self, proxy_type: str, country: str, status: str):
        """Record proxy request"""
        with self._lock:
            self.metrics['proxy_requests'].labels(
                proxy_type=proxy_type, 
                country=country, 
                status=status
            ).inc()
    
    def update_proxy_success_rate(self, proxy_type: str, country: str, success_rate: float):
        """Update proxy success rate"""
        with self._lock:
            self.metrics['proxy_success_rate'].labels(
                proxy_type=proxy_type, 
                country=country
            ).set(success_rate)
    
    # Database Methods
    def record_database_query(self, operation: str, table: str, execution_time: float):
        """Record database query"""
        with self._lock:
            self.metrics['database_query_time'].labels(
                operation=operation, 
                table=table
            ).observe(execution_time)
    
    def update_database_connections(self, pool: str, count: int):
        """Update database connection count"""
        with self._lock:
            self.metrics['database_connections'].labels(pool=pool).set(count)
    
    # Business Intelligence Methods
    def update_business_metrics(self, daily_volume: float, opportunities: Dict[str, Dict[str, int]]):
        """Update business intelligence metrics"""
        with self._lock:
            self.metrics['daily_volume'].set(daily_volume)
            
            # Clear previous opportunities
            for metric_family in self.metrics['market_opportunities']._metrics.values():
                metric_family.clear()
            
            # Set new opportunities
            for strategy, confidence_counts in opportunities.items():
                for confidence, count in confidence_counts.items():
                    self.metrics['market_opportunities'].labels(
                        strategy=strategy, 
                        confidence=confidence
                    ).set(count)
    
    # Advanced Analytics
    def get_metric_summary(self) -> Dict[str, Any]:
        """Get comprehensive metric summary"""
        with self._lock:
            try:
                summary = {
                    'timestamp': datetime.now().isoformat(),
                    'uptime_seconds': time.time() - self.start_time,
                    'trading': {
                        'total_pnl': self.metrics['trading_total_pnl']._value._value,
                        'realized_pnl': self.metrics['trading_realized_pnl']._value._value,
                        'unrealized_pnl': self.metrics['trading_unrealized_pnl']._value._value,
                        'portfolio_value': self.metrics['portfolio_value']._value._value,
                        'cash_balance': self.metrics['portfolio_cash_balance']._value._value,
                        'risk_score': self.metrics['portfolio_risk_score']._value._value,
                    },
                    'performance': {
                        'memory_rss_mb': self.metrics['memory_usage'].labels(type='rss')._value._value / (1024 * 1024),
                        'cpu_percent': self.metrics['cpu_usage']._value._value,
                        'current_drawdown': self.metrics['drawdown_current']._value._value,
                        'max_drawdown': self.metrics['drawdown_max']._value._value,
                    },
                    'activity': {
                        'daily_volume': self.metrics['daily_volume']._value._value,
                    }
                }
                return summary
            except Exception as e:
                logger.error(f"Error generating metric summary: {e}")
                return {'error': str(e)}
    
    def export_metrics(self) -> str:
        """Export metrics in Prometheus format"""
        try:
            self.update_system_metrics()
            return generate_latest(self.registry)
        except Exception as e:
            logger.error(f"Error exporting metrics: {e}")
            return f"# Error exporting metrics: {e}\n"
    
    def reset_metrics(self):
        """Reset all metrics (use with caution)"""
        with self._lock:
            logger.warning("Resetting all application metrics")
            self.registry = CollectorRegistry()
            self.metrics.clear()
            self._initialize_core_metrics()
            self.start_time = time.time()


# Global metrics collector instance
metrics_collector = ApplicationMetricsCollector()


# Decorator for automatic metric collection
def track_execution_time(metric_name: str, labels: Dict[str, str] = None):
    """Decorator to track function execution time"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                if metric_name in metrics_collector.metrics:
                    if labels:
                        metrics_collector.metrics[metric_name].labels(**labels).observe(execution_time)
                    else:
                        metrics_collector.metrics[metric_name].observe(execution_time)
                
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"Function {func.__name__} failed after {execution_time:.3f}s: {e}")
                raise
        return wrapper
    return decorator


# Async decorator for tracking execution time
def track_async_execution_time(metric_name: str, labels: Dict[str, str] = None):
    """Decorator to track async function execution time"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                if metric_name in metrics_collector.metrics:
                    if labels:
                        metrics_collector.metrics[metric_name].labels(**labels).observe(execution_time)
                    else:
                        metrics_collector.metrics[metric_name].observe(execution_time)
                
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"Async function {func.__name__} failed after {execution_time:.3f}s: {e}")
                raise
        return wrapper
    return decorator


if __name__ == "__main__":
    # Example usage and testing
    collector = ApplicationMetricsCollector()
    
    # Simulate some trading activity
    collector.record_trade("mean_reversion", "binary", "buy", True, 100.0)
    collector.record_trade("momentum", "binary", "sell", False, -50.0)
    collector.record_signal_generation("mean_reversion", "buy", 0.75, 0.05)
    collector.update_portfolio_metrics(10000.0, 5000.0, 500.0, 0.3)
    
    # Export metrics
    print("Metrics exported:")
    print(collector.export_metrics().decode('utf-8'))