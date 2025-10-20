#!/bin/bash
# Redis Health Check Script for Polymarket Trading System

set -e

# Configuration
REDIS_HOST=${REDIS_HOST:-127.0.0.1}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check Redis connectivity
check_redis_ping() {
    local auth_arg=""
    if [ -n "$REDIS_PASSWORD" ]; then
        auth_arg="-a $REDIS_PASSWORD"
    fi
    
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_arg ping >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to check Redis memory usage
check_memory_usage() {
    local auth_arg=""
    if [ -n "$REDIS_PASSWORD" ]; then
        auth_arg="-a $REDIS_PASSWORD"
    fi
    
    local memory_info
    memory_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_arg info memory 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local used_memory_human
        used_memory_human=$(echo "$memory_info" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
        
        local memory_usage_ratio
        memory_usage_ratio=$(echo "$memory_info" | grep "used_memory_rss:" | cut -d: -f2 | tr -d '\r')
        
        # Extract numeric value for comparison (warning at 80% memory usage)
        local used_memory
        used_memory=$(echo "$memory_info" | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
        
        local max_memory
        max_memory=$(echo "$memory_info" | grep "maxmemory:" | cut -d: -f2 | tr -d '\r')
        
        if [ "$max_memory" -gt 0 ]; then
            local usage_percentage
            usage_percentage=$(( used_memory * 100 / max_memory ))
            
            if [ "$usage_percentage" -gt 80 ]; then
                echo -e "${YELLOW}Warning: Memory usage at ${usage_percentage}% (${used_memory_human})${NC}" >&2
                return 1
            fi
        fi
        
        return 0
    else
        return 1
    fi
}

# Function to check trading system specific keys
check_trading_keys() {
    local auth_arg=""
    if [ -n "$REDIS_PASSWORD" ]; then
        auth_arg="-a $REDIS_PASSWORD"
    fi
    
    # Check if trading-specific databases are accessible
    local db_checks=0
    local db_total=6
    
    for db in $(seq 0 5); do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_arg -n "$db" ping >/dev/null 2>&1; then
            ((db_checks++))
        fi
    done
    
    if [ "$db_checks" -eq "$db_total" ]; then
        return 0
    else
        echo -e "${YELLOW}Warning: Only $db_checks/$db_total trading databases accessible${NC}" >&2
        return 1
    fi
}

# Function to check Redis cluster health (if in cluster mode)
check_cluster_health() {
    local auth_arg=""
    if [ -n "$REDIS_PASSWORD" ]; then
        auth_arg="-a $REDIS_PASSWORD"
    fi
    
    if [ "$REDIS_MODE" = "cluster" ]; then
        local cluster_info
        cluster_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_arg cluster info 2>/dev/null)
        
        if echo "$cluster_info" | grep -q "cluster_state:ok"; then
            return 0
        else
            echo -e "${RED}Cluster health check failed${NC}" >&2
            return 1
        fi
    fi
    
    return 0
}

# Function to check pub/sub functionality
check_pubsub() {
    local auth_arg=""
    if [ -n "$REDIS_PASSWORD" ]; then
        auth_arg="-a $REDIS_PASSWORD"
    fi
    
    # Check if pub/sub channels are working by checking channel info
    local channels_info
    channels_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $auth_arg -n 5 pubsub channels "*trading*" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        return 0
    else
        echo -e "${YELLOW}Warning: Pub/Sub functionality check failed${NC}" >&2
        return 1
    fi
}

# Main health check execution
main() {
    local exit_code=0
    local checks_passed=0
    local total_checks=5
    
    echo "Redis Health Check for Polymarket Trading System"
    echo "================================================"
    
    # Check 1: Basic connectivity
    echo -n "Checking Redis connectivity... "
    if check_redis_ping; then
        echo -e "${GREEN}OK${NC}"
        ((checks_passed++))
    else
        echo -e "${RED}FAILED${NC}"
        exit_code=1
    fi
    
    # Check 2: Memory usage
    echo -n "Checking memory usage... "
    if check_memory_usage; then
        echo -e "${GREEN}OK${NC}"
        ((checks_passed++))
    else
        echo -e "${YELLOW}WARNING${NC}"
        # Don't fail on memory warning, just log it
        ((checks_passed++))
    fi
    
    # Check 3: Trading databases
    echo -n "Checking trading databases... "
    if check_trading_keys; then
        echo -e "${GREEN}OK${NC}"
        ((checks_passed++))
    else
        echo -e "${RED}FAILED${NC}"
        exit_code=1
    fi
    
    # Check 4: Cluster health (if applicable)
    echo -n "Checking cluster health... "
    if check_cluster_health; then
        echo -e "${GREEN}OK${NC}"
        ((checks_passed++))
    else
        echo -e "${RED}FAILED${NC}"
        exit_code=1
    fi
    
    # Check 5: Pub/Sub functionality
    echo -n "Checking pub/sub functionality... "
    if check_pubsub; then
        echo -e "${GREEN}OK${NC}"
        ((checks_passed++))
    else
        echo -e "${YELLOW}WARNING${NC}"
        # Don't fail on pub/sub warning for basic health check
        ((checks_passed++))
    fi
    
    echo "================================================"
    echo "Health Check Summary: $checks_passed/$total_checks checks passed"
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}Redis is healthy and ready for trading operations${NC}"
    else
        echo -e "${RED}Redis health check failed - trading operations may be impacted${NC}"
    fi
    
    exit $exit_code
}

# Execute main function
main "$@"