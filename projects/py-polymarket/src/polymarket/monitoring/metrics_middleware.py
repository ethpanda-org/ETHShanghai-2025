#!/usr/bin/env python3
"""
Enhanced Monitoring Middleware
Middleware to automatically collect metrics from trading operations
"""

import asyncio
import logging
import time
import functools
from typing import Dict, Any, Optional, Callable, Union
from contextlib import asynccontextmanager
from datetime import datetime
import inspect
import traceback

from aiohttp import ClientSession, ClientTimeout
from aiohttp.web import middleware, Request, Response, StreamResponse
import json

from .trading_metrics_integration import trading_metrics


logger = logging.getLogger(__name__)


class MetricsMiddleware:
    """Middleware for automatic metrics collection"""
    
    def __init__(self, integration=None):
        self.integration = integration or trading_metrics
        self.request_count = {}
        self.active_requests = {}
    
    @middleware
    async def web_metrics_middleware(self, request: Request, handler: Callable):
        """Web request metrics middleware"""
        start_time = time.time()
        request_id = id(request)
        
        # Track active request
        self.active_requests[request_id] = {
            'start_time': start_time,
            'path': request.path,
            'method': request.method
        }
        
        try:
            # Execute request handler
            response = await handler(request)
            
            # Calculate metrics
            duration = time.time() - start_time
            status_code = response.status if hasattr(response, 'status') else 200
            
            # Record metrics
            self._record_web_request_metrics(
                method=request.method,
                path=request.path,
                status_code=status_code,
                duration=duration,
                success=status_code < 400
            )
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Record error metrics
            self._record_web_request_metrics(
                method=request.method,
                path=request.path,
                status_code=500,
                duration=duration,
                success=False
            )
            
            logger.error(f"Request failed: {request.method} {request.path} - {e}")
            raise
            
        finally:
            # Clean up active request tracking
            self.active_requests.pop(request_id, None)
    
    def _record_web_request_metrics(self, method: str, path: str, status_code: int, 
                                   duration: float, success: bool):
        """Record web request metrics"""
        try:
            # Update request count
            key = f"{method}:{path}"
            self.request_count[key] = self.request_count.get(key, 0) + 1
            
            # Record in metrics collector (if available)
            if hasattr(self.integration.metrics_collector, 'web_requests'):
                self.integration.metrics_collector.web_requests.labels(
                    method=method,
                    path=path,
                    status=str(status_code)
                ).inc()
                
                self.integration.metrics_collector.web_request_duration.labels(
                    method=method,
                    path=path
                ).observe(duration)
            
        except Exception as e:
            logger.error(f"Error recording web request metrics: {e}")


