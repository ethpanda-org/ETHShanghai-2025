#!/bin/bash
# PostgreSQL Backup Script for Polymarket Trading System

set -e

# Configuration
BACKUP_DIR="/var/lib/postgresql/backups"
DB_NAME="${POSTGRES_DB:-polymarket_trading}"
DB_USER="${POSTGRES_USER:-polymarket}"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== PostgreSQL Backup for Polymarket Trading ===${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to perform full database backup
backup_full_database() {
    local backup_file="$BACKUP_DIR/polymarket_full_${TIMESTAMP}.sql.gz"
    
    echo -e "${BLUE}Creating full database backup...${NC}"
    echo "Backup file: $backup_file"
    
    if pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" \
        --verbose --no-password --format=custom \
        --compress=9 --file="${backup_file%.gz}" \
        --exclude-table-data='market_data.price_history*' \
        --exclude-table-data='audit.audit_log'; then
        
        # Compress the backup
        gzip "${backup_file%.gz}"
        
        echo -e "${GREEN}Full backup completed successfully${NC}"
        echo "Backup size: $(du -h "$backup_file" | cut -f1)"
        return 0
    else
        echo -e "${RED}Full backup failed${NC}"
        return 1
    fi
}

# Function to perform incremental backup (WAL-based)
backup_incremental() {
    local backup_base_dir="$BACKUP_DIR/incremental"
    local backup_label="polymarket_incremental_${TIMESTAMP}"
    
    mkdir -p "$backup_base_dir"
    
    echo -e "${BLUE}Creating incremental backup...${NC}"
    
    if pg_basebackup -h localhost -U "$DB_USER" -D "$backup_base_dir/$backup_label" \
        --format=tar --gzip --progress --verbose \
        --wal-method=stream --max-rate=100M; then
        
        echo -e "${GREEN}Incremental backup completed successfully${NC}"
        return 0
    else
        echo -e "${RED}Incremental backup failed${NC}"
        return 1
    fi
}

# Function to backup specific schemas for trading data
backup_trading_schemas() {
    local schemas=("trading" "market_data" "risk_management" "analytics")
    
    for schema in "${schemas[@]}"; do
        local backup_file="$BACKUP_DIR/polymarket_${schema}_${TIMESTAMP}.sql.gz"
        
        echo -e "${BLUE}Backing up schema: $schema${NC}"
        
        if pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" \
            --verbose --no-password --format=plain \
            --schema="$schema" | gzip > "$backup_file"; then
            
            echo -e "${GREEN}Schema $schema backup completed${NC}"
        else
            echo -e "${RED}Schema $schema backup failed${NC}"
            return 1
        fi
    done
    
    return 0
}

# Function to backup critical tables only (for frequent backups)
backup_critical_tables() {
    local tables=(
        "trading.orders"
        "trading.positions" 
        "market_data.markets"
        "market_data.market_outcomes"
        "risk_management.risk_metrics"
    )
    
    local backup_file="$BACKUP_DIR/polymarket_critical_${TIMESTAMP}.sql.gz"
    
    echo -e "${BLUE}Backing up critical tables...${NC}"
    
    local table_args=""
    for table in "${tables[@]}"; do
        table_args="$table_args --table=$table"
    done
    
    if pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" \
        --verbose --no-password --format=plain \
        $table_args | gzip > "$backup_file"; then
        
        echo -e "${GREEN}Critical tables backup completed${NC}"
        return 0
    else
        echo -e "${RED}Critical tables backup failed${NC}"
        return 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    echo -e "${YELLOW}Cleaning up backups older than $RETENTION_DAYS days...${NC}"
    
    local files_removed=0
    
    # Remove old backup files
    while IFS= read -r -d '' file; do
        rm "$file"
        ((files_removed++))
        echo "Removed: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "polymarket_*.sql.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Remove old incremental backup directories
    while IFS= read -r -d '' dir; do
        rm -rf "$dir"
        ((files_removed++))
        echo "Removed directory: $(basename "$dir")"
    done < <(find "$BACKUP_DIR/incremental" -name "polymarket_incremental_*" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    if [ $files_removed -gt 0 ]; then
        echo -e "${GREEN}Removed $files_removed old backup files/directories${NC}"
    else
        echo "No old backup files found to remove"
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}Backup file not found: $backup_file${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Verifying backup integrity...${NC}"
    
    # Test if the backup file can be read
    if gunzip -t "$backup_file" 2>/dev/null; then
        echo -e "${GREEN}Backup file integrity check passed${NC}"
        return 0
    else
        echo -e "${RED}Backup file integrity check failed${NC}"
        return 1
    fi
}

# Function to show backup statistics
show_backup_stats() {
    echo -e "${BLUE}Backup Statistics:${NC}"
    echo "Backup directory: $BACKUP_DIR"
    echo "Total backup files: $(find "$BACKUP_DIR" -name "*.sql.gz" -type f | wc -l)"
    echo "Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
    echo "Oldest backup: $(find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf '%T+ %p\n' | sort | head -1 | cut -d' ' -f2- | xargs basename 2>/dev/null || echo 'None')"
    echo "Newest backup: $(find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf '%T+ %p\n' | sort | tail -1 | cut -d' ' -f2- | xargs basename 2>/dev/null || echo 'None')"
}

# Main execution based on backup type
case "${1:-full}" in
    "full")
        echo -e "${BLUE}Performing full database backup${NC}"
        if backup_full_database; then
            show_backup_stats
            cleanup_old_backups
        fi
        ;;
    "incremental")
        echo -e "${BLUE}Performing incremental backup${NC}"
        if backup_incremental; then
            show_backup_stats
            cleanup_old_backups
        fi
        ;;
    "schemas")
        echo -e "${BLUE}Performing schema-specific backup${NC}"
        if backup_trading_schemas; then
            show_backup_stats
            cleanup_old_backups
        fi
        ;;
    "critical")
        echo -e "${BLUE}Performing critical tables backup${NC}"
        if backup_critical_tables; then
            show_backup_stats
        fi
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "stats")
        show_backup_stats
        ;;
    "verify")
        if [ -n "$2" ]; then
            verify_backup "$2"
        else
            echo "Usage: $0 verify <backup_file>"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [full|incremental|schemas|critical|cleanup|stats|verify]"
        echo ""
        echo "Backup types:"
        echo "  full        - Complete database backup (default)"
        echo "  incremental - WAL-based incremental backup" 
        echo "  schemas     - Trading-specific schemas only"
        echo "  critical    - Critical tables only (for frequent backups)"
        echo "  cleanup     - Remove old backup files"
        echo "  stats       - Show backup statistics"
        echo "  verify      - Verify backup file integrity"
        exit 1
        ;;
esac

echo -e "${GREEN}Backup operation completed${NC}"