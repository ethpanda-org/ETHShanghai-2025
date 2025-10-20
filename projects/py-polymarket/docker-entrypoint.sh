#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Polymarket Trading System Docker Entrypoint ===${NC}"

# Function to wait for service
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Waiting for $service_name at $host:$port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
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

# Wait for dependencies if configured
if [ "$WAIT_FOR_DB" = "true" ] && [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
    wait_for_service "$DB_HOST" "$DB_PORT" "Database"
fi

if [ "$WAIT_FOR_REDIS" = "true" ] && [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis"
fi

# Create necessary directories
mkdir -p /app/logs /app/data /app/cache /app/tmp

# Set proper permissions
chmod 755 /app/logs /app/data /app/cache /app/tmp

echo -e "${GREEN}Environment: $TRADING_ENV${NC}"
echo -e "${GREEN}Python Path: $PYTHONPATH${NC}"

# Handle different run modes
case "${1}" in
    "main"|"")
        echo -e "${GREEN}Starting main trading application...${NC}"
        exec python src/polymarket/main.py
        ;;
    "microservices")
        echo -e "${GREEN}Starting microservices orchestrator...${NC}"
        exec python src/polymarket/microservices/orchestrator.py
        ;;
    "enhanced-trading")
        echo -e "${GREEN}Starting enhanced trading system...${NC}"
        exec python enhanced_simulation_trading.py
        ;;
    "data-collector")
        echo -e "${GREEN}Starting data collector service...${NC}"
        exec python src/polymarket/microservices/data_collector_service.py
        ;;
    "strategy-engine")
        echo -e "${GREEN}Starting strategy engine service...${NC}"
        exec python src/polymarket/microservices/strategy_service.py
        ;;
    "risk-manager")
        echo -e "${GREEN}Starting risk manager service...${NC}"
        exec python src/polymarket/microservices/risk_manager_service.py
        ;;
    "trading-engine")
        echo -e "${GREEN}Starting trading engine service...${NC}"
        exec python src/polymarket/microservices/trading_service.py
        ;;
    "web-monitor")
        echo -e "${GREEN}Starting web monitor...${NC}"
        exec python web_monitor.py
        ;;
    "test")
        echo -e "${GREEN}Running tests...${NC}"
        exec python -m pytest tests/ -v
        ;;
    "bash")
        echo -e "${GREEN}Starting bash shell...${NC}"
        exec /bin/bash
        ;;
    *)
        echo -e "${GREEN}Executing custom command: $@${NC}"
        exec "$@"
        ;;
esac