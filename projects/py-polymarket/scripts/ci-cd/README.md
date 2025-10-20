# CI/CD Support Scripts for Polymarket Trading System

## Overview

This directory contains supporting scripts for the CI/CD pipeline, including test initialization, deployment verification, and monitoring utilities.

## Scripts

### Test Initialization (`init_test_db.py`)
Initializes the test database with required schemas and sample data.

### Staging Tests (`staging_tests.py`)
Comprehensive tests for staging environment validation.

### Performance Tests (`performance_tests.py`)
Load testing and performance benchmarks.

### Production Readiness Tests (`production_readiness_tests.py`)
Critical production environment validation.

### Monitoring Scripts
- `warmup_services.py` - Service warm-up before traffic switch
- `monitor_deployment.py` - Post-deployment monitoring
- `health_check.py` - System health verification
- `post_deployment_monitor.py` - Extended monitoring

## Usage

These scripts are automatically executed by the CI/CD pipeline but can also be run manually:

```bash
# Initialize test database
python scripts/init_test_db.py

# Run staging tests
python scripts/staging_tests.py --endpoint staging.example.com

# Performance testing
python scripts/performance_tests.py --duration 300 --threads 10

# Production readiness check
python scripts/production_readiness_tests.py --color green

# Warm up services
python scripts/warmup_services.py --color blue

# Monitor deployment
python scripts/monitor_deployment.py --duration 600 --color green

# Health check
python scripts/health_check.py --environment production

# Post-deployment monitoring
python scripts/post_deployment_monitor.py --duration 1800
```

## Configuration

Scripts use environment variables for configuration:
- `DATABASE_URL` - Database connection string
- `REDIS_URL` - Redis connection string
- `TRADING_ENV` - Environment (testing, development, staging, production)
- `API_ENDPOINT` - API endpoint for testing
- `SLACK_WEBHOOK_URL` - Slack notifications

## Integration

These scripts integrate with:
- GitHub Actions workflow (`.github/workflows/ci-cd.yml`)
- GitLab CI/CD pipeline (`.gitlab-ci.yml`)
- Kubernetes deployment manifests (`k8s/`)
- Docker containers and services