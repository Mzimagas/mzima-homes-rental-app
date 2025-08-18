# Mzima Homes Land Management System - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Security Configuration](#security-configuration)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring Setup](#monitoring-setup)
8. [Backup Configuration](#backup-configuration)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores, 2.4 GHz
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps internet connection
- **OS**: Ubuntu 20.04 LTS or CentOS 8

#### Recommended Requirements
- **CPU**: 4 cores, 3.0 GHz
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps internet connection
- **OS**: Ubuntu 22.04 LTS

#### Software Dependencies
```bash
# Node.js (v18 or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL (v14 or higher)
sudo apt-get install -y postgresql postgresql-contrib

# Redis (for caching)
sudo apt-get install -y redis-server

# Nginx (reverse proxy)
sudo apt-get install -y nginx

# PM2 (process manager)
sudo npm install -g pm2

# SSL certificates
sudo apt-get install -y certbot python3-certbot-nginx
```

### External Services

#### Supabase Setup
1. Create Supabase project at https://supabase.com
2. Note down project URL and service role key
3. Configure database schema (see Database Setup section)

#### M-PESA Integration
1. Register with Safaricom Developer Portal
2. Create M-PESA application
3. Obtain consumer key, consumer secret, and passkey
4. Configure business short code

#### Email Service (Optional)
1. Configure SMTP service (Gmail, SendGrid, etc.)
2. Obtain SMTP credentials

## Environment Setup

### Environment Variables

Create `.env.production` file:
```bash
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://yourdomain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
ENCRYPTION_KEY=your-256-bit-encryption-key-in-hex
JWT_SECRET=your-jwt-secret

# M-PESA
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_BUSINESS_SHORT_CODE=your-business-short-code
MPESA_PASSKEY=your-mpesa-passkey
MPESA_ENVIRONMENT=production

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Generate Encryption Key
```bash
# Generate 256-bit encryption key
openssl rand -hex 32
```

### SSL Certificate Setup
```bash
# Install SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Database Setup

### Supabase Configuration

#### 1. Create Database Schema
```sql
-- Run the complete migration script
-- (Use the migration files from the project)
\i migrations/001_initial_schema.sql
\i migrations/002_subdivision_schema.sql
\i migrations/003_sales_schema.sql
\i migrations/004_financial_schema.sql
\i migrations/005_documents_audit.sql
```

#### 2. Enable Row Level Security
```sql
-- Enable RLS on all tables
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_agreements ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Create RLS policies
CREATE POLICY "Users can view their organization's data" ON parcels
  FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::text);
```

#### 3. Create Database Functions
```sql
-- Performance optimization functions
CREATE OR REPLACE FUNCTION get_sales_dashboard_data(
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Implementation here
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Data integrity functions
CREATE OR REPLACE FUNCTION find_orphaned_plots()
RETURNS TABLE(plot_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT p.plot_id
  FROM plots p
  LEFT JOIN subdivisions s ON p.subdivision_id = s.subdivision_id
  WHERE s.subdivision_id IS NULL;
END;
$$ LANGUAGE plpgsql;
```

#### 4. Create Indexes
```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_parcels_county_tenure ON parcels(county, tenure);
CREATE INDEX CONCURRENTLY idx_plots_subdivision_stage ON plots(subdivision_id, stage);
CREATE INDEX CONCURRENTLY idx_receipts_date_amount ON receipts(paid_date, amount);
CREATE INDEX CONCURRENTLY idx_clients_phone ON clients(phone);
CREATE INDEX CONCURRENTLY idx_sale_agreements_status ON sale_agreements(status);

-- Search indexes
CREATE INDEX CONCURRENTLY idx_parcels_lr_number_gin ON parcels USING gin(lr_number gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_clients_name_gin ON clients USING gin(full_name gin_trgm_ops);
```

## Application Deployment

### 1. Clone Repository
```bash
# Clone the application
git clone https://github.com/your-org/land-management-system.git
cd land-management-system

# Switch to production branch
git checkout production
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm ci --production

# Build the application
npm run build
```

### 3. Configure PM2
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'land-management-system',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/land-management-error.log',
    out_file: '/var/log/pm2/land-management-out.log',
    log_file: '/var/log/pm2/land-management-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
```

### 4. Start Application
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 5. Configure Nginx
Create `/etc/nginx/sites-available/land-management`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }

    # File upload size
    client_max_body_size 10M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/land-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Security Configuration

### 1. Firewall Setup
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Fail2Ban Configuration
```bash
# Install Fail2Ban
sudo apt-get install fail2ban

# Configure Fail2Ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit jail.local
sudo nano /etc/fail2ban/jail.local
```

Add custom jail for the application:
```ini
[land-management]
enabled = true
port = http,https
filter = land-management
logpath = /var/log/pm2/land-management-combined.log
maxretry = 5
bantime = 3600
```

### 3. Database Security
```sql
-- Create application user with limited privileges
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE land_management TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### 4. File Permissions
```bash
# Set proper file permissions
sudo chown -R www-data:www-data /var/www/land-management
sudo chmod -R 755 /var/www/land-management
sudo chmod -R 644 /var/www/land-management/.env*
```

## Performance Optimization

### 1. Node.js Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

### 2. Database Optimization
```sql
-- Optimize PostgreSQL settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

### 3. Redis Caching
```bash
# Configure Redis
sudo nano /etc/redis/redis.conf

# Set memory limit
maxmemory 256mb
maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis
```

### 4. CDN Configuration (Optional)
```javascript
// Configure CDN for static assets
const CDN_URL = process.env.CDN_URL || '';

module.exports = {
  assetPrefix: CDN_URL,
  images: {
    domains: ['your-cdn-domain.com'],
  },
}
```

## Monitoring Setup

### 1. Application Monitoring
```bash
# Install monitoring tools
npm install -g @pm2/pm2-server-monit

# Setup PM2 monitoring
pm2 install pm2-server-monit
```

### 2. Log Management
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/land-management

# Add configuration
/var/log/pm2/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Health Checks
Create health check endpoint:
```javascript
// pages/api/health.js
export default function handler(req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  }
  
  res.status(200).json(health)
}
```

### 4. Monitoring Script
```bash
#!/bin/bash
# monitoring.sh

