#!/usr/bin/env python3
"""
System Health Check Script
Comprehensive health verification for production systems
"""

import asyncio
import argparse
import logging
import sys
import time
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

import aiohttp
import socket
import psutil

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class HealthCheckResult:
    """Health check result"""
    component: str
    healthy: bool
    message: str
    response_time: float
    details: Optional[Dict[str, Any]] = None


class SystemHealthChecker:
    """Comprehensive system health checker"""
    
    def __init__(self, endpoint: str = None, environment: str = "production"):
        self.endpoint = endpoint or "http://localhost:8000"
        self.environment = environment
        self.results: List[HealthCheckResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        connector = aiohttp.TCPConnector(
            limit=20,
            limit_per_host=10,
            ttl_dns_cache=300,
            use_dns_cache=True,
        )
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': 'Health-Checker/1.0',
                'Accept': 'application/json'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def check_component(self, check_func, component_name: str) -> HealthCheckResult:
        """Run a single component health check"""
        start_time = time.time()
        try:
            logger.info(f"Checking {component_name}")
            result = await check_func()
            response_time = time.time() - start_time
            
            if isinstance(result, bool):
                health_result = HealthCheckResult(
                    component=component_name,
                    healthy=result,
                    message="Healthy" if result else "Unhealthy",
                    response_time=response_time
                )
            elif isinstance(result, dict):
                health_result = HealthCheckResult(
                    component=component_name,
                    healthy=result.get('healthy', False),
                    message=result.get('message', ''),
                    response_time=response_time,
                    details=result.get('details')
                )
            else:
                health_result = HealthCheckResult(
                    component=component_name,
                    healthy=False,
                    message=f"Invalid result type: {type(result)}",
                    response_time=response_time
                )
            
            status = "✅" if health_result.healthy else "❌"
            logger.info(f"{status} {component_name}: {health_result.message} ({response_time:.2f}s)")
            
        except Exception as e:
            response_time = time.time() - start_time
            health_result = HealthCheckResult(
                component=component_name,
                healthy=False,
                message=str(e),
                response_time=response_time
            )
            logger.error(f"❌ {component_name} failed: {e} ({response_time:.2f}s)")
        
        self.results.append(health_result)
        return health_result
    
    async def check_web_service(self) -> Dict[str, Any]:
        """Check web service health"""
        try:
            async with self.session.get(f"{self.endpoint}/health") as response:
                if response.status == 200:
                    try:
                        data = await response.json()
                        return {
                            'healthy': True,
                            'message': 'Web service responding normally',
                            'details': {
                                'status_code': response.status,
                                'response_data': data,
                                'headers': dict(response.headers)
                            }
                        }
                    except:
                        text = await response.text()
                        is_healthy = any(keyword in text.lower() for keyword in ['healthy', 'ok', 'running'])
                        return {
                            'healthy': is_healthy,
                            'message': 'Web service responding' if is_healthy else 'Unhealthy response',
                            'details': {'status_code': response.status, 'response': text[:200]}
                        }
                else:
                    return {
                        'healthy': False,
                        'message': f'Web service returned status {response.status}',
                        'details': {'status_code': response.status}
                    }
        except Exception as e:
            return {
                'healthy': False,
                'message': f'Web service check failed: {str(e)}',
                'details': {'error': str(e)}
            }
    
    async def check_database(self) -> Dict[str, Any]:
        """Check database connectivity and health"""
        try:
            async with self.session.get(f"{self.endpoint}/api/admin/db-health") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    db_connected = data.get('database_connected', False)
                    connection_pool = data.get('connection_pool', {})
                    
                    if not db_connected:
                        return {
                            'healthy': False,
                            'message': 'Database not connected',
                            'details': data
                        }
                    
                    # Check connection pool health
                    active_connections = connection_pool.get('active', 0)
                    max_connections = connection_pool.get('max', 0)
                    pool_usage = active_connections / max_connections if max_connections > 0 else 0
                    
                    if pool_usage > 0.9:
                        return {
                            'healthy': False,
                            'message': f'Database connection pool critically high: {pool_usage:.1%}',
                            'details': data
                        }
                    
                    return {
                        'healthy': True,
                        'message': f'Database healthy, pool usage: {pool_usage:.1%}',
                        'details': data
                    }
                else:
                    return {
                        'healthy': False,
                        'message': f'Database health endpoint returned {response.status}',
                        'details': {'status_code': response.status}
                    }
        except Exception as e:
            # Fallback: test database via application endpoint
            try:
                async with self.session.get(f"{self.endpoint}/api/v1/markets?limit=1",
                                          timeout=aiohttp.ClientTimeout(total=15)) as response:
                    if response.status == 500:
                        return {
                            'healthy': False,
                            'message': 'Database appears down (500 error)',
                            'details': {'fallback_test': True}
                        }
                    elif response.status in [200, 404]:
                        return {
                            'healthy': True,
                            'message': 'Database appears healthy (via fallback test)',
                            'details': {'fallback_test': True}
                        }
                    else:
                        return {
                            'healthy': False,
                            'message': f'Database health uncertain (status: {response.status})',
                            'details': {'fallback_test': True}
                        }
            except:
                return {
                    'healthy': False,
                    'message': f'Cannot verify database: {str(e)}',
                    'details': {'error': str(e)}
                }
    
    async def check_cache(self) -> Dict[str, Any]:
        """Check cache (Redis) health"""
        try:
            async with self.session.get(f"{self.endpoint}/api/admin/cache-health") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    cache_connected = data.get('cache_connected', False)
                    cache_stats = data.get('cache_stats', {})
                    
                    if not cache_connected:
                        return {
                            'healthy': False,
                            'message': 'Cache not connected',
                            'details': data
                        }
                    
                    # Check cache memory usage
                    memory_usage = cache_stats.get('used_memory_percent', 0)
                    if memory_usage > 95:
                        return {
                            'healthy': False,
                            'message': f'Cache memory critically high: {memory_usage}%',
                            'details': data
                        }
                    
                    return {
                        'healthy': True,
                        'message': f'Cache healthy, memory usage: {memory_usage}%',
                        'details': data
                    }
                else:
                    return {
                        'healthy': False,
                        'message': f'Cache health endpoint returned {response.status}',
                        'details': {'status_code': response.status}
                    }
        except Exception as e:
            return {
                'healthy': False,
                'message': f'Cannot verify cache health: {str(e)}',
                'details': {'error': str(e)}
            }
    
    async def check_api_endpoints(self) -> Dict[str, Any]:
        """Check critical API endpoints"""
        critical_endpoints = [
            ('/api/v1/markets', 'Markets API'),
            ('/api/v1/strategies/status', 'Strategy Status'),
            ('/api/v1/trading/positions', 'Trading Positions'),
            ('/api/metrics', 'Metrics API')
        ]
        
        endpoint_results = {}
        healthy_endpoints = 0
        
        for endpoint_path, endpoint_name in critical_endpoints:
            try:
                async with self.session.get(f"{self.endpoint}{endpoint_path}",
                                          timeout=aiohttp.ClientTimeout(total=10)) as response:
                    is_healthy = response.status < 500  # Server errors indicate unhealthy
                    
                    endpoint_results[endpoint_name] = {
                        'healthy': is_healthy,
                        'status_code': response.status,
                        'path': endpoint_path
                    }
                    
                    if is_healthy:
                        healthy_endpoints += 1
                        
            except asyncio.TimeoutError:
                endpoint_results[endpoint_name] = {
                    'healthy': False,
                    'error': 'timeout',
                    'path': endpoint_path
                }
            except Exception as e:
                endpoint_results[endpoint_name] = {
                    'healthy': False,
                    'error': str(e),
                    'path': endpoint_path
                }
        
        total_endpoints = len(critical_endpoints)
        health_percentage = healthy_endpoints / total_endpoints
        
        return {
            'healthy': health_percentage >= 0.75,  # 75% of endpoints must be healthy
            'message': f'{healthy_endpoints}/{total_endpoints} critical endpoints healthy',
            'details': endpoint_results
        }
    
    async def check_system_resources(self) -> Dict[str, Any]:
        """Check system resource health"""
        try:
            # Try to get system metrics from the application
            async with self.session.get(f"{self.endpoint}/api/admin/system-metrics") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    cpu_usage = data.get('cpu_usage_percent', 0)
                    memory_usage = data.get('memory_usage_percent', 0)
                    disk_usage = data.get('disk_usage_percent', 0)
                    available_memory = data.get('memory_available_gb', 0)
                    
                    issues = []
                    if cpu_usage > 90:
                        issues.append(f"CPU usage critical: {cpu_usage:.1f}%")
                    if memory_usage > 90:
                        issues.append(f"Memory usage critical: {memory_usage:.1f}%")
                    if disk_usage > 90:
                        issues.append(f"Disk usage critical: {disk_usage:.1f}%")
                    if available_memory < 0.5:
                        issues.append(f"Low available memory: {available_memory:.2f}GB")
                    
                    return {
                        'healthy': len(issues) == 0,
                        'message': 'System resources healthy' if not issues else f'Issues: {"; ".join(issues)}',
                        'details': data
                    }
                else:
                    # Fallback to local system check
                    pass
        except Exception as e:
            logger.debug(f"Application system metrics not available: {e}")
        
        # Fallback: check local system resources
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            issues = []
            if cpu_percent > 90:
                issues.append(f"CPU usage critical: {cpu_percent:.1f}%")
            if memory.percent > 90:
                issues.append(f"Memory usage critical: {memory.percent:.1f}%")
            if disk.percent > 90:
                issues.append(f"Disk usage critical: {disk.percent:.1f}%")
            
            return {
                'healthy': len(issues) == 0,
                'message': 'System resources healthy' if not issues else f'Issues: {"; ".join(issues)}',
                'details': {
                    'cpu_usage_percent': cpu_percent,
                    'memory_usage_percent': memory.percent,
                    'memory_available_gb': memory.available / (1024**3),
                    'disk_usage_percent': disk.percent,
                    'source': 'local_system'
                }
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'message': f'Cannot check system resources: {str(e)}',
                'details': {'error': str(e)}
            }
    
    async def check_network_connectivity(self) -> Dict[str, Any]:
        """Check network connectivity"""
        from urllib.parse import urlparse
        
        parsed_url = urlparse(self.endpoint)
        hostname = parsed_url.hostname
        port = parsed_url.port or (443 if parsed_url.scheme == 'https' else 80)
        
        try:
            # Test basic TCP connectivity
            start_time = time.time()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            result = sock.connect_ex((hostname, port))
            sock.close()
            connect_time = time.time() - start_time
            
            if result == 0:
                # Test HTTP connectivity
                try:
                    async with self.session.get(f"{self.endpoint}/health",
                                              timeout=aiohttp.ClientTimeout(total=10)) as response:
                        return {
                            'healthy': True,
                            'message': f'Network connectivity OK (TCP: {connect_time*1000:.0f}ms)',
                            'details': {
                                'tcp_connect_time': connect_time,
                                'http_status': response.status,
                                'hostname': hostname,
                                'port': port
                            }
                        }
                except Exception as http_error:
                    return {
                        'healthy': False,
                        'message': f'TCP OK but HTTP failed: {str(http_error)}',
                        'details': {'tcp_connect_time': connect_time}
                    }
            else:
                return {
                    'healthy': False,
                    'message': f'TCP connection failed to {hostname}:{port}',
                    'details': {'connect_error': result}
                }
                
        except Exception as e:
            return {
                'healthy': False,
                'message': f'Network connectivity check failed: {str(e)}',
                'details': {'error': str(e)}
            }
    
    async def check_security_status(self) -> Dict[str, Any]:
        """Check security-related status"""
        try:
            async with self.session.get(f"{self.endpoint}/api/admin/security-status") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    ssl_enabled = data.get('ssl_enabled', False)
                    auth_required = data.get('auth_required', False)
                    rate_limiting = data.get('rate_limiting', False)
                    
                    security_score = sum([ssl_enabled, auth_required, rate_limiting])
                    
                    if self.environment == 'production' and security_score < 2:
                        return {
                            'healthy': False,
                            'message': f'Insufficient security configuration for production (score: {security_score}/3)',
                            'details': data
                        }
                    
                    return {
                        'healthy': True,
                        'message': f'Security configuration acceptable (score: {security_score}/3)',
                        'details': data
                    }
                else:
                    return {
                        'healthy': True,  # Not critical if endpoint doesn't exist
                        'message': 'Security status endpoint not available',
                        'details': {'status_code': response.status}
                    }
        except Exception as e:
            # Check basic SSL if endpoint is HTTPS
            if self.endpoint.startswith('https://'):
                return {
                    'healthy': True,
                    'message': 'HTTPS enabled, detailed security check not available',
                    'details': {'basic_ssl': True}
                }
            else:
                return {
                    'healthy': self.environment != 'production',  # HTTP OK for non-production
                    'message': f'HTTP endpoint in {self.environment} environment',
                    'details': {'protocol': 'http', 'environment': self.environment}
                }
    
    async def run_all_health_checks(self) -> Dict[str, Any]:
        """Run comprehensive health check suite"""
        logger.info(f"Starting health checks for: {self.endpoint}")
        logger.info(f"Environment: {self.environment}")
        
        # Define health checks
        health_checks = [
            (self.check_web_service, "Web Service"),
            (self.check_database, "Database"),
            (self.check_cache, "Cache"),
            (self.check_api_endpoints, "API Endpoints"),
            (self.check_system_resources, "System Resources"),
            (self.check_network_connectivity, "Network Connectivity"),
            (self.check_security_status, "Security Status")
        ]
        
        # Run all health checks
        for check_func, component_name in health_checks:
            await self.check_component(check_func, component_name)
        
        # Generate summary
        total_checks = len(self.results)
        healthy_checks = sum(1 for result in self.results if result.healthy)
        critical_components = ["Web Service", "Database", "API Endpoints"]
        critical_failures = [
            result for result in self.results 
            if result.component in critical_components and not result.healthy
        ]
        
        overall_healthy = len(critical_failures) == 0 and healthy_checks / total_checks >= 0.8
        
        summary = {
            'health_summary': {
                'endpoint': self.endpoint,
                'environment': self.environment,
                'overall_healthy': overall_healthy,
                'total_checks': total_checks,
                'healthy_checks': healthy_checks,
                'unhealthy_checks': total_checks - healthy_checks,
                'health_percentage': (healthy_checks / total_checks * 100) if total_checks > 0 else 0,
                'critical_failures': len(critical_failures),
                'timestamp': datetime.now().isoformat()
            },
            'component_results': self.results,
            'recommendations': self.generate_health_recommendations(critical_failures),
            'detailed_results': {
                result.component: {
                    'healthy': result.healthy,
                    'message': result.message,
                    'response_time': result.response_time,
                    'details': result.details
                }
                for result in self.results
            }
        }
        
        logger.info(f"Health checks completed: {healthy_checks}/{total_checks} healthy")
        if critical_failures:
            logger.error(f"Critical failures: {[r.component for r in critical_failures]}")
        
        return summary
    
    def generate_health_recommendations(self, critical_failures: List[HealthCheckResult]) -> List[str]:
        """Generate health-based recommendations"""
        recommendations = []
        
        if not critical_failures:
            recommendations.append("✅ All critical components are healthy. System is operating normally.")
        else:
            recommendations.append("🚨 Critical component failures detected. Immediate attention required.")
        
        for failure in critical_failures:
            if failure.component == "Web Service":
                recommendations.append(f"• Web Service Issue: {failure.message} - Check application logs and restart if necessary.")
            elif failure.component == "Database":
                recommendations.append(f"• Database Issue: {failure.message} - Verify database connectivity and performance.")
            elif failure.component == "Cache":
                recommendations.append(f"• Cache Issue: {failure.message} - Check Redis/cache service status.")
            elif failure.component == "API Endpoints":
                recommendations.append(f"• API Issue: {failure.message} - Review API service health and dependencies.")
            elif failure.component == "System Resources":
                recommendations.append(f"• Resource Issue: {failure.message} - Scale resources or optimize usage.")
        
        # General recommendations based on environment
        if self.environment == "production":
            recommendations.append("For production environment: Monitor continuously and have rollback procedures ready.")
        
        return recommendations


async def main():
    parser = argparse.ArgumentParser(description='Run comprehensive system health checks')
    parser.add_argument('--endpoint', help='System endpoint URL')
    parser.add_argument('--environment', default='production', 
                       choices=['production', 'staging', 'development'],
                       help='Environment type')
    parser.add_argument('--output', help='Output file for health check results (JSON)')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    endpoint = args.endpoint or "http://localhost:8000"
    
    async with SystemHealthChecker(endpoint, args.environment) as health_checker:
        report = await health_checker.run_all_health_checks()
    
    # Print summary
    print("\n" + "="*70)
    print("SYSTEM HEALTH CHECK REPORT")
    print("="*70)
    
    summary = report['health_summary']
    print(f"Endpoint: {summary['endpoint']}")
    print(f"Environment: {summary['environment']}")
    print(f"Overall Health: {'✅ HEALTHY' if summary['overall_healthy'] else '🚨 UNHEALTHY'}")
    print(f"Health Percentage: {summary['health_percentage']:.1f}%")
    print(f"Healthy Checks: {summary['healthy_checks']}/{summary['total_checks']}")
    print(f"Critical Failures: {summary['critical_failures']}")
    
    # Print unhealthy components
    unhealthy_results = [r for r in report['component_results'] if not r.healthy]
    if unhealthy_results:
        print(f"\nUNHEALTHY COMPONENTS:")
        print("-"*50)
        for result in unhealthy_results:
            print(f"❌ {result.component}: {result.message}")
    
    # Print recommendations
    recommendations = report['recommendations']
    if recommendations:
        print(f"\nRECOMMENDATIONS:")
        print("-"*50)
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")
    
    # Save detailed results if requested
    if args.output:
        # Convert result objects to dicts for JSON serialization
        report_dict = dict(report)
        report_dict['component_results'] = [
            {
                'component': r.component,
                'healthy': r.healthy,
                'message': r.message,
                'response_time': r.response_time,
                'details': r.details
            }
            for r in report['component_results']
        ]
        
        with open(args.output, 'w') as f:
            json.dump(report_dict, f, indent=2)
        print(f"\nDetailed results saved to: {args.output}")
    
    # Exit with appropriate code
    if not summary['overall_healthy']:
        print(f"\n🚨 System health check failed!")
        print("Critical issues detected that require immediate attention.")
        sys.exit(1)
    else:
        print(f"\n✅ System health check passed!")
        print("All critical components are healthy.")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())