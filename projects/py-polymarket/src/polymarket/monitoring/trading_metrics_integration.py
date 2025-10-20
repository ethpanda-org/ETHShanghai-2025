#!/usr/bin/env python3
"""
Trading System Metrics Integration
Integrates Prometheus metrics into the main trading system
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager
from datetime import datetime
import threading

from prometheus_client import start_http_server, CONTENT_TYPE_LATEST
from aiohttp import web, ClientSession
import json

from .metrics_collector import metrics_collector, track_async_execution_time


logger = logging.getLogger(__name__)


class TradingMetricsIntegration:
    """Integration layer for trading system metrics"""
    
    def __init__(self, metrics_port: int = 8090, update_interval: float = 30.0):
        self.metrics_port = metrics_port
        self.update_interval = update_interval
        self.metrics_server = None
        self.update_task = None
        self.running = False
        
        # Cached data for performance
        self.cache = {}
        self.cache_lock = threading.RLock()
        
    async def start_metrics_server(self):
        """Start the Prometheus metrics HTTP server"""
        try:
            # Start Prometheus HTTP server in a separate thread
            self.metrics_server = start_http_server(self.metrics_port)
            logger.info(f"Prometheus metrics server started on port {self.metrics_port}")
            
            # Start periodic update task
            self.running = True
            self.update_task = asyncio.create_task(self._periodic_update())
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start metrics server: {e}")
            return False
    
    async def stop_metrics_server(self):
        """Stop the metrics server"""
        try:
            self.running = False
            
            if self.update_task:
                self.update_task.cancel()
                try:
                    await self.update_task
                except asyncio.CancelledError:
                    pass
            
            if self.metrics_server:
                self.metrics_server.shutdown()
                logger.info("Prometheus metrics server stopped")
            
        except Exception as e:
            logger.error(f"Error stopping metrics server: {e}")
    
    async def _periodic_update(self):
        """Periodically update system metrics"""
        while self.running:
            try:
                await self.update_system_metrics()
                await asyncio.sleep(self.update_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic metrics update: {e}")
                await asyncio.sleep(self.update_interval)
    
    @track_async_execution_time('system_metrics_update_time')
    async def update_system_metrics(self):
        """Update all system metrics"""
        try:
            # Update basic system metrics
            metrics_collector.update_system_metrics()
            
            # Update trading metrics if available
            await self._update_trading_metrics()
            
            # Update external API metrics
            await self._update_api_metrics()
            
            # Update business metrics
            await self._update_business_metrics()
            
        except Exception as e:
            logger.error(f"Error updating system metrics: {e}")
    
    async def _update_trading_metrics(self):
        """Update trading-specific metrics"""
        try:
            # This would integrate with your actual trading system
            # For now, we'll simulate with cached data
            
            with self.cache_lock:
                trading_data = self.cache.get('trading_data', {})
            
            if trading_data:
                # Update success rates
                for strategy, data in trading_data.get('strategies', {}).items():
                    success_rate = data.get('success_rate', 0.0)
                    metrics_collector.update_strategy_success_rate(strategy, success_rate)
                
                # Update portfolio metrics
                portfolio = trading_data.get('portfolio', {})
                if portfolio:
                    metrics_collector.update_portfolio_metrics(
                        total_value=portfolio.get('total_value', 0.0),
                        cash_balance=portfolio.get('cash_balance', 0.0),
                        unrealized_pnl=portfolio.get('unrealized_pnl', 0.0),
                        risk_score=portfolio.get('risk_score', 0.0)
                    )
                
                # Update risk metrics
                risk_data = trading_data.get('risk', {})
                if risk_data:
                    metrics_collector.update_risk_metrics(
                        current_drawdown=risk_data.get('current_drawdown', 0.0),
                        max_drawdown=risk_data.get('max_drawdown', 0.0)
                    )
            
        except Exception as e:
            logger.error(f"Error updating trading metrics: {e}")
    
    async def _update_api_metrics(self):
        """Update external API metrics"""
        try:
            with self.cache_lock:
                api_data = self.cache.get('api_metrics', {})
            
            for api_name, metrics in api_data.items():
                success_rate = metrics.get('success_rate', 0.0)
                metrics_collector.update_external_api_success_rate(api_name, success_rate)
            
        except Exception as e:
            logger.error(f"Error updating API metrics: {e}")
    
    async def _update_business_metrics(self):
        """Update business intelligence metrics"""
        try:
            with self.cache_lock:
                business_data = self.cache.get('business_data', {})
            
            daily_volume = business_data.get('daily_volume', 0.0)
            opportunities = business_data.get('opportunities', {})
            
            if daily_volume > 0:
                metrics_collector.update_business_metrics(daily_volume, opportunities)
            
        except Exception as e:
            logger.error(f"Error updating business metrics: {e}")
    
    # Integration methods for trading system
    def record_trade_execution(self, trade_data: Dict[str, Any]):
        """Record trade execution metrics"""
        try:
            metrics_collector.record_trade(
                strategy=trade_data.get('strategy', 'unknown'),
                market_type=trade_data.get('market_type', 'binary'),
                direction=trade_data.get('direction', 'unknown'),
                success=trade_data.get('success', False),
                pnl=trade_data.get('pnl', 0.0)
            )
            
            if not trade_data.get('success', False):
                metrics_collector.record_failed_trade(
                    strategy=trade_data.get('strategy', 'unknown'),
                    reason=trade_data.get('failure_reason', 'unknown')
                )
            
        except Exception as e:
            logger.error(f"Error recording trade metrics: {e}")
    
    def record_strategy_signal(self, signal_data: Dict[str, Any]):
        """Record strategy signal generation"""
        try:
            metrics_collector.record_signal_generation(
                strategy=signal_data.get('strategy', 'unknown'),
                signal_type=signal_data.get('signal_type', 'unknown'),
                signal_strength=signal_data.get('signal_strength', 0.0),
                execution_time=signal_data.get('execution_time', 0.0)
            )
        except Exception as e:
            logger.error(f"Error recording signal metrics: {e}")
    
    def record_market_data_access(self, access_data: Dict[str, Any]):
        """Record market data access metrics"""
        try:
            metrics_collector.record_market_data_request(
                source=access_data.get('source', 'unknown'),
                endpoint=access_data.get('endpoint', 'unknown'),
                status=access_data.get('status', 'unknown'),
                latency=access_data.get('latency', 0.0)
            )
        except Exception as e:
            logger.error(f"Error recording market data metrics: {e}")
    
    def record_external_api_call(self, api_data: Dict[str, Any]):
        """Record external API call metrics"""
        try:
            metrics_collector.record_external_api_request(
                api=api_data.get('api', 'unknown'),
                endpoint=api_data.get('endpoint', 'unknown'),
                status=api_data.get('status', 'unknown'),
                latency=api_data.get('latency', 0.0)
            )
        except Exception as e:
            logger.error(f"Error recording API metrics: {e}")
    
    def record_proxy_usage(self, proxy_data: Dict[str, Any]):
        """Record proxy usage metrics"""
        try:
            metrics_collector.record_proxy_request(
                proxy_type=proxy_data.get('proxy_type', 'unknown'),
                country=proxy_data.get('country', 'unknown'),
                status=proxy_data.get('status', 'unknown')
            )
        except Exception as e:
            logger.error(f"Error recording proxy metrics: {e}")
    
    def record_database_operation(self, db_data: Dict[str, Any]):
        """Record database operation metrics"""
        try:
            metrics_collector.record_database_query(
                operation=db_data.get('operation', 'unknown'),
                table=db_data.get('table', 'unknown'),
                execution_time=db_data.get('execution_time', 0.0)
            )
        except Exception as e:
            logger.error(f"Error recording database metrics: {e}")
    
    def record_risk_violation(self, violation_data: Dict[str, Any]):
        """Record risk management violation"""
        try:
            metrics_collector.record_risk_violation(
                rule_type=violation_data.get('rule_type', 'unknown'),
                severity=violation_data.get('severity', 'unknown')
            )
        except Exception as e:
            logger.error(f"Error recording risk violation: {e}")
    
    def update_cached_data(self, data_type: str, data: Dict[str, Any]):
        """Update cached data for metrics calculation"""
        with self.cache_lock:
            self.cache[data_type] = data
            self.cache['last_update'] = time.time()
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get comprehensive metrics summary"""
        return metrics_collector.get_metric_summary()
    
    def get_prometheus_metrics(self) -> bytes:
        """Get metrics in Prometheus format"""
        return metrics_collector.export_metrics()