# Check application health
curl -f http://localhost:3000/api/health || echo "Application health check failed"

# Check database connectivity
pg_isready -h localhost -p 5432 || echo "Database connectivity check failed"

# Check disk space
df -h | awk '$5 > 80 {print "Disk space warning: " $0}'

# Check memory usage
free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'
```

## Backup Configuration

### 1. Database Backup
```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="land_management"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: backup_$DATE.sql.gz"
```

### 2. File Backup
```bash
#!/bin/bash
# backup-files.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/files"
SOURCE_DIR="/var/www/land-management"

mkdir -p $BACKUP_DIR

# Create archive
tar -czf $BACKUP_DIR/files_$DATE.tar.gz -C $SOURCE_DIR .

# Remove old backups
find $BACKUP_DIR -name "files_*.tar.gz" -mtime +7 -delete

echo "File backup completed: files_$DATE.tar.gz"
```

### 3. Automated Backups
```bash
# Add to crontab
crontab -e

# Daily database backup at 2 AM
0 2 * * * /path/to/backup-db.sh

# Weekly file backup on Sundays at 3 AM
0 3 * * 0 /path/to/backup-files.sh
```

## Post-Deployment Verification

### 1. Functional Testing
```bash
# Test application endpoints
curl -f https://yourdomain.com/api/health
curl -f https://yourdomain.com/

# Test authentication
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

### 2. Performance Testing
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Run load test
ab -n 1000 -c 10 https://yourdomain.com/
```

### 3. Security Testing
```bash
# SSL test
curl -I https://yourdomain.com/

# Security headers test
curl -I https://yourdomain.com/ | grep -E "(X-Frame-Options|X-XSS-Protection|X-Content-Type-Options)"
```

### 4. Database Verification
```sql
-- Check data integrity
SELECT COUNT(*) FROM parcels;
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM sale_agreements;

-- Verify indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';
```

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs

# Check Node.js version
node --version

# Check environment variables
pm2 env 0
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d land_management

# Check connection limits
SELECT count(*) FROM pg_stat_activity;
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run

# Check Nginx configuration
sudo nginx -t
```

#### Performance Issues
```bash
# Check system resources
htop
df -h
free -m

# Check application metrics
pm2 monit

# Check database performance
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### Emergency Procedures

#### Application Recovery
```bash
# Restart application
pm2 restart all

# Reload from backup
pm2 stop all
git checkout production
npm ci
pm2 start ecosystem.config.js
```

#### Database Recovery
```bash
# Restore from backup
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname=land_management /backups/database/latest_backup.sql
```

---

*This deployment guide should be followed carefully and tested in a staging environment before production deployment.*
