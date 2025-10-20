#!/bin/bash
# PostgreSQL Entrypoint Script for Polymarket Trading System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== PostgreSQL Entrypoint for Polymarket Trading ===${NC}"

# Function to wait for network dependencies
wait_for_network() {
    if [ -n "$WAIT_FOR_SERVICES" ]; then
        IFS=',' read -ra SERVICES <<< "$WAIT_FOR_SERVICES"
        
        for service in "${SERVICES[@]}"; do
            IFS=':' read -r host port <<< "$service"
            echo -e "${YELLOW}Waiting for $host:$port...${NC}"
            
            timeout=60
            while [ $timeout -gt 0 ]; do
                if nc -z "$host" "$port" 2>/dev/null; then
                    echo -e "${GREEN}$host:$port is available${NC}"
                    break
                fi
                sleep 2
                ((timeout -= 2))
            done
            
            if [ $timeout -le 0 ]; then
                echo -e "${RED}$host:$port failed to become available${NC}"
                exit 1
            fi
        done
    fi
}

# Function to setup PostgreSQL data directory
setup_data_directory() {
    echo -e "${BLUE}Setting up PostgreSQL data directory...${NC}"
    
    # Create data directory if it doesn't exist
    if [ ! -d "$PGDATA" ]; then
        echo "Creating data directory: $PGDATA"
        mkdir -p "$PGDATA"
        chown -R postgres:postgres "$PGDATA"
        chmod 700 "$PGDATA"
    fi
    
    # Initialize database if needed
    if [ ! -s "$PGDATA/PG_VERSION" ]; then
        echo -e "${YELLOW}Initializing PostgreSQL database...${NC}"
        initdb --username="$POSTGRES_USER" --pwfile=<(echo "$POSTGRES_PASSWORD")
        echo -e "${GREEN}Database initialization completed${NC}"
    fi
}

# Function to configure PostgreSQL for trading system
configure_postgres() {
    echo -e "${BLUE}Configuring PostgreSQL for trading system...${NC}"
    
    # Copy custom configuration if provided
    if [ -f "/etc/postgresql/postgresql.conf" ]; then
        cp /etc/postgresql/postgresql.conf "$PGDATA/postgresql.conf"
        echo "Applied custom postgresql.conf"
    fi
    
    if [ -f "/etc/postgresql/pg_hba.conf" ]; then
        cp /etc/postgresql/pg_hba.conf "$PGDATA/pg_hba.conf"
        echo "Applied custom pg_hba.conf"
    fi
    
    # Set environment-specific configurations
    if [ "$TRADING_ENV" = "development" ]; then
        echo -e "${YELLOW}Applying development configuration...${NC}"
        # Enable more verbose logging for development
        sed -i "s/#log_statement = .*/log_statement = 'all'/" "$PGDATA/postgresql.conf"
        sed -i "s/#log_min_duration_statement = .*/log_min_duration_statement = 100/" "$PGDATA/postgresql.conf"
    elif [ "$TRADING_ENV" = "production" ]; then
        echo -e "${BLUE}Applying production configuration...${NC}"
        # Optimize for production
        sed -i "s/#log_statement = .*/log_statement = 'mod'/" "$PGDATA/postgresql.conf"
        sed -i "s/#log_min_duration_statement = .*/log_min_duration_statement = 1000/" "$PGDATA/postgresql.conf"
    fi
}

# Function to start PostgreSQL and wait for it to be ready
start_postgres_and_wait() {
    echo -e "${BLUE}Starting PostgreSQL server...${NC}"
    
    # Start PostgreSQL in the background
    pg_ctl start -D "$PGDATA" -l "$PGDATA/postgresql.log" -w
    
    # Wait for PostgreSQL to be ready
    timeout=60
    while [ $timeout -gt 0 ]; do
        if pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
            echo -e "${GREEN}PostgreSQL is ready${NC}"
            return 0
        fi
        sleep 2
        ((timeout -= 2))
    done
    
    echo -e "${RED}PostgreSQL failed to become ready${NC}"
    return 1
}

# Function to perform post-startup configuration
post_startup_config() {
    echo -e "${BLUE}Performing post-startup configuration...${NC}"
    
    # Create additional users and configurations that require a running server
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" << 'EOF'
        -- Enable pg_stat_statements extension
        CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
        
        -- Create monitoring views if they don't exist
        CREATE OR REPLACE VIEW monitoring.active_connections AS
        SELECT 
            pid,
            usename,
            application_name,
            client_addr,
            client_port,
            backend_start,
            query_start,
            state,
            query
        FROM pg_stat_activity 
        WHERE state != 'idle'
        AND pid != pg_backend_pid();
        
        -- Create index usage monitoring view
        CREATE OR REPLACE VIEW monitoring.index_usage AS
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC;
        
        -- Create table size monitoring view
        CREATE OR REPLACE VIEW monitoring.table_sizes AS
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY size_bytes DESC;
EOF
    
    echo -e "${GREEN}Post-startup configuration completed${NC}"
}

# Function to setup automated backups
setup_backup_cron() {
    if [ "$ENABLE_BACKUPS" = "true" ]; then
        echo -e "${BLUE}Setting up automated backups...${NC}"
        
        # Create cron job for daily full backups at 2 AM
        echo "0 2 * * * /usr/local/bin/backup.sh full >> /var/log/postgresql/backup.log 2>&1" > /tmp/backup-cron
        
        # Create cron job for hourly critical table backups
        echo "0 * * * * /usr/local/bin/backup.sh critical >> /var/log/postgresql/backup.log 2>&1" >> /tmp/backup-cron
        
        # Install the cron jobs
        crontab -u postgres /tmp/backup-cron
        rm /tmp/backup-cron
        
        echo -e "${GREEN}Automated backups configured${NC}"
    fi
}

# Main execution logic
echo -e "${BLUE}PostgreSQL Version: $(postgres --version)${NC}"
echo -e "${BLUE}Data Directory: $PGDATA${NC}"
echo -e "${BLUE}Database: $POSTGRES_DB${NC}"
echo -e "${BLUE}User: $POSTGRES_USER${NC}"
echo -e "${BLUE}Environment: ${TRADING_ENV:-production}${NC}"

# Wait for network dependencies
wait_for_network

# Setup and configure PostgreSQL
setup_data_directory
configure_postgres

case "${1}" in
    "postgres")
        # Standard PostgreSQL startup
        echo -e "${GREEN}Starting PostgreSQL server for trading system...${NC}"
        
        # If this is the first time, run initialization scripts
        if [ "$POSTGRES_INIT_TRADING" = "true" ]; then
            start_postgres_and_wait
            post_startup_config
            setup_backup_cron
            
            # Stop PostgreSQL to restart it properly with the main process
            pg_ctl stop -D "$PGDATA" -w
        fi
        
        # Start PostgreSQL as the main process
        exec postgres -D "$PGDATA"
        ;;
    "backup")
        # Backup mode
        shift
        exec /usr/local/bin/backup.sh "$@"
        ;;
    "psql")
        # Interactive psql session
        exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
        ;;
    "test-connection")
        # Test database connection
        start_postgres_and_wait
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version();"
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog');"
        exit 0
        ;;
    *)
        # Pass through to original docker-entrypoint
        exec docker-entrypoint.sh "$@"
        ;;
esac