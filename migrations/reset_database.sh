#!/bin/bash

# Database Reset Script for Mzima Homes Land Management System
# WARNING: This script will DELETE ALL DATA in the database

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
    echo "⚠️  WARNING: This script will DELETE ALL DATA in the database!"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -f, --force             Skip confirmation prompt"
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
    echo "  $0                      Reset database with confirmation"
    echo "  $0 -f                   Reset database without confirmation"
    echo ""
}

# Function to check if PostgreSQL is available
check_postgres() {
    print_status "Checking PostgreSQL connection..."
    
    if ! command -v psql &> /dev/null; then
        print_error "psql command not found. Please install PostgreSQL client."
        exit 1
    fi
    
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
        print_error "Cannot connect to PostgreSQL database."
        print_error "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
        print_error "Please check your database connection settings."
        exit 1
    fi
    
    print_success "PostgreSQL connection successful"
}

# Function to create backup before reset
create_backup() {
    print_status "Creating backup before reset..."
    
    local backup_file="backup_before_reset_$(date +%Y%m%d_%H%M%S).sql"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>/dev/null; then
        print_success "Backup created: $backup_file"
    else
        print_warning "Failed to create backup, but continuing with reset..."
    fi
}

# Function to kill all database connections
kill_connections() {
    print_status "Terminating all active database connections..."

    local kill_connections_sql=$(cat << 'EOF'
-- Terminate all connections to the database except our own
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state = 'active';

-- Also terminate idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state = 'idle';

-- Show remaining connections
SELECT
    count(*) as active_connections,
    current_database() as database_name
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();
EOF
)

    if echo "$kill_connections_sql" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
        print_success "✅ Database connections terminated"

        # Wait a moment for connections to fully close
        sleep 2

        return 0
    else
        print_warning "⚠️  Could not terminate all connections, but continuing..."
        return 0
    fi
}

# Function to reset the database
reset_database() {
    print_status "Resetting database schema..."

    # SQL script to drop everything and recreate clean schema
    local reset_sql=$(cat << 'EOF'
-- Drop all tables, functions, types, etc.
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
    
    -- Drop all types
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
    
    -- Drop all views
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
END $$;

-- Recreate clean public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Add comment
COMMENT ON SCHEMA public IS 'Standard public schema - reset for Mzima Homes Land Management System';
EOF
)
    
    if echo "$reset_sql" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
        print_success "✅ Database reset completed successfully"
        return 0
    else
        print_error "❌ Database reset failed"
        return 1
    fi
}

# Function to verify reset
verify_reset() {
    print_status "Verifying database reset..."
    
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    local type_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e';" 2>/dev/null | tr -d ' ')
    local function_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$table_count" -eq 0 ] && [ "$type_count" -eq 0 ] && [ "$function_count" -eq 0 ]; then
        print_success "✅ Database is clean and ready for fresh migrations"
        return 0
    else
        print_warning "⚠️  Database may not be completely clean:"
        echo "  Tables: $table_count"
        echo "  Types: $type_count"
        echo "  Functions: $function_count"
        return 1
    fi
}

# Parse command line arguments
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE=true
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
    echo "🔥 Mzima Homes Land Management System - Database Reset"
    echo "======================================================"
    echo ""
    
    print_warning "⚠️  WARNING: This will DELETE ALL DATA in the database!"
    echo ""
    print_status "Configuration:"
    echo "  Database Host: $DB_HOST"
    echo "  Database Port: $DB_PORT"
    echo "  Database Name: $DB_NAME"
    echo "  Database User: $DB_USER"
    echo ""
    
    # Confirmation prompt
    if [ "$FORCE" != "true" ]; then
        echo -e "${RED}This action will permanently delete all data in the database.${NC}"
        echo -e "${RED}Make sure you have a backup if you need to recover data.${NC}"
        echo ""
        read -p "Are you absolutely sure you want to continue? (type 'YES' to confirm): " -r
        echo ""
        
        if [ "$REPLY" != "YES" ]; then
            print_status "Database reset cancelled by user"
            exit 0
        fi
    else
        print_warning "Force mode enabled - skipping confirmation"
    fi
    
    # Check prerequisites
    check_postgres

    # Create backup
    create_backup

    # Kill all database connections
    kill_connections

    # Reset database
    print_status "Starting database reset process..."
    echo ""
    
    if reset_database; then
        echo ""
        verify_reset
        
        echo ""
        print_success "🎉 Database reset completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Run the migration script: ./migrations/run_migrations.sh"
        echo "2. Or run migrations manually in order"
        echo "3. Test the database setup"
        echo ""
        
        exit 0
    else
        print_error "❌ Database reset failed"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check database permissions"
        echo "2. Ensure no active connections to the database"
        echo "3. Verify database credentials"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
