# Deployment script for Kubernetes manifests
#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="polymarket"
KUBECTL_CONTEXT=""
DRY_RUN=false
SKIP_WAIT=false

# Print usage information
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --namespace NAMESPACE    Kubernetes namespace (default: polymarket)"
    echo "  -c, --context CONTEXT        Kubectl context to use"
    echo "  -d, --dry-run               Perform a dry run without making changes"
    echo "  -s, --skip-wait             Skip waiting for deployments to be ready"
    echo "  -h, --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          Deploy to default namespace"
    echo "  $0 -n polymarket-prod       Deploy to production namespace"
    echo "  $0 -d                       Dry run deployment"
    echo "  $0 -c prod-cluster          Use specific kubectl context"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -c|--context)
            KUBECTL_CONTEXT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--skip-wait)
            SKIP_WAIT=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            usage
            exit 1
            ;;
    esac
done

# Set kubectl context if provided
if [[ -n "$KUBECTL_CONTEXT" ]]; then
    kubectl config use-context "$KUBECTL_CONTEXT"
fi

# Function to execute kubectl commands
kubectl_exec() {
    local cmd="$1"
    local resource="$2"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${YELLOW}[DRY RUN] kubectl $cmd $resource --dry-run=client${NC}"
        kubectl $cmd "$resource" --dry-run=client -o yaml
    else
        echo -e "${BLUE}Executing: kubectl $cmd $resource${NC}"
        kubectl $cmd "$resource"
    fi
}

# Function to wait for deployment
wait_for_deployment() {
    local deployment="$1"
    
    if [[ "$SKIP_WAIT" == true ]] || [[ "$DRY_RUN" == true ]]; then
        return 0
    fi
    
    echo -e "${YELLOW}Waiting for deployment $deployment to be ready...${NC}"
    kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout=300s
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}Deployment $deployment is ready${NC}"
    else
        echo -e "${RED}Deployment $deployment failed to become ready${NC}"
        return 1
    fi
}

# Function to verify prerequisites
verify_prerequisites() {
    echo -e "${BLUE}Verifying prerequisites...${NC}"
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}kubectl is not installed${NC}"
        exit 1
    fi
    
    # Check if cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    
    # Check if namespace exists (create if it doesn't)
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo -e "${YELLOW}Creating namespace $NAMESPACE${NC}"
        kubectl_exec "apply -f" "namespace.yaml"
    fi
    
    echo -e "${GREEN}Prerequisites verified${NC}"
}

# Function to deploy manifests in order
deploy_manifests() {
    echo -e "${GREEN}Starting Kubernetes deployment for Polymarket Trading System${NC}"
    echo -e "${BLUE}Target namespace: $NAMESPACE${NC}"
    echo ""
    
    # Define deployment order
    local manifests=(
        "namespace.yaml"
        "rbac.yaml"
        "configmaps.yaml"
        "secrets.yaml"
        "persistentvolumes.yaml"
        "postgres.yaml"
        "redis.yaml"
        "api-gateway.yaml"
        "data-collector.yaml"
        "strategy-engine.yaml"
        "risk-manager.yaml"
        "trading-engine.yaml"
        "web-monitor.yaml"
        "nginx-ingress.yaml"
        "network-policies.yaml"
    )
    
    # Deploy each manifest
    for manifest in "${manifests[@]}"; do
        if [[ -f "$manifest" ]]; then
            echo -e "${BLUE}Deploying $manifest...${NC}"
            kubectl_exec "apply -f" "$manifest"
            
            # Add small delay between deployments
            if [[ "$DRY_RUN" != true ]]; then
                sleep 2
            fi
        else
            echo -e "${YELLOW}Warning: $manifest not found, skipping${NC}"
        fi
    done
    
    echo ""
    echo -e "${GREEN}All manifests deployed${NC}"
}

# Function to wait for all deployments
wait_for_all_deployments() {
    if [[ "$SKIP_WAIT" == true ]] || [[ "$DRY_RUN" == true ]]; then
        return 0
    fi
    
    echo -e "${BLUE}Waiting for all deployments to be ready...${NC}"
    
    local deployments=(
        "postgres"
        "redis"
        "api-gateway"
        "data-collector"
        "strategy-engine"
        "risk-manager"
        "trading-engine"
        "web-monitor"
        "nginx"
    )
    
    for deployment in "${deployments[@]}"; do
        wait_for_deployment "$deployment"
    done
    
    echo ""
    echo -e "${GREEN}All deployments are ready${NC}"
}

# Function to display deployment status
show_status() {
    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi
    
    echo ""
    echo -e "${GREEN}=== Deployment Status ===${NC}"
    
    echo -e "${BLUE}Pods:${NC}"
    kubectl get pods -n "$NAMESPACE" -o wide
    
    echo ""
    echo -e "${BLUE}Services:${NC}"
    kubectl get services -n "$NAMESPACE"
    
    echo ""
    echo -e "${BLUE}Ingress:${NC}"
    kubectl get ingress -n "$NAMESPACE"
    
    echo ""
    echo -e "${BLUE}PersistentVolumes:${NC}"
    kubectl get pv -l app=postgres,app=redis
    
    echo ""
    echo -e "${BLUE}PersistentVolumeClaims:${NC}"
    kubectl get pvc -n "$NAMESPACE"
}

# Function to show access information
show_access_info() {
    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi
    
    echo ""
    echo -e "${GREEN}=== Access Information ===${NC}"
    
    # Get LoadBalancer IP or NodePort
    local nginx_ip=$(kubectl get service nginx -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    local nginx_port=$(kubectl get service nginx -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null)
    
    if [[ -n "$nginx_ip" ]]; then
        echo -e "${BLUE}Web Monitor: http://$nginx_ip:$nginx_port/monitor/${NC}"
        echo -e "${BLUE}API Gateway: http://$nginx_ip:$nginx_port/api/${NC}"
    else
        echo -e "${YELLOW}LoadBalancer IP not available yet. Use port-forward:${NC}"
        echo -e "${BLUE}kubectl port-forward service/nginx 8080:80 -n $NAMESPACE${NC}"
        echo -e "${BLUE}Then access: http://localhost:8080/monitor/${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Direct service access (via kubectl port-forward):${NC}"
    echo -e "${YELLOW}kubectl port-forward service/web-monitor 8888:8888 -n $NAMESPACE${NC}"
    echo -e "${YELLOW}kubectl port-forward service/api-gateway 8000:8000 -n $NAMESPACE${NC}"
}

# Main execution
main() {
    echo -e "${GREEN}Polymarket Trading System - Kubernetes Deployment${NC}"
    echo -e "${GREEN}=================================================${NC}"
    
    verify_prerequisites
    deploy_manifests
    wait_for_all_deployments
    show_status
    show_access_info
    
    echo ""
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${YELLOW}This was a dry run. No changes were made to the cluster.${NC}"
    fi
}

# Run main function
main "$@"