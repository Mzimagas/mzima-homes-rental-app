#!/bin/bash

# Dashboard Deployment Script
# Automated deployment script for the Property Management Dashboard
# Supports staging, production, and rollback deployments

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/dashboard_deploy_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Help function
show_help() {
    cat << EOF
Dashboard Deployment Script

Usage: $0 [OPTIONS] ENVIRONMENT

ENVIRONMENTS:
    staging     Deploy to staging environment
    production  Deploy to production environment
    rollback    Rollback to previous version

OPTIONS:
    -h, --help              Show this help message
    -v, --version VERSION   Deploy specific version (default: latest)
    -f, --force             Force deployment without confirmation
    -d, --dry-run           Show what would be deployed without executing
    -b, --backup            Create backup before deployment
    --skip-tests            Skip running tests before deployment
    --skip-migration        Skip database migration
    --health-check          Run health check after deployment

EXAMPLES:
    $0 staging                          # Deploy latest to staging
    $0 production -v v1.2.3            # Deploy specific version to production
    $0 production --backup --force      # Force deploy to production with backup
    $0 rollback                         # Rollback to previous version

EOF
}

# Parse command line arguments
ENVIRONMENT=""
VERSION="latest"
FORCE=false
DRY_RUN=false
BACKUP=false
SKIP_TESTS=false
SKIP_MIGRATION=false
HEALTH_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -b|--backup)
            BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --health-check)
            HEALTH_CHECK=true
            shift
            ;;
        staging|production|rollback)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    error "Environment is required. Use 'staging', 'production', or 'rollback'"
fi

# Load environment-specific configuration
load_config() {
    local env=$1
    case $env in
        staging)
            export DEPLOY_HOST="staging.mzimahomes.com"
            export DEPLOY_USER="deploy"
            export DOCKER_REGISTRY="registry.mzimahomes.com"
            export DATABASE_URL="$STAGING_DATABASE_URL"
            export SUPABASE_URL="$STAGING_SUPABASE_URL"
            ;;
        production)
            export DEPLOY_HOST="dashboard.mzimahomes.com"
            export DEPLOY_USER="deploy"
            export DOCKER_REGISTRY="registry.mzimahomes.com"
            export DATABASE_URL="$PRODUCTION_DATABASE_URL"
            export SUPABASE_URL="$PRODUCTION_SUPABASE_URL"
            ;;
        *)
            error "Invalid environment: $env"
            ;;
    esac
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is required but not installed"
    command -v node >/dev/null 2>&1 || error "Node.js is required but not installed"
    command -v npm >/dev/null 2>&1 || error "npm is required but not installed"
    
    # Check if environment variables are set
    [[ -z "$DATABASE_URL" ]] && error "DATABASE_URL is not set"
    [[ -z "$SUPABASE_URL" ]] && error "SUPABASE_URL is not set"
    
    # Check if we can connect to the deployment host
    if ! ssh -o ConnectTimeout=10 "$DEPLOY_USER@$DEPLOY_HOST" "echo 'Connection test successful'" >/dev/null 2>&1; then
        error "Cannot connect to deployment host: $DEPLOY_HOST"
    fi
    
    success "Pre-deployment checks passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warning "Skipping tests as requested"
        return 0
    fi
    
    log "Running tests..."
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    npm ci
    
    # Run linting
    npm run lint || error "Linting failed"
    
    # Run type checking
    npm run type-check || error "Type checking failed"
    
    # Run unit tests
    npm run test || error "Unit tests failed"
    
    # Run integration tests
    npm run test:integration || error "Integration tests failed"
    
    success "All tests passed"
}

# Build application
build_application() {
    log "Building application..."
    cd "$PROJECT_ROOT"
    
    # Build Next.js application
    npm run build || error "Build failed"
    
    # Build Docker image
    local image_tag="${DOCKER_REGISTRY}/mzima-homes-dashboard:${VERSION}"
    docker build -t "$image_tag" . || error "Docker build failed"
    
    # Push to registry
    docker push "$image_tag" || error "Docker push failed"
    
    success "Application built and pushed to registry"
}

