#!/bin/bash
# Redis Entrypoint Script for Polymarket Trading System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Redis Entrypoint for Polymarket Trading ===${NC}"

# Create necessary directories
mkdir -p /var/log/redis /data

# Set proper permissions
chown -R redis:redis /var/log/redis /data

# Function to wait for cluster nodes (if clustering is enabled)
wait_for_cluster_nodes() {
    if [ "$REDIS_CLUSTER_ENABLED" = "yes" ]; then
        echo -e "${YELLOW}Waiting for Redis cluster nodes...${NC}"
        
        # Parse cluster nodes from environment variable
        IFS=',' read -ra CLUSTER_NODES <<< "$REDIS_CLUSTER_NODES"
        
        for node in "${CLUSTER_NODES[@]}"; do
            IFS=':' read -r host port <<< "$node"
            echo -e "${BLUE}Waiting for cluster node $host:$port...${NC}"
            
            timeout=30
            while [ $timeout -gt 0 ]; do
                if redis-cli -h "$host" -p "$port" ping >/dev/null 2>&1; then
                    echo -e "${GREEN}Cluster node $host:$port is ready${NC}"
                    break
                fi
                sleep 2
                ((timeout -= 2))
            done
            
            if [ $timeout -le 0 ]; then
                echo -e "${RED}Cluster node $host:$port failed to become available${NC}"
                exit 1
            fi
        done
    fi
}

# Function to setup Redis configuration based on mode
setup_redis_config() {
    local config_file="/etc/redis/redis.conf"
    
    # Apply environment variable overrides
    if [ -n "$REDIS_PASSWORD" ]; then
        echo "requirepass $REDIS_PASSWORD" >> "$config_file"
        echo "masterauth $REDIS_PASSWORD" >> "$config_file"
    fi
    
    if [ -n "$REDIS_MAX_MEMORY" ]; then
        sed -i "s/^maxmemory .*/maxmemory $REDIS_MAX_MEMORY/" "$config_file"
    fi
    
    if [ -n "$REDIS_MAX_MEMORY_POLICY" ]; then
        sed -i "s/^maxmemory-policy .*/maxmemory-policy $REDIS_MAX_MEMORY_POLICY/" "$config_file"
    fi
    
    # Configure based on Redis mode
    case "$REDIS_MODE" in
        "cluster")
            echo -e "${BLUE}Configuring Redis in cluster mode${NC}"
            cp /etc/redis/redis-cluster.conf "$config_file"
            echo "cluster-enabled yes" >> "$config_file"
            echo "cluster-config-file nodes-6379.conf" >> "$config_file"
            echo "cluster-node-timeout 15000" >> "$config_file"
            ;;
        "sentinel")
            echo -e "${BLUE}Configuring Redis in sentinel mode${NC}"
            # Sentinel configuration would go here
            ;;
        "replica")
            echo -e "${BLUE}Configuring Redis as replica${NC}"
            if [ -n "$REDIS_MASTER_HOST" ] && [ -n "$REDIS_MASTER_PORT" ]; then
                echo "replicaof $REDIS_MASTER_HOST $REDIS_MASTER_PORT" >> "$config_file"
            fi
            ;;
        *)
            echo -e "${BLUE}Configuring Redis in standalone mode${NC}"
            ;;
    esac
    
    echo -e "${GREEN}Redis configuration completed${NC}"
}

# Function to initialize Redis for trading system
init_trading_data() {
    echo -e "${YELLOW}Initializing Redis for trading system...${NC}"
    
    # Start Redis in background for initialization
    redis-server "$1" --daemonize yes
    
    # Wait for Redis to be ready
    timeout=30
    while [ $timeout -gt 0 ] && ! redis-cli ping >/dev/null 2>&1; do
        sleep 1
        ((timeout--))
    done
    
    if [ $timeout -le 0 ]; then
        echo -e "${RED}Redis failed to start for initialization${NC}"
        exit 1
    fi
    
    # Initialize database structures
    redis-cli << 'EOF'
# Set up database purposes with INFO keys
SELECT 0
SET db:purpose "Market data cache"
SET db:description "Real-time market prices, volumes, and metadata"

SELECT 1  
SET db:purpose "Strategy signals cache"
SET db:description "Trading signals and strategy outputs"

SELECT 2
SET db:purpose "Risk calculations cache" 
SET db:description "Risk metrics, portfolio values, and exposure data"

SELECT 3
SET db:purpose "User sessions"
SET db:description "Authentication tokens and user state"

SELECT 4
SET db:purpose "Rate limiting"
SET db:description "API rate limiting counters and windows"

SELECT 5
SET db:purpose "Message queues"
SET db:description "Pub/Sub channels for microservice communication"

# Create some sample pub/sub channels for microservices
SELECT 5
PUBLISH "trading.signals" "Redis message broker initialized for Polymarket trading system"
PUBLISH "market.data.updates" "Market data channel ready"
PUBLISH "risk.alerts" "Risk management channel ready"
PUBLISH "system.notifications" "System notification channel ready"

EOF
    
    # Stop the background Redis instance
    redis-cli shutdown nosave >/dev/null 2>&1 || true
    
    echo -e "${GREEN}Trading system initialization completed${NC}"
}

# Main execution
echo -e "${BLUE}Redis Mode: ${REDIS_MODE}${NC}"
echo -e "${BLUE}Redis Config: /etc/redis/redis.conf${NC}"

# Setup configuration
setup_redis_config

# Wait for cluster nodes if needed
wait_for_cluster_nodes

# Initialize trading system data structures
if [ "$INIT_TRADING_DATA" = "true" ]; then
    init_trading_data "/etc/redis/redis.conf"
fi

echo -e "${GREEN}Starting Redis server...${NC}"

# Handle different startup scenarios
case "${1}" in
    "redis-server")
        # Normal Redis server startup
        exec "$@"
        ;;
    "redis-cli")
        # Redis CLI mode
        exec "$@"
        ;;
    "cluster-setup")
        # Cluster setup mode
        echo -e "${YELLOW}Setting up Redis cluster...${NC}"
        exec /usr/local/bin/redis-cluster-setup.sh
        ;;
    "test")
        # Test mode
        echo -e "${YELLOW}Running Redis tests...${NC}"
        redis-server /etc/redis/redis.conf --daemonize yes
        sleep 2
        redis-cli ping
        redis-cli info server
        exit 0
        ;;
    *)
        # Default: start Redis server with our configuration
        exec redis-server /etc/redis/redis.conf
        ;;
esac