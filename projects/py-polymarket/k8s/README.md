# Kubernetes Deployment Guide for Polymarket Trading System

## Overview

This directory contains Kubernetes manifests for deploying the Polymarket Trading System as a microservices architecture on Kubernetes clusters.

## Architecture

The deployment consists of:

### Infrastructure Services
- **PostgreSQL** - Primary database with persistent storage
- **Redis** - Cache and message broker
- **Nginx** - Reverse proxy and load balancer

### Microservices
- **API Gateway** (port 8000) - Request routing and rate limiting
- **Data Collector** (port 8001) - Market data collection
- **Strategy Engine** (port 8002) - Trading strategy execution
- **Risk Manager** (port 8003) - Risk assessment and management
- **Trading Engine** (port 8004) - Order execution
- **Web Monitor** (port 8888) - Real-time monitoring dashboard

## Prerequisites

1. **Kubernetes Cluster** (v1.20+)
2. **kubectl** configured with cluster access
3. **Storage Classes** configured:
   - `fast-ssd` for databases (SSD storage)
   - `standard` for general purposes
4. **LoadBalancer** or **Ingress Controller** for external access

## Quick Start

### 1. Deploy Everything
```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy to default namespace
./deploy.sh

# Deploy to specific namespace
./deploy.sh -n polymarket-prod

# Dry run to preview changes
./deploy.sh -d
```

### 2. Manual Deployment
```bash
# Create namespace
kubectl apply -f namespace.yaml

# Deploy infrastructure
kubectl apply -f rbac.yaml
kubectl apply -f configmaps.yaml
kubectl apply -f secrets.yaml
kubectl apply -f persistentvolumes.yaml

# Deploy database and cache
kubectl apply -f postgres.yaml
kubectl apply -f redis.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n polymarket --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n polymarket --timeout=300s

# Deploy microservices
kubectl apply -f api-gateway.yaml
kubectl apply -f data-collector.yaml
kubectl apply -f strategy-engine.yaml
kubectl apply -f risk-manager.yaml
kubectl apply -f trading-engine.yaml
kubectl apply -f web-monitor.yaml

# Deploy ingress and networking
kubectl apply -f nginx-ingress.yaml
kubectl apply -f network-policies.yaml
```

## Configuration

### Secrets Management
Before deployment, update the base64-encoded values in `secrets.yaml`:

```bash
# Generate base64 encoded secrets
echo -n "your_actual_password" | base64
echo -n "your_polymarket_api_key" | base64
echo -n "your_polymarket_private_key" | base64
```

### Storage Configuration
Update `persistentvolumes.yaml` to match your storage requirements:

```yaml
spec:
  capacity:
    storage: 20Gi  # Adjust size as needed
  storageClassName: fast-ssd  # Use your storage class
```

### Environment-Specific Configuration
Modify `configmaps.yaml` for different environments:

```yaml
data:
  TRADING_ENV: "production"  # or "development"
  LOG_LEVEL: "INFO"          # or "DEBUG"
  ENABLE_PAPER_TRADING: "true"  # Set to "false" for live trading
```

## Monitoring and Maintenance

### Check Deployment Status
```bash
# View all resources
kubectl get all -n polymarket

# Check pod logs
kubectl logs -f deployment/api-gateway -n polymarket
kubectl logs -f deployment/trading-engine -n polymarket

# View detailed pod information
kubectl describe pod -l app=postgres -n polymarket
```

### Access Applications
```bash
# Port forward to access services locally
kubectl port-forward service/web-monitor 8888:8888 -n polymarket
kubectl port-forward service/api-gateway 8000:8000 -n polymarket

# Access via browser
# Web Monitor: http://localhost:8888
# API: http://localhost:8000/health
```

### Scaling Services
```bash
# Scale API Gateway for higher load
kubectl scale deployment api-gateway --replicas=5 -n polymarket

# Scale automatically with HPA (already configured)
kubectl autoscale deployment api-gateway --cpu-percent=70 --min=2 --max=10 -n polymarket
```

## Security Features

### Network Policies
- Database access restricted to authorized services only
- Microservices can only communicate with required dependencies
- Frontend (Nginx) isolated from backend services

### RBAC
- Service accounts with minimal required permissions
- Role-based access control for cluster resources
- Separate permissions for different service tiers

### Secrets Management
- Sensitive data stored in Kubernetes Secrets
- Database passwords separated by service
- API keys and certificates properly isolated

## Backup and Recovery

### Database Backups
PostgreSQL is configured with automated backups:
```bash
# Manual backup
kubectl exec -it deployment/postgres -n polymarket -- pg_dump -U polymarket polymarket_trading > backup.sql

# Restore from backup
kubectl exec -i deployment/postgres -n polymarket -- psql -U polymarket polymarket_trading < backup.sql
```

### Data Persistence
- PostgreSQL data persists in `postgres-pv` (20GB)
- Redis data persists in `redis-pv` (10GB)
- Application logs stored in `app-logs-pv` (5GB)
- Models and data in `models-data-pv` (10GB)

## Troubleshooting

### Common Issues

1. **Pods stuck in Pending**
   ```bash
   kubectl describe pod <pod-name> -n polymarket
   # Check for resource constraints or PV issues
   ```

2. **Database connection failures**
   ```bash
   # Check PostgreSQL status
   kubectl logs deployment/postgres -n polymarket
   
   # Test database connectivity
   kubectl exec -it deployment/postgres -n polymarket -- pg_isready
   ```

3. **Service discovery issues**
   ```bash
   # Check service endpoints
   kubectl get endpoints -n polymarket
   
   # Test service connectivity
   kubectl exec -it deployment/api-gateway -n polymarket -- nc -zv redis 6379
   ```

4. **Memory or CPU constraints**
   ```bash
   # Check resource usage
   kubectl top pods -n polymarket
   kubectl top nodes
   
   # Adjust resource limits in deployment manifests
   ```

### Debug Commands
```bash
# Get events
kubectl get events -n polymarket --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n polymarket
kubectl top nodes

# Network debugging
kubectl exec -it deployment/api-gateway -n polymarket -- nslookup postgres
kubectl exec -it deployment/api-gateway -n polymarket -- curl -v http://redis:6379
```

## Development vs Production

### Development Deployment
```bash
# Use development namespace
kubectl create namespace polymarket-dev

# Deploy with development configuration
kubectl apply -f namespace.yaml
# Modify configmaps.yaml to set TRADING_ENV=development
kubectl apply -f configmaps.yaml
# Continue with other manifests...
```

### Production Considerations
1. **Resource Limits**: Ensure adequate CPU and memory
2. **Storage**: Use high-performance storage classes
3. **Networking**: Configure proper network policies
4. **Monitoring**: Set up cluster monitoring (Prometheus/Grafana)
5. **Backup**: Implement automated backup strategies
6. **Security**: Enable Pod Security Policies/Pod Security Standards

## Performance Tuning

### Database Optimization
- Adjust PostgreSQL configuration in `configmaps.yaml`
- Monitor slow queries with `pg_stat_statements`
- Consider read replicas for high-load scenarios

### Cache Optimization
- Configure Redis memory policies
- Monitor cache hit rates
- Adjust cache sizes based on usage patterns

### Application Scaling
- Use HorizontalPodAutoscaler for automatic scaling
- Monitor application metrics
- Optimize resource requests and limits

## Support

For issues and questions:
1. Check pod logs: `kubectl logs -f deployment/<service-name> -n polymarket`
2. Review events: `kubectl get events -n polymarket`
3. Verify resource usage: `kubectl top pods -n polymarket`
4. Check service connectivity between components