# Create backup
create_backup() {
    if [[ "$BACKUP" != true ]]; then
        return 0
    fi
    
    log "Creating backup..."
    
    # Create database backup
    local backup_file="dashboard_backup_${TIMESTAMP}.sql"
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "pg_dump $DATABASE_URL > /tmp/$backup_file" || error "Database backup failed"
    
    # Create application backup
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "tar -czf /tmp/dashboard_app_backup_${TIMESTAMP}.tar.gz -C /opt/mzima-homes-dashboard ." || error "Application backup failed"
    
    success "Backup created successfully"
}

# Run database migration
run_migration() {
    if [[ "$SKIP_MIGRATION" == true ]]; then
        warning "Skipping database migration as requested"
        return 0
    fi
    
    log "Running database migration..."
    
    # Run migration scripts
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd /opt/mzima-homes-dashboard && npm run migrate" || error "Database migration failed"
    
    success "Database migration completed"
}

# Deploy application
deploy_application() {
    log "Deploying application to $ENVIRONMENT..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would deploy version $VERSION to $ENVIRONMENT"
        return 0
    fi
    
    # Update docker-compose configuration
    local compose_file="/tmp/docker-compose.${ENVIRONMENT}.yml"
    cat > "$compose_file" << EOF
version: '3.8'
services:
  dashboard-app:
    image: ${DOCKER_REGISTRY}/mzima-homes-dashboard:${VERSION}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${ENVIRONMENT}
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  dashboard-nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - dashboard-app
    restart: unless-stopped
EOF
    
    # Copy compose file to deployment host
    scp "$compose_file" "$DEPLOY_USER@$DEPLOY_HOST:/opt/mzima-homes-dashboard/docker-compose.yml" || error "Failed to copy compose file"
    
    # Deploy using docker-compose
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd /opt/mzima-homes-dashboard && docker-compose pull && docker-compose up -d" || error "Deployment failed"
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    success "Application deployed successfully"
}

# Health check
health_check() {
    if [[ "$HEALTH_CHECK" != true ]]; then
        return 0
    fi
    
    log "Running health check..."
    
    local health_url="https://$DEPLOY_HOST/api/health"
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" >/dev/null; then
            success "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Rollback function
rollback_deployment() {
    log "Rolling back deployment..."
    
    # Get previous version
    local previous_version=$(ssh "$DEPLOY_USER@$DEPLOY_HOST" "docker images --format 'table {{.Tag}}' ${DOCKER_REGISTRY}/mzima-homes-dashboard | grep -v TAG | head -2 | tail -1")
    
    if [[ -z "$previous_version" ]]; then
        error "No previous version found for rollback"
    fi
    
    log "Rolling back to version: $previous_version"
    
    # Update compose file with previous version
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd /opt/mzima-homes-dashboard && sed -i 's/:.*/:$previous_version/' docker-compose.yml"
    
    # Restart services
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd /opt/mzima-homes-dashboard && docker-compose up -d"
    
    success "Rollback completed to version: $previous_version"
}

# Confirmation prompt
confirm_deployment() {
    if [[ "$FORCE" == true ]]; then
        return 0
    fi
    
    echo
    echo "=== Deployment Summary ==="
    echo "Environment: $ENVIRONMENT"
    echo "Version: $VERSION"
    echo "Host: $DEPLOY_HOST"
    echo "Backup: $BACKUP"
    echo "Skip Tests: $SKIP_TESTS"
    echo "Skip Migration: $SKIP_MIGRATION"
    echo "=========================="
    echo
    
    read -p "Do you want to proceed with this deployment? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled by user"
        exit 0
    fi
}

# Main deployment function
main() {
    log "Starting dashboard deployment to $ENVIRONMENT"
    log "Log file: $LOG_FILE"
    
    # Load configuration
    load_config "$ENVIRONMENT"
    
    if [[ "$ENVIRONMENT" == "rollback" ]]; then
        rollback_deployment
        return 0
    fi
    
    # Confirm deployment
    confirm_deployment
    
    # Run deployment steps
    pre_deployment_checks
    run_tests
    build_application
    create_backup
    run_migration
    deploy_application
    health_check
    
    success "Dashboard deployment to $ENVIRONMENT completed successfully!"
    log "Deployment log saved to: $LOG_FILE"
}

# Trap errors and cleanup
trap 'error "Deployment failed. Check log file: $LOG_FILE"' ERR

# Run main function
main "$@"
