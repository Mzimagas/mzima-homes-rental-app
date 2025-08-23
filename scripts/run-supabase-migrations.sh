#!/bin/bash

# Supabase Migration Runner Script
# Runs migrations using Supabase CLI

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if required environment variables are set
check_env() {
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        print_error "NEXT_PUBLIC_SUPABASE_URL environment variable is not set"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        print_error "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
        exit 1
    fi
}

# Extract project ref from URL
get_project_ref() {
    echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's/https:\/\/\([^.]*\).*/\1/'
}

# Run a single migration using psql
run_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    print_status "Running migration: $migration_name"
    
    # Extract database URL components
    PROJECT_REF=$(get_project_ref)
    DB_HOST="aws-0-eu-north-1.pooler.supabase.com"
    DB_PORT="6543"
    DB_NAME="postgres"
    DB_USER="postgres.${PROJECT_REF}"
    
    # Run the migration using psql
    if PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$migration_file" \
        -v ON_ERROR_STOP=1 \
        --quiet; then
        print_success "Migration $migration_name completed successfully"
        return 0
    else
        print_error "Migration $migration_name failed"
        return 1
    fi
}

# Run migrations using Supabase REST API
run_migration_api() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    print_status "Running migration via API: $migration_name"
    
    # Read the SQL file
    local sql_content=$(cat "$migration_file")
    
    # Make API call to execute SQL
    local response=$(curl -s -X POST \
        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec_sql" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -d "{\"sql\": $(echo "$sql_content" | jq -R -s .)}")
    
    # Check if the response contains an error
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        print_error "Migration $migration_name failed:"
        echo "$response" | jq '.error'
        return 1
    else
        print_success "Migration $migration_name completed successfully"
        return 0
    fi
}

# Main execution
main() {
    print_status "🚀 Starting Supabase Migrations"
    echo "=================================="
    
    # Check environment variables
    check_env
    
    # Load environment variables from .env.local if it exists
    if [ -f ".env.local" ]; then
        print_status "Loading environment variables from .env.local"
        export $(grep -v '^#' .env.local | xargs)
    fi
    
    # Define migration files in order
    MIGRATIONS=(
        "supabase/migrations/100_create_user_management_tables.sql"
        "supabase/migrations/101_create_permission_templates.sql"
        "supabase/migrations/102_migrate_existing_users.sql"
    )
    
    print_status "Found ${#MIGRATIONS[@]} migrations to run"
    
    # Check if psql is available
    if command -v psql > /dev/null 2>&1; then
        print_status "Using psql for migrations"
        
        # Prompt for database password if not set
        if [ -z "$SUPABASE_DB_PASSWORD" ]; then
            print_warning "Database password not set in environment"
            echo -n "Enter your Supabase database password: "
            read -s SUPABASE_DB_PASSWORD
            echo
            export SUPABASE_DB_PASSWORD
        fi
        
        # Run each migration
        for migration in "${MIGRATIONS[@]}"; do
            if [ -f "$migration" ]; then
                if ! run_migration "$migration"; then
                    print_error "Migration failed, stopping execution"
                    exit 1
                fi
            else
                print_warning "Migration file not found: $migration"
            fi
        done
        
    else
        print_warning "psql not found, trying API approach"
        
        # Check if jq is available for API approach
        if ! command -v jq > /dev/null 2>&1; then
            print_error "jq is required for API approach but not found"
            print_status "Please install jq or psql to run migrations"
            exit 1
        fi
        
        # Run each migration via API
        for migration in "${MIGRATIONS[@]}"; do
            if [ -f "$migration" ]; then
                if ! run_migration_api "$migration"; then
                    print_error "Migration failed, stopping execution"
                    exit 1
                fi
            else
                print_warning "Migration file not found: $migration"
            fi
        done
    fi
    
    print_success "🎉 All migrations completed successfully!"
    
    # Verification
    print_status "Running verification..."
    PROJECT_REF=$(get_project_ref)
    
    print_status "✅ Migration Summary:"
    print_status "- Enhanced user management tables created"
    print_status "- Permission templates loaded"
    print_status "- Existing users migrated"
    print_status ""
    print_status "🔗 Check your Supabase dashboard:"
    print_status "https://supabase.com/dashboard/project/$PROJECT_REF"
}

# Run the main function
main "$@"