class TradingOperationTracker:
    """Tracks trading operations for metrics collection"""
    
    def __init__(self, integration=None):
        self.integration = integration or trading_metrics
        self.active_operations = {}
        self.operation_history = []
        self.max_history = 1000
    
    @asynccontextmanager
    async def track_trading_operation(self, operation_type: str, **context):
        """Context manager to track trading operations"""
        operation_id = f"{operation_type}_{int(time.time() * 1000000)}"
        start_time = time.time()
        
        operation_context = {
            'operation_id': operation_id,
            'operation_type': operation_type,
            'start_time': start_time,
            **context
        }
        
        self.active_operations[operation_id] = operation_context
        
        try:
            yield operation_context
            
            # Operation completed successfully
            duration = time.time() - start_time
            operation_context.update({
                'duration': duration,
                'success': True,
                'end_time': time.time()
            })
            
            # Record success metrics
            self._record_operation_metrics(operation_context)
            
        except Exception as e:
            # Operation failed
            duration = time.time() - start_time
            operation_context.update({
                'duration': duration,
                'success': False,
                'error': str(e),
                'end_time': time.time()
            })
            
            # Record failure metrics
            self._record_operation_metrics(operation_context)
            
            logger.error(f"Trading operation {operation_type} failed: {e}")
            raise
            
        finally:
            # Move to history and clean up
            self.operation_history.append(operation_context)
            if len(self.operation_history) > self.max_history:
                self.operation_history = self.operation_history[-self.max_history:]
            
            self.active_operations.pop(operation_id, None)
    
    def _record_operation_metrics(self, operation_context: Dict[str, Any]):
        """Record operation metrics"""
        try:
            operation_type = operation_context.get('operation_type', 'unknown')
            success = operation_context.get('success', False)
            duration = operation_context.get('duration', 0.0)
            
            if operation_type == 'trade_execution':
                self.integration.record_trade_execution({
                    'strategy': operation_context.get('strategy', 'unknown'),
                    'market_type': operation_context.get('market_type', 'binary'),
                    'direction': operation_context.get('direction', 'unknown'),
                    'success': success,
                    'pnl': operation_context.get('pnl', 0.0),
                    'failure_reason': operation_context.get('error', 'unknown') if not success else None
                })
            
            elif operation_type == 'signal_generation':
                self.integration.record_strategy_signal({
                    'strategy': operation_context.get('strategy', 'unknown'),
                    'signal_type': operation_context.get('signal_type', 'unknown'),
                    'signal_strength': operation_context.get('signal_strength', 0.0),
                    'execution_time': duration
                })
            
            elif operation_type == 'market_data_fetch':
                self.integration.record_market_data_access({
                    'source': operation_context.get('source', 'unknown'),
                    'endpoint': operation_context.get('endpoint', 'unknown'),
                    'status': 'success' if success else 'error',
                    'latency': duration
                })
            
            elif operation_type == 'external_api_call':
                self.integration.record_external_api_call({
                    'api': operation_context.get('api', 'unknown'),
                    'endpoint': operation_context.get('endpoint', 'unknown'),
                    'status': 'success' if success else 'error',
                    'latency': duration
                })
            
            elif operation_type == 'database_operation':
                self.integration.record_database_operation({
                    'operation': operation_context.get('operation', 'unknown'),
                    'table': operation_context.get('table', 'unknown'),
                    'execution_time': duration
                })
            
        except Exception as e:
            logger.error(f"Error recording operation metrics: {e}")
    
    def get_active_operations(self) -> Dict[str, Dict[str, Any]]:
        """Get currently active operations"""
        return dict(self.active_operations)
    
    def get_operation_stats(self) -> Dict[str, Any]:
        """Get operation statistics"""
        try:
            if not self.operation_history:
                return {'total_operations': 0}
            
            # Calculate statistics
            total_ops = len(self.operation_history)
            successful_ops = sum(1 for op in self.operation_history if op.get('success', False))
            
            # Group by operation type
            by_type = {}
            for op in self.operation_history:
                op_type = op.get('operation_type', 'unknown')
                if op_type not in by_type:
                    by_type[op_type] = {'count': 0, 'successes': 0, 'total_duration': 0.0}
                
                by_type[op_type]['count'] += 1
                if op.get('success', False):
                    by_type[op_type]['successes'] += 1
                by_type[op_type]['total_duration'] += op.get('duration', 0.0)
            
            # Calculate averages
            for op_type, stats in by_type.items():
                if stats['count'] > 0:
                    stats['success_rate'] = stats['successes'] / stats['count']
                    stats['avg_duration'] = stats['total_duration'] / stats['count']
                else:
                    stats['success_rate'] = 0.0
                    stats['avg_duration'] = 0.0
            
            return {
                'total_operations': total_ops,
                'successful_operations': successful_ops,
                'overall_success_rate': successful_ops / total_ops if total_ops > 0 else 0.0,
                'active_operations': len(self.active_operations),
                'by_operation_type': by_type,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating operation stats: {e}")
            return {'error': str(e)}


# Decorators for automatic metrics collection
def track_trading_function(operation_type: str = None, **default_context):
    """Decorator to track trading functions"""
    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            op_type = operation_type or f"{func.__name__}"
            context = dict(default_context)
            
            # Extract context from function arguments if possible
            if args and hasattr(args[0], '__dict__'):
                context.update({'instance_type': type(args[0]).__name__})
            
            async with trading_operation_tracker.track_trading_operation(op_type, **context):
                return await func(*args, **kwargs)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For synchronous functions, we'll need to run the tracking in the background
            # This is a simplified version - in practice, you'd want more sophisticated handling
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Record metrics asynchronously in background
                asyncio.create_task(
                    trading_operation_tracker._record_operation_metrics({
                        'operation_type': operation_type or f"{func.__name__}",
                        'duration': duration,
                        'success': True,
                        **default_context
                    })
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Record failure metrics
                asyncio.create_task(
                    trading_operation_tracker._record_operation_metrics({
                        'operation_type': operation_type or f"{func.__name__}",
                        'duration': duration,
                        'success': False,
                        'error': str(e),
                        **default_context
                    })
                )
                
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


def track_external_api_call(api_name: str, endpoint: str = None):
    """Decorator to track external API calls"""
    return track_trading_function(
        operation_type='external_api_call',
        api=api_name,
        endpoint=endpoint or 'unknown'
    )


def track_database_operation(operation: str, table: str = None):
    """Decorator to track database operations"""
    return track_trading_function(
        operation_type='database_operation',
        operation=operation,
        table=table or 'unknown'
    )


# Global instances
metrics_middleware = MetricsMiddleware()
trading_operation_tracker = TradingOperationTracker()


class AdvancedMetricsCollector:
    """Advanced metrics collector with custom business logic"""
    
    def __init__(self):
        self.custom_metrics = {}
        self.alert_thresholds = {
            'success_rate_threshold': 0.8,
            'response_time_threshold': 5.0,
            'error_rate_threshold': 0.1
        }
    
    async def collect_business_metrics(self):
        """Collect business-specific metrics"""
        try:
            # Get operation statistics
            operation_stats = trading_operation_tracker.get_operation_stats()
            
            # Calculate business KPIs
            business_kpis = {
                'overall_system_health': self._calculate_system_health(operation_stats),
                'trading_efficiency': self._calculate_trading_efficiency(operation_stats),
                'risk_level': self._calculate_risk_level(),
                'opportunity_score': self._calculate_opportunity_score()
            }
            
            # Update cached business metrics
            trading_metrics.update_cached_data('business_data', {
                'kpis': business_kpis,
                'operation_stats': operation_stats,
                'daily_volume': self._get_daily_volume(),
                'opportunities': self._get_market_opportunities()
            })
            
            return business_kpis
            
        except Exception as e:
            logger.error(f"Error collecting business metrics: {e}")
            return {}
    
    def _calculate_system_health(self, operation_stats: Dict[str, Any]) -> float:
        """Calculate overall system health score (0-1)"""
        try:
            success_rate = operation_stats.get('overall_success_rate', 0.0)
            active_ops = operation_stats.get('active_operations', 0)
            
            # Factor in success rate (70% weight) and system load (30% weight)
            health_score = (success_rate * 0.7) + ((1.0 - min(active_ops / 10, 1.0)) * 0.3)
            
            return max(0.0, min(1.0, health_score))
            
        except Exception:
            return 0.5  # Neutral score if calculation fails
    
    def _calculate_trading_efficiency(self, operation_stats: Dict[str, Any]) -> float:
        """Calculate trading efficiency score"""
        try:
            by_type = operation_stats.get('by_operation_type', {})
            trade_stats = by_type.get('trade_execution', {})
            
            if not trade_stats:
                return 0.5
            
            success_rate = trade_stats.get('success_rate', 0.0)
            avg_duration = trade_stats.get('avg_duration', 1.0)
            
            # Efficiency = success rate / response time (normalized)
            efficiency = success_rate / max(avg_duration, 0.1)
            
            return max(0.0, min(1.0, efficiency))
            
        except Exception:
            return 0.5
    
    def _calculate_risk_level(self) -> float:
        """Calculate current risk level"""
        # This would integrate with your risk management system
        # For now, return a simulated value
        return 0.3
    
    def _calculate_opportunity_score(self) -> float:
        """Calculate current market opportunity score"""
        # This would analyze current market conditions
        # For now, return a simulated value
        return 0.6
    
    def _get_daily_volume(self) -> float:
        """Get daily trading volume"""
        # This would query your trading database
        # For now, return a simulated value
        return 50000.0
    
    def _get_market_opportunities(self) -> Dict[str, Dict[str, int]]:
        """Get identified market opportunities"""
        # This would analyze current market data
        # For now, return simulated data
        return {
            'mean_reversion': {'high': 3, 'medium': 5, 'low': 2},
            'momentum': {'high': 1, 'medium': 3, 'low': 4},
            'arbitrage': {'high': 2, 'medium': 1, 'low': 1}
        }


# Global advanced collector
advanced_metrics_collector = AdvancedMetricsCollector()


if __name__ == "__main__":
    # Example usage
    @track_trading_function(operation_type='test_operation', strategy='test')
    async def test_function():
        await asyncio.sleep(0.1)
        return "success"
    
    @track_external_api_call('polymarket', '/markets')
    async def test_api_call():
        async with ClientSession() as session:
            async with session.get('https://httpbin.org/delay/1') as response:
                return await response.json()
    
    async def main():
        # Test the tracking
        result1 = await test_function()
        print(f"Test function result: {result1}")
        
        try:
            result2 = await test_api_call()
            print(f"API call result: {result2}")
        except Exception as e:
            print(f"API call failed: {e}")
        
        # Get statistics
        stats = trading_operation_tracker.get_operation_stats()
        print(f"Operation stats: {json.dumps(stats, indent=2)}")
        
        # Collect business metrics
        business_metrics = await advanced_metrics_collector.collect_business_metrics()
        print(f"Business metrics: {json.dumps(business_metrics, indent=2)}")
    
    asyncio.run(main())