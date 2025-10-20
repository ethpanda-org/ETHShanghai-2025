# Kubernetes Resources

- `trader-deployment.yaml`: example Deployment + Service running the trader and monitor sidecar.

## Deploy (example)

```bash
IMAGE_NAME=my-registry/trader:latest ./build-trader.sh
kubectl apply -f trader-deployment.yaml
kubectl port-forward svc/polymarket-monitor 8888:8888
```

Update the `image` field or use a kustomization/helm chart to manage environments. For production workloads, inject secrets via ConfigMaps/Secrets rather than hardcoding settings.