class MetricsWebHandler:
    """Web handler for metrics endpoints"""
    
    def __init__(self, integration: TradingMetricsIntegration):
        self.integration = integration
    
    async def metrics_endpoint(self, request):
        """Prometheus metrics endpoint"""
        try:
            metrics_data = self.integration.get_prometheus_metrics()
            return web.Response(
                body=metrics_data,
                content_type=CONTENT_TYPE_LATEST
            )
        except Exception as e:
            logger.error(f"Error serving metrics: {e}")
            return web.Response(
                text=f"Error: {e}",
                status=500
            )
    
    async def health_endpoint(self, request):
        """Health check endpoint"""
        try:
            summary = self.integration.get_metrics_summary()
            return web.json_response({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'uptime': summary.get('uptime_seconds', 0),
                'metrics_available': True
            })
        except Exception as e:
            logger.error(f"Error in health check: {e}")
            return web.json_response({
                'status': 'unhealthy',
                'error': str(e)
            }, status=500)
    
    async def summary_endpoint(self, request):
        """Metrics summary endpoint"""
        try:
            summary = self.integration.get_metrics_summary()
            return web.json_response(summary)
        except Exception as e:
            logger.error(f"Error getting metrics summary: {e}")
            return web.json_response({
                'error': str(e)
            }, status=500)


@asynccontextmanager
async def trading_metrics_context(metrics_port: int = 8090, update_interval: float = 30.0):
    """Async context manager for trading metrics integration"""
    integration = TradingMetricsIntegration(metrics_port, update_interval)
    
    try:
        success = await integration.start_metrics_server()
        if not success:
            raise RuntimeError("Failed to start metrics server")
        
        yield integration
        
    finally:
        await integration.stop_metrics_server()


# Global integration instance
trading_metrics = TradingMetricsIntegration()


if __name__ == "__main__":
    # Example usage
    async def test_metrics_integration():
        async with trading_metrics_context(metrics_port=8090) as metrics:
            logger.info("Metrics integration started")
            
            # Simulate some trading activity
            metrics.record_trade_execution({
                'strategy': 'mean_reversion',
                'market_type': 'binary',
                'direction': 'buy',
                'success': True,
                'pnl': 100.0
            })
            
            metrics.record_strategy_signal({
                'strategy': 'momentum',
                'signal_type': 'buy',
                'signal_strength': 0.8,
                'execution_time': 0.05
            })
            
            # Wait for metrics to be collected
            await asyncio.sleep(5)
            
            # Get summary
            summary = metrics.get_metrics_summary()
            print(f"Metrics Summary: {json.dumps(summary, indent=2)}")
    
    asyncio.run(test_metrics_integration())