# Deployment Guide

## Docker Compose (local)

```bash
cd infra/docker
docker compose up --build
```

This builds the launcher image from the repository root and starts two services:
- `trader`: runs `polymarket-launch trade --interval 60`
- `monitor`: exposes the monitoring UI on `http://localhost:8888`

Set `POLY_OFFLINE_MODE=false` and provide real API credentials to connect to production.

## Kubernetes Example

Apply `infra/k8s/trader-deployment.yaml` to deploy the trading loop and monitoring sidecar:

```bash
kubectl apply -f infra/k8s/trader-deployment.yaml
kubectl port-forward svc/polymarket-monitor 8888:8888
```

Replace the sample image tag (`polymarket/trader:latest`) with your registry build, and manage secrets via `envFrom` or mounted files for production.

## Monitoring Stack

For local observability, start Prometheus + Grafana:

```bash
cd infra/monitoring
docker compose up
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (admin/admin)

Update `prometheus.yml` to scrape actual exporter endpoints (e.g., push metrics from the monitoring service).

## Secrets and Environment

For Docker Compose, create a `.env` file in `infra/docker/` (or export variables) and update `docker-compose.yml` to reference it, e.g.:
```
# infra/docker/.env
POLY_OFFLINE_MODE=false
POLYGON_RPC_URL=...
POLY_PRIVATE_KEY=...
```

For Kubernetes, externalize configuration via Secrets or ConfigMaps:
```
apiVersion: v1
kind: Secret
metadata:
  name: polymarket-secrets
type: Opaque
stringData:
  POLY_PRIVATE_KEY: "..."
---
apiVersion: apps/v1
kind: Deployment
...
    envFrom:
      - secretRef:
          name: polymarket-secrets
```

Do not hardcode credentials in manifests. Rotate keys regularly and restrict access to secrets.


### ConfigMap / Secret manifests

```
kubectl apply -f infra/k8s/polymarket-configmap.yaml
kubectl apply -f infra/k8s/polymarket-secrets.yaml
kubectl apply -f infra/k8s/trader-deployment.yaml
```

Update `infra/k8s/polymarket-configmap.yaml` and `polymarket-secrets.yaml` with your environment-specific values before applying.

