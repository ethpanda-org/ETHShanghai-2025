# Monitoring Runbook

## Local Stack

```
cd infra/monitoring
docker compose up
```

Prometheus listens on `http://localhost:9090`, Grafana on `http://localhost:3000` (default admin/admin). Import dashboards from `infra/monitoring/dashboards/` if provided.

## Scrape Targets

Add exporters or services by editing `infra/monitoring/prometheus.yml`. Example:

```yaml
scrape_configs:
  - job_name: polymarket-trader
    static_configs:
      - targets: ['localhost:8000']  # custom metrics endpoint
```

## Exposing Metrics

The monitoring service can expose a `/metrics` endpoint using `prometheus_client`. When deployed to Kubernetes, ensure the Service selects the pod and annotate it for automatic scraping (e.g., `prometheus.io/scrape: "true"`).
