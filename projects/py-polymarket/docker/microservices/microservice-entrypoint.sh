#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Polymarket Microservice Docker Entrypoint ===${NC}"
echo -e "${BLUE}Service: ${SERVICE_NAME:-unknown}${NC}"
echo -e "${BLUE}Port: ${SERVICE_PORT:-8001}${NC}"

# Function to wait for dependency services
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Waiting for $service_name at $host:$port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null || curl -f "http://$host:$port/health" >/dev/null 2>&1; then
            echo -e "${GREEN}$service_name is available!${NC}"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts: $service_name not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}$service_name failed to become available after $max_attempts attempts${NC}"
    return 1
}

# Wait for core dependencies based on service type
if [ "$WAIT_FOR_REDIS" = "true" ] && [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis (Message Broker)"
fi

if [ "$WAIT_FOR_DB" = "true" ] && [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
    wait_for_service "$DB_HOST" "$DB_PORT" "Database"
fi

if [ "$WAIT_FOR_SERVICE_REGISTRY" = "true" ] && [ -n "$SERVICE_REGISTRY_HOST" ] && [ -n "$SERVICE_REGISTRY_PORT" ]; then
    wait_for_service "$SERVICE_REGISTRY_HOST" "$SERVICE_REGISTRY_PORT" "Service Registry"
fi

# Create necessary directories
mkdir -p /app/logs /app/data /app/cache /app/tmp

# Set proper permissions
chmod 755 /app/logs /app/data /app/cache /app/tmp

echo -e "${GREEN}Environment: $TRADING_ENV${NC}"
echo -e "${GREEN}Service Name: $SERVICE_NAME${NC}"
echo -e "${GREEN}Service Port: $SERVICE_PORT${NC}"

# Handle different microservice types
case "${SERVICE_NAME}" in
    "data-collector")
        echo -e "${GREEN}Starting Data Collector Service...${NC}"
        exec python src/polymarket/microservices/data_collector_service.py
        ;;
    "strategy-engine")
        echo -e "${GREEN}Starting Strategy Engine Service...${NC}"
        exec python src/polymarket/microservices/strategy_service.py
        ;;
    "risk-manager")
        echo -e "${GREEN}Starting Risk Manager Service...${NC}"
        exec python src/polymarket/microservices/risk_manager_service.py
        ;;
    "trading-engine")
        echo -e "${GREEN}Starting Trading Engine Service...${NC}"
        exec python src/polymarket/microservices/trading_service.py
        ;;
    "notification")
        echo -e "${GREEN}Starting Notification Service...${NC}"
        exec python src/polymarket/microservices/notification_service.py
        ;;
    "api-gateway")
        echo -e "${GREEN}Starting API Gateway...${NC}"
        exec python src/polymarket/microservices/api_gateway.py
        ;;
    "service-registry")
        echo -e "${GREEN}Starting Service Registry...${NC}"
        exec python src/polymarket/microservices/service_registry.py
        ;;
    "orchestrator")
        echo -e "${GREEN}Starting Microservices Orchestrator...${NC}"
        exec python src/polymarket/microservices/orchestrator.py
        ;;
    "test")
        echo -e "${GREEN}Running microservice tests...${NC}"
        exec python -m pytest tests/microservices/ -v --service=$SERVICE_NAME
        ;;
    "bash")
        echo -e "${GREEN}Starting bash shell...${NC}"
        exec /bin/bash
        ;;
    *)
        if [ $# -eq 0 ]; then
            echo -e "${RED}No service name specified. Please set SERVICE_NAME environment variable.${NC}"
            exit 1
        else
            echo -e "${GREEN}Executing custom command: $@${NC}"
            exec "$@"
        fi
        ;;
esac