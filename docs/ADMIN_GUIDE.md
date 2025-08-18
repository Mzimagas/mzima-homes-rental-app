# Mzima Homes Land Management System - Administrator Guide

## Table of Contents
1. [System Administration](#system-administration)
2. [Database Management](#database-management)
3. [User Management](#user-management)
4. [Security Configuration](#security-configuration)
5. [Performance Monitoring](#performance-monitoring)
6. [Backup & Recovery](#backup--recovery)
7. [Integration Management](#integration-management)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance Procedures](#maintenance-procedures)

## System Administration

### Environment Setup

#### Production Environment
```bash
# Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-256-bit-encryption-key
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_BUSINESS_SHORT_CODE=your-business-short-code
MPESA_PASSKEY=your-mpesa-passkey
MPESA_ENVIRONMENT=production
```

#### Development Environment
```bash
# Development-specific variables
NODE_ENV=development
MPESA_ENVIRONMENT=sandbox
DEBUG=true
```

### System Configuration

#### Application Settings
1. **Company Information**
   - Update company details in system settings
   - Configure logo and branding
   - Set default currency and locale

2. **Business Rules**
   - Configure validation rules
   - Set approval workflows
   - Define commission structures

3. **Email Configuration**
   - SMTP server settings
   - Email templates
   - Notification preferences

#### Feature Flags
```typescript
// Feature configuration
const FEATURES = {
  MPESA_INTEGRATION: true,
  DOCUMENT_VERSIONING: true,
  ADVANCED_REPORTING: true,
  GEOSPATIAL_MAPPING: false, // Coming soon
  MOBILE_APP_SYNC: false     // Future release
}
```

## Database Management

### Database Schema Overview

#### Core Tables
- **parcels**: Land parcel information
- **subdivisions**: Development projects
- **plots**: Individual plot records
- **clients**: Customer information
- **sale_agreements**: Sales contracts
- **receipts**: Payment records

#### Relationship Integrity
```sql
-- Key relationships to monitor
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'FOREIGN KEY';
```

### Database Maintenance

#### Regular Maintenance Tasks
```sql
-- Weekly maintenance
VACUUM ANALYZE;

-- Monthly maintenance
REINDEX DATABASE your_database_name;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Performance Monitoring
```sql
-- Monitor slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Data Migration

#### Migration Scripts
```sql
-- Example: Add new column with default value
ALTER TABLE parcels 
ADD COLUMN IF NOT EXISTS market_value DECIMAL(15,2) DEFAULT 0;

-- Update existing records
UPDATE parcels 
SET market_value = acquisition_cost_total * 1.2 
WHERE market_value = 0 AND acquisition_cost_total > 0;
```

#### Data Validation
```sql
-- Check data integrity
SELECT 'Orphaned plots' as issue, COUNT(*) as count
FROM plots p
LEFT JOIN subdivisions s ON p.subdivision_id = s.subdivision_id
WHERE s.subdivision_id IS NULL

UNION ALL

SELECT 'Duplicate LR numbers' as issue, COUNT(*) - COUNT(DISTINCT lr_number) as count
FROM parcels
WHERE lr_number IS NOT NULL;
```

## User Management

### User Roles and Permissions

#### Role Hierarchy
```
Super Admin
├── Admin
│   ├── Manager
│   ├── Finance
│   └── Operations
├── Sales Agent
└── Viewer
```

#### Permission Matrix
| Module | Super Admin | Admin | Manager | Sales Agent | Finance | Operations | Viewer |
|--------|-------------|-------|---------|-------------|---------|------------|--------|
| Parcels | Full | Full | Read/Edit | Read | Read | Full | Read |
| Subdivisions | Full | Full | Full | Read | Read | Full | Read |
| Sales | Full | Full | Full | Full | Read | Read | Read |
| Financial | Full | Full | Read/Edit | Read | Full | Read | Read |
| Users | Full | Read/Edit | Read | None | None | None | None |
| Reports | Full | Full | Full | Limited | Full | Limited | Limited |

### User Account Management

#### Creating Users
```typescript
// Admin interface for user creation
const createUser = async (userData: {
  email: string
  full_name: string
  role: UserRole
  department?: string
  phone?: string
}) => {
  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: generateTemporaryPassword(),
    email_confirm: true
  })

  // 2. Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authUser.user.id,
      ...userData,
      is_active: true
    })

  // 3. Send welcome email
  await sendWelcomeEmail(userData.email, temporaryPassword)
}
```

#### User Deactivation
```typescript
const deactivateUser = async (userId: string) => {
  // 1. Deactivate in auth
  await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none' // Permanent ban
  })

  // 2. Update profile
  await supabase
    .from('user_profiles')
    .update({ is_active: false })
    .eq('id', userId)

  // 3. Log action
  await AuditService.logActivity(
    currentUserId,
    'deactivate_user',
    'user',
    userId
  )
}
```

### Bulk User Operations

#### CSV Import
```typescript
const importUsers = async (csvData: string) => {
  const users = parseCSV(csvData)
  const results = []

  for (const user of users) {
    try {
      await createUser(user)
      results.push({ email: user.email, status: 'success' })
    } catch (error) {
      results.push({ email: user.email, status: 'error', error: error.message })
    }
  }

  return results
}
```

## Security Configuration

### Authentication Settings

#### Password Policy
```typescript
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // days
  preventReuse: 5 // last 5 passwords
}
```

#### Session Management
```typescript
const SESSION_CONFIG = {
  timeout: 8 * 60 * 60, // 8 hours
  extendOnActivity: true,
  maxConcurrentSessions: 3,
  requireReauth: ['user_management', 'financial_transactions']
}
```

### Data Encryption

#### Encryption Key Management
```bash
# Generate new encryption key
openssl rand -hex 32

# Rotate encryption key (requires system downtime)
# 1. Generate new key
# 2. Re-encrypt sensitive data
# 3. Update environment variables
# 4. Restart application
```

#### Sensitive Data Fields
```typescript
const ENCRYPTED_FIELDS = [
  'clients.id_number',
  'clients.kra_pin',
  'owners.id_number',
  'bank_accounts.account_number'
]
```

### Access Control

#### IP Whitelisting
```typescript
const ALLOWED_IPS = [
  '192.168.1.0/24',    // Office network
  '10.0.0.0/8',        // VPN network
  '203.0.113.0/24'     // External office
]
```

#### Rate Limiting
```typescript
const RATE_LIMITS = {
  login: { attempts: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  api: { requests: 100, window: 60 * 1000 },      // 100 requests per minute
  upload: { files: 10, window: 60 * 1000 }        // 10 files per minute
}
```

## Performance Monitoring

### System Metrics

#### Key Performance Indicators
```typescript
const KPIs = {
  responseTime: '< 2 seconds',
  uptime: '> 99.5%',
  errorRate: '< 0.1%',
  concurrentUsers: '< 100',
  databaseConnections: '< 80% of pool'
}
```

#### Monitoring Dashboard
```typescript
// Performance monitoring endpoints
const monitoringEndpoints = {
  health: '/api/health',
  metrics: '/api/metrics',
  database: '/api/db-stats',
  cache: '/api/cache-stats'
}
```

### Database Performance

#### Query Optimization
```sql
-- Identify slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  (total_time / calls) as avg_time_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_time DESC
LIMIT 20;

-- Check missing indexes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan as avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;
```

#### Index Recommendations
```sql
-- Create recommended indexes
CREATE INDEX CONCURRENTLY idx_parcels_county_tenure 
ON parcels(county, tenure) 
WHERE county IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_plots_subdivision_stage 
ON plots(subdivision_id, stage);

CREATE INDEX CONCURRENTLY idx_receipts_date_amount 
ON receipts(paid_date, amount) 
WHERE paid_date IS NOT NULL;
```

### Application Performance

#### Caching Strategy
```typescript
const CACHE_CONFIG = {
  parcels: { ttl: 5 * 60 * 1000 },      // 5 minutes
  plots: { ttl: 2 * 60 * 1000 },        // 2 minutes
  reports: { ttl: 10 * 60 * 1000 },     // 10 minutes
  static: { ttl: 24 * 60 * 60 * 1000 }  // 24 hours
}
```

#### Memory Management
```typescript
// Monitor memory usage
const getMemoryStats = () => {
  const used = process.memoryUsage()
  return {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(used.external / 1024 / 1024 * 100) / 100
  }
}
```

## Backup & Recovery

### Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# Daily backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="land_management"

# Create backup
pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/database/
```

#### File Backups
```bash
#!/bin/bash
# Document backup script

BACKUP_DIR="/backups/documents"
SOURCE_DIR="/app/storage/documents"
DATE=$(date +%Y%m%d)

# Sync documents to backup location
rsync -av --delete $SOURCE_DIR/ $BACKUP_DIR/

# Create archive
tar -czf $BACKUP_DIR/documents_$DATE.tar.gz -C $BACKUP_DIR .

# Upload to cloud storage
aws s3 cp $BACKUP_DIR/documents_$DATE.tar.gz s3://your-backup-bucket/documents/
```

### Recovery Procedures

#### Database Recovery
```bash
# Point-in-time recovery
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname=$DB_NAME backup_file.sql

# Verify data integrity after restore
psql $DB_NAME -c "SELECT COUNT(*) FROM parcels;"
psql $DB_NAME -c "SELECT COUNT(*) FROM clients;"
```

#### Disaster Recovery Plan
1. **Assessment** (0-15 minutes)
   - Identify scope of failure
   - Determine recovery strategy
   - Notify stakeholders

2. **Recovery** (15-60 minutes)
   - Restore from latest backup
   - Verify system functionality
   - Test critical workflows

3. **Validation** (60-120 minutes)
   - Data integrity checks
   - User acceptance testing
   - Performance verification

4. **Communication** (Ongoing)
   - Update stakeholders
   - Document lessons learned
   - Update procedures

## Integration Management

### M-PESA Integration

#### Configuration
```typescript
const MPESA_CONFIG = {
  environment: process.env.MPESA_ENVIRONMENT,
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: `${process.env.APP_URL}/api/mpesa/callback`,
  timeoutUrl: `${process.env.APP_URL}/api/mpesa/timeout`
}
```

#### Monitoring
```typescript
// Monitor M-PESA transactions
const monitorMpesaTransactions = async () => {
  const { data: failedTransactions } = await supabase
    .from('mpesa_transactions')
    .select('*')
    .eq('result_code', 1)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (failedTransactions.length > 10) {
    await sendAlert('High M-PESA failure rate detected')
  }
}
```

### Email Integration

#### SMTP Configuration
```typescript
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}
```

### Third-Party APIs

#### API Rate Limiting
```typescript
const API_LIMITS = {
  mpesa: { requests: 100, window: 60 * 1000 },
  email: { requests: 50, window: 60 * 1000 },
  sms: { requests: 20, window: 60 * 1000 }
}
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
pg_isready -h localhost -p 5432

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Kill long-running queries
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
  AND query_start < now() - interval '5 minutes';
```

#### Performance Issues
```typescript
// Check system resources
const checkSystemHealth = async () => {
  const health = {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    loadAverage: os.loadavg(),
    freeMemory: os.freemem(),
    totalMemory: os.totalmem()
  }
  
  return health
}
```

#### M-PESA Issues
```typescript
// Debug M-PESA transactions
const debugMpesaTransaction = async (checkoutRequestId: string) => {
  const transaction = await mpesaService.queryTransactionStatus(checkoutRequestId)
  console.log('Transaction Status:', transaction)
  
  // Check callback logs
  const { data: callbacks } = await supabase
    .from('mpesa_transactions')
    .select('*')
    .eq('checkout_request_id', checkoutRequestId)
    .order('created_at', { ascending: false })
  
  console.log('Callback History:', callbacks)
}
```

### Log Analysis

#### Application Logs
```bash
# View recent errors
tail -f /var/log/app/error.log | grep ERROR

# Search for specific patterns
grep -r "Database connection failed" /var/log/app/

# Analyze log patterns
awk '/ERROR/ {print $1, $2, $NF}' /var/log/app/error.log | sort | uniq -c
```

#### Database Logs
```sql
-- Check recent database errors
SELECT 
  log_time,
  user_name,
  database_name,
  message
FROM pg_log
WHERE log_time > now() - interval '1 hour'
  AND log_level = 'ERROR'
ORDER BY log_time DESC;
```

## Maintenance Procedures

### Daily Tasks
- [ ] Check system health dashboard
- [ ] Review error logs
- [ ] Monitor M-PESA transaction status
- [ ] Verify backup completion
- [ ] Check disk space usage

### Weekly Tasks
- [ ] Database maintenance (VACUUM ANALYZE)
- [ ] Review performance metrics
- [ ] Update security patches
- [ ] Clean up temporary files
- [ ] Review user activity logs

### Monthly Tasks
- [ ] Full database backup verification
- [ ] Security audit
- [ ] Performance optimization review
- [ ] User access review
- [ ] Documentation updates

### Quarterly Tasks
- [ ] Disaster recovery testing
- [ ] Security penetration testing
- [ ] Capacity planning review
- [ ] Third-party integration review
- [ ] Business continuity plan update

---

*This administrator guide should be kept confidential and only shared with authorized system administrators.*
