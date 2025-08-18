#!/bin/bash

# Kill Database Connections Script
# Terminates all active connections to the specified database

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-land_management}"
DB_USER="${DB_USER:-postgres}"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Terminates all active connections to the specified database."
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -v, --verbose           Show detailed connection information"
    echo "  --host HOST             Database host (default: localhost)"
    echo "  --port PORT             Database port (default: 5432)"
    echo "  --database DB           Database name (default: land_management)"
    echo "  --user USER             Database user (default: postgres)"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST                 Database host"
    echo "  DB_PORT                 Database port"
    echo "  DB_NAME                 Database name"
    echo "  DB_USER                 Database user"
    echo "  PGPASSWORD              Database password"
    echo ""
    echo "Examples:"
    echo "  $0                      Kill all connections to default database"
    echo "  $0 -v                   Kill connections with verbose output"
    echo "  $0 --database mydb      Kill connections to specific database"
    echo ""
}

# Function to check if PostgreSQL is available
check_postgres() {
    if ! command -v psql &> /dev/null; then
        print_error "psql command not found. Please install PostgreSQL client."
        exit 1
    fi
    
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
        print_error "Cannot connect to PostgreSQL database."
        print_error "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
        exit 1
    fi
}

# Function to show current connections
show_connections() {
    print_status "Current database connections:"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections,
            count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid();
    " 2>/dev/null || print_warning "Could not retrieve connection information"
}

# Function to show detailed connections
show_detailed_connections() {
    print_status "Detailed connection information:"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            pid,
            usename as username,
            application_name,
            client_addr,
            state,
            query_start,
            left(query, 50) as current_query
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
        ORDER BY state_change DESC;
    " 2>/dev/null || print_warning "Could not retrieve detailed connection information"
}

# Function to kill all connections
kill_connections() {
    print_status "Terminating all database connections..."
    
    # Get connection count before termination
    local before_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) 
        FROM pg_stat_activity 
        WHERE datname = current_database() 
          AND pid <> pg_backend_pid();
    " 2>/dev/null | tr -d ' ' || echo "0")
    
    # Terminate connections
    local terminated_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(pg_terminate_backend(pid))
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid();
    " 2>/dev/null | tr -d ' ' || echo "0")
    
    # Wait a moment for connections to close
    sleep 2
    
    # Get connection count after termination
    local after_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) 
        FROM pg_stat_activity 
        WHERE datname = current_database() 
          AND pid <> pg_backend_pid();
    " 2>/dev/null | tr -d ' ' || echo "0")
    
    print_success "Connection termination completed:"
    echo "  Connections before: $before_count"
    echo "  Connections terminated: $terminated_count"
    echo "  Connections remaining: $after_count"
    
    if [ "$after_count" -eq 0 ]; then
        print_success "✅ All connections successfully terminated"
    else
        print_warning "⚠️  $after_count connections still remain"
    fi
}

# Parse command line arguments
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --database)
            DB_NAME="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "🔌 Database Connection Killer"
    echo "============================="
    echo ""
    
    print_status "Configuration:"
    echo "  Database Host: $DB_HOST"
    echo "  Database Port: $DB_PORT"
    echo "  Database Name: $DB_NAME"
    echo "  Database User: $DB_USER"
    echo ""
    
    # Check prerequisites
    check_postgres
    
    # Show current connections
    show_connections
    
    if [ "$VERBOSE" = "true" ]; then
        echo ""
        show_detailed_connections
    fi
    
    echo ""
    
    # Kill connections
    kill_connections
    
    echo ""
    print_success "🎉 Database connection termination completed!"
    
    if [ "$VERBOSE" = "true" ]; then
        echo ""
        show_connections
    fi
}

# Run main function
main "$@"
