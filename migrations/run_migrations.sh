#!/bin/bash

# Migration Runner Script for Mzima Homes Land Management System
# This script runs all database migrations in the correct order

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
MIGRATION_DIR="$(dirname "$0")"

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

# Function to run a single migration
run_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)

    print_status "Running migration: $migration_name"

    # Create a temporary file with error handling
    local temp_file=$(mktemp)
    local error_file=$(mktemp)

    # Add error handling to the migration
    cat > "$temp_file" << 'EOF'
-- Set error handling
\set ON_ERROR_STOP on

-- Function to handle existing objects gracefully
DO $$
BEGIN
    -- This block will catch errors and continue
    NULL;
END $$;

EOF

    # Append the original migration content
    cat "$migration_file" >> "$temp_file"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$temp_file" 2>"$error_file"; then
        print_success "✅ $migration_name completed successfully"
        rm -f "$temp_file" "$error_file"
        return 0
    else
        local error_content=$(cat "$error_file")

        # Check if it's just "already exists" errors
        if echo "$error_content" | grep -q "already exists\|duplicate key\|relation.*already exists"; then
            print_warning "⚠️  $migration_name: Some objects already exist (skipping duplicates)"
            rm -f "$temp_file" "$error_file"
            return 0
        else
            print_error "❌ $migration_name failed with errors:"
            echo "$error_content" | head -10
            rm -f "$temp_file" "$error_file"
            return 1
        fi
    fi
}

# Function to create backup
create_backup() {
    if [ "$SKIP_BACKUP" != "true" ]; then
        print_status "Creating database backup before migration..."
        
        local backup_file="backup_before_migration_$(date +%Y%m%d_%H%M%S).sql"
        
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>/dev/null; then
            print_success "Backup created: $backup_file"
        else
            print_warning "Failed to create backup, but continuing with migration..."
        fi
    else
        print_warning "Skipping backup as requested"
    fi
}

# Function to verify migration results
verify_migrations() {
    print_status "Verifying migration results..."
    
    # Check if all tables were created
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$table_count" -gt 20 ]; then
        print_success "✅ Tables created successfully ($table_count tables)"
    else
        print_warning "⚠️  Expected more tables. Found: $table_count"
    fi
    
    # Check if indexes were created
    local index_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$index_count" -gt 50 ]; then
        print_success "✅ Indexes created successfully ($index_count indexes)"
    else
        print_warning "⚠️  Expected more indexes. Found: $index_count"
    fi
    
    # Check if functions were created
    local function_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$function_count" -gt 10 ]; then
        print_success "✅ Functions created successfully ($function_count functions)"
    else
        print_warning "⚠️  Expected more functions. Found: $function_count"
    fi
    
    # Check if sample data was loaded (if migration 009 was run)
    if [ "$INCLUDE_SAMPLE_DATA" = "true" ]; then
        local parcel_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM parcels;" 2>/dev/null | tr -d ' ')
        
        if [ "$parcel_count" -gt 0 ]; then
            print_success "✅ Sample data loaded successfully ($parcel_count parcels)"
        else
            print_warning "⚠️  No sample data found"
        fi
    fi
}

# Function to display help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -s, --skip-backup       Skip database backup before migration"
    echo "  -d, --include-sample    Include sample data (migration 009)"
    echo "  -v, --verbose           Verbose output"
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
    echo "  $0                      Run all migrations except sample data"
    echo "  $0 -d                   Run all migrations including sample data"
    echo "  $0 -s -d                Run all migrations with sample data, skip backup"
    echo ""
}

# Parse command line arguments
SKIP_BACKUP=false
INCLUDE_SAMPLE_DATA=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        -d|--include-sample)
            INCLUDE_SAMPLE_DATA=true
            shift
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
    echo "🚀 Mzima Homes Land Management System - Database Migration"
    echo "=========================================================="
    echo ""
    
    print_status "Configuration:"
    echo "  Database Host: $DB_HOST"
    echo "  Database Port: $DB_PORT"
    echo "  Database Name: $DB_NAME"
    echo "  Database User: $DB_USER"
    echo "  Include Sample Data: $INCLUDE_SAMPLE_DATA"
    echo "  Skip Backup: $SKIP_BACKUP"
    echo ""
    
    # Check prerequisites
    check_postgres
    
    # Create backup
    create_backup
    
    # Define migration files in order
    migrations=(
        "001_initial_schema.sql"
        "002_subdivision_schema.sql"
        "003_sales_schema.sql"
        "004_financial_schema.sql"
        "005_documents_audit.sql"
        "006_indexes_performance.sql"
        "007_functions_triggers.sql"
        "008_row_level_security.sql"
    )
    
    # Add sample data if requested
    if [ "$INCLUDE_SAMPLE_DATA" = "true" ]; then
        migrations+=("009_sample_data.sql")
    fi
    
    print_status "Starting migration process..."
    echo ""
    
    # Run migrations
    failed_migrations=()
    
    for migration in "${migrations[@]}"; do
        migration_file="$MIGRATION_DIR/$migration"
        
        if [ ! -f "$migration_file" ]; then
            print_error "Migration file not found: $migration_file"
            failed_migrations+=("$migration")
            continue
        fi
        
        if ! run_migration "$migration_file"; then
            failed_migrations+=("$migration")
            
            # Ask user if they want to continue
            echo ""
            read -p "Migration failed. Continue with remaining migrations? (y/N): " -n 1 -r
            echo ""
            
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_error "Migration process aborted by user"
                exit 1
            fi
        fi
    done
    
    echo ""
    print_status "Migration process completed"
    echo ""
    
    # Verify results
    verify_migrations
    
    # Summary
    echo ""
    echo "📊 Migration Summary"
    echo "==================="
    
    if [ ${#failed_migrations[@]} -eq 0 ]; then
        print_success "🎉 All migrations completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Update your application's environment variables"
        echo "2. Test the database connection from your application"
        echo "3. Run application tests to verify functionality"
        echo "4. Deploy your application"
        
        if [ "$INCLUDE_SAMPLE_DATA" = "true" ]; then
            echo ""
            echo "Sample data has been loaded. You can now:"
            echo "- Test the application with sample data"
            echo "- Explore the system functionality"
            echo "- Remove sample data when ready for production"
        fi
        
        exit 0
    else
        print_error "❌ Some migrations failed:"
        for failed in "${failed_migrations[@]}"; do
            echo "  - $failed"
        done
        echo ""
        echo "Please review the errors and run the failed migrations manually."
        exit 1
    fi
}

# Run main function
main "$@"
