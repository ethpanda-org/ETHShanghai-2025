# Monitoring Stack

- `prometheus.yml` — sample scrape configuration (targets the monitor service at `polymarket-monitor:8888`).
- `docker-compose.yml` — runs Prometheus + Grafana locally.

## Adding Metrics

The monitor service can expose Prometheus metrics via a `/metrics` endpoint. Update the scrape config with the actual host and job name, e.g.

```yaml
scrape_configs:
  - job_name: polymarket-monitor
    static_configs:
      - targets: ['localhost:8888']
```

Grafana dashboards can be imported via JSON export; place templates under `infra/monitoring/dashboards/` if you add them.
