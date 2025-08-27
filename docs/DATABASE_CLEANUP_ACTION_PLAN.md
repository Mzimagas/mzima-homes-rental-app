# 🗄️ **Database Cleanup Action Plan**

## **Executive Summary**

This action plan provides a **safe, step-by-step approach** to cleaning up the Mzima Homes Supabase database, removing unused tables, and optimizing the schema for better performance and maintainability.

---

## 🎯 **Cleanup Objectives**

### **Primary Goals:**
- **Remove 25-30 unused tables** from the database schema
- **Consolidate migration files** into a clean, manageable structure
- **Improve database performance** by 30-40%
- **Reduce storage costs** by 50-70%
- **Simplify schema maintenance** for future development

### **Success Metrics:**
- ✅ Zero application functionality impact
- ✅ Faster backup/restore operations
- ✅ Reduced database size
- ✅ Cleaner schema documentation
- ✅ Improved query performance

---

## 📋 **Phase 1: Analysis & Preparation (Week 1)**

### **Day 1-2: Database Analysis**

#### **Step 1: Run Analysis Script**
```bash
# Connect to Supabase database
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Run the analysis script
\i scripts/database-cleanup-analysis.sql

# Export results for review
\copy (SELECT * FROM pg_stat_user_tables WHERE schemaname = 'public') TO 'table_usage_analysis.csv' CSV HEADER;
```

#### **Step 2: Document Current State**
```bash
# Generate current schema documentation
pg_dump --schema-only --no-owner --no-privileges \
  "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  > current_schema_backup.sql

# List all tables and their sizes
psql -c "SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename)) 
         FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size('public.'||tablename) DESC;"
```

### **Day 3-4: Code Analysis**

#### **Step 3: Scan Codebase for Table References**
```bash
# Search for all table references in the codebase
grep -r "\.from(" src/ --include="*.ts" --include="*.tsx" | grep -E "(parcels|subdivisions|plots|clients|enhanced_users|documents)" > table_references.txt

# Search for any SQL queries referencing suspected unused tables
grep -r "SELECT\|INSERT\|UPDATE\|DELETE" src/ --include="*.ts" --include="*.tsx" | grep -E "(parcels|subdivisions|plots|clients|enhanced_users|documents)" >> table_references.txt

# Check migration files for table creation
grep -r "CREATE TABLE" supabase/migrations/ | grep -E "(parcels|subdivisions|plots|clients|enhanced_users|documents)" > table_creation_history.txt
```

#### **Step 4: Identify Safe-to-Remove Tables**
Based on analysis, create categorized lists:

**🟢 SAFE TO REMOVE (No code references, no data):**
```sql
-- Land Management System (Unused)
parcels
subdivisions  
plots
value_add_projects
approvals
wayleaves_easements
pricing_zones

-- Sales System (Unused)
clients
listings
offers
sale_agreements
receipts

-- Enhanced User System (Duplicate)
enhanced_users
user_profiles
user_next_of_kin
user_permissions
permission_audit_log

-- Document Management (Unused)
documents
document_versions
document_access_logs
```

**🟡 REVIEW NEEDED (Minimal usage):**
```sql
-- May have some references but appear unused
financial_accounts
transactions
budgets
financial_reports
user_activities
security_events
data_access_logs
tasks_reminders
```

**🔴 KEEP (Active usage):**
```sql
-- Core rental management
properties
units
tenants
tenancy_agreements
rent_invoices
payments
property_users
landlords
notifications
maintenance_requests
utility_ledger
```

### **Day 5-7: Backup & Safety Preparation**

#### **Step 5: Create Comprehensive Backups**
```bash
# Full database backup
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" > full_backup_before_cleanup.sql

# Individual table backups for tables being removed
pg_dump --table=parcels "postgresql://..." > backup_parcels.sql
pg_dump --table=subdivisions "postgresql://..." > backup_subdivisions.sql
pg_dump --table=plots "postgresql://..." > backup_plots.sql
# ... continue for all tables being removed
```

#### **Step 6: Setup Staging Environment**
```bash
# Create staging Supabase project or local instance
# Restore full backup to staging
psql "postgresql://staging-connection-string" < full_backup_before_cleanup.sql

# Verify staging environment matches production
```

---

## 🧪 **Phase 2: Staging Environment Testing (Week 2)**

### **Day 1-3: Apply Cleanup to Staging**

#### **Step 7: Create Cleanup Script**
```sql
-- staging_cleanup.sql
-- IMPORTANT: Only run on staging first!

-- Create backup schema for safety
CREATE SCHEMA IF NOT EXISTS cleanup_backup;

-- Backup tables before removal
CREATE TABLE cleanup_backup.parcels AS SELECT * FROM parcels;
CREATE TABLE cleanup_backup.subdivisions AS SELECT * FROM subdivisions;
CREATE TABLE cleanup_backup.plots AS SELECT * FROM plots;
CREATE TABLE cleanup_backup.clients AS SELECT * FROM clients;
CREATE TABLE cleanup_backup.enhanced_users AS SELECT * FROM enhanced_users;
CREATE TABLE cleanup_backup.documents AS SELECT * FROM documents;
-- ... continue for all tables

-- Drop unused tables (CASCADE to remove dependent objects)
DROP TABLE IF EXISTS parcels CASCADE;
DROP TABLE IF EXISTS subdivisions CASCADE;
DROP TABLE IF EXISTS plots CASCADE;
DROP TABLE IF EXISTS value_add_projects CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS wayleaves_easements CASCADE;
DROP TABLE IF EXISTS pricing_zones CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS sale_agreements CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS enhanced_users CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_next_of_kin CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permission_audit_log CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS document_access_logs CASCADE;

-- Drop unused functions and procedures
DROP FUNCTION IF EXISTS get_parcel_details(UUID);
DROP FUNCTION IF EXISTS create_subdivision(UUID, TEXT, DECIMAL);
-- ... continue for unused functions

-- Clean up unused indexes
-- (These will be automatically dropped with tables, but check for orphaned ones)

-- Vacuum and analyze to reclaim space
VACUUM FULL;
ANALYZE;
```

#### **Step 8: Execute Staging Cleanup**
```bash
# Apply cleanup to staging
psql "postgresql://staging-connection-string" < staging_cleanup.sql

# Verify cleanup results
psql "postgresql://staging-connection-string" -c "
SELECT 
  COUNT(*) as remaining_tables,
  pg_size_pretty(pg_database_size(current_database())) as database_size
FROM information_schema.tables 
WHERE table_schema = 'public';"
```

### **Day 4-5: Application Testing**

#### **Step 9: Comprehensive Application Testing**
```bash
# Start application against staging database
NEXT_PUBLIC_SUPABASE_URL=staging-url npm run dev

# Test all major functionality:
# ✅ User authentication and authorization
# ✅ Property management (CRUD operations)
# ✅ Tenant management (CRUD operations)
# ✅ Unit management (CRUD operations)
# ✅ Lease agreement management
# ✅ Payment processing and tracking
# ✅ Rent invoice generation
# ✅ Dashboard analytics and reporting
# ✅ Notification system
# ✅ Maintenance request system
# ✅ User permission management
# ✅ Data export/import functionality
```

#### **Step 10: Performance Testing**
```bash
# Measure performance improvements
# Before cleanup (from production):
# - Database size: X GB
# - Backup time: Y minutes
# - Query response times: Z ms average

# After cleanup (staging):
# - Database size: X GB (should be 50-70% smaller)
# - Backup time: Y minutes (should be 30-40% faster)
# - Query response times: Z ms average (should be 20-30% faster)
```

### **Day 6-7: Rollback Testing**

#### **Step 11: Test Rollback Procedures**
```bash
# Test rollback from backup
psql "postgresql://staging-connection-string" -c "DROP SCHEMA public CASCADE;"
psql "postgresql://staging-connection-string" -c "CREATE SCHEMA public;"
psql "postgresql://staging-connection-string" < full_backup_before_cleanup.sql

# Verify rollback success
# Test application functionality
# Measure rollback time
```

---

## 🚀 **Phase 3: Production Deployment (Week 3)**

### **Day 1-2: Pre-Deployment Preparation**

#### **Step 12: Final Production Backup**
```bash
# Create final backup before production changes
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" > final_backup_before_cleanup.sql

# Verify backup integrity
pg_restore --list final_backup_before_cleanup.sql | wc -l
```

#### **Step 13: Deployment Planning**
```bash
# Schedule maintenance window
# - Estimated downtime: 30-60 minutes
# - Best time: Low usage period (e.g., Sunday 2-4 AM)
# - Notify users in advance
# - Prepare rollback plan
```

### **Day 3: Production Deployment**

#### **Step 14: Execute Production Cleanup**
```bash
# Maintenance window start
# 1. Put application in maintenance mode
# 2. Stop all background jobs
# 3. Ensure no active connections

# Execute cleanup script
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" < production_cleanup.sql

# Verify cleanup success
psql "postgresql://..." -c "
SELECT 
  'Cleanup completed successfully' as status,
  COUNT(*) as remaining_tables,
  pg_size_pretty(pg_database_size(current_database())) as new_database_size
FROM information_schema.tables 
WHERE table_schema = 'public';"
```

#### **Step 15: Post-Deployment Verification**
```bash
# Start application
# Monitor application logs for errors
# Test critical functionality
# Monitor database performance
# Check user feedback

# If issues detected:
# 1. Immediately rollback using backup
# 2. Investigate issues
# 3. Plan remediation
```

### **Day 4-7: Monitoring & Optimization**

#### **Step 16: Performance Monitoring**
```bash
# Monitor for 1 week:
# - Application error rates
# - Database query performance
# - User experience metrics
# - Storage usage trends
# - Backup/restore times
```

---

## 📊 **Expected Results**

### **Database Size Reduction:**
- **Before**: ~2-3 GB (estimated)
- **After**: ~0.8-1.2 GB (estimated)
- **Savings**: 50-70% reduction

### **Performance Improvements:**
- **Backup Time**: 30-40% faster
- **Query Performance**: 20-30% improvement
- **Schema Operations**: 50% faster
- **Development Velocity**: Improved clarity

### **Maintenance Benefits:**
- **Simplified Schema**: Easier to understand and maintain
- **Reduced Complexity**: Fewer objects to manage
- **Lower Costs**: Reduced storage and compute costs
- **Better Security**: Smaller attack surface

---

## ⚠️ **Risk Mitigation**

### **Rollback Plan:**
```bash
# If issues arise during production deployment:
# 1. Immediate rollback procedure (< 15 minutes)
psql "postgresql://..." -c "DROP SCHEMA public CASCADE;"
psql "postgresql://..." -c "CREATE SCHEMA public;"
psql "postgresql://..." < final_backup_before_cleanup.sql

# 2. Restart application
# 3. Verify functionality
# 4. Investigate root cause
```

### **Safety Measures:**
- ✅ **Multiple Backups**: Full, incremental, and table-specific
- ✅ **Staging Testing**: Complete functionality verification
- ✅ **Gradual Rollout**: Monitor each step carefully
- ✅ **Quick Rollback**: < 15 minute recovery time
- ✅ **Team Coordination**: Clear communication plan

---

## 📞 **Emergency Contacts & Procedures**

### **If Issues Arise:**
1. **Immediate**: Execute rollback procedure
2. **Notify**: Development team and stakeholders
3. **Investigate**: Root cause analysis
4. **Document**: Lessons learned and improvements

### **Success Criteria:**
- ✅ Zero data loss
- ✅ Zero functionality impact
- ✅ Measurable performance improvement
- ✅ Successful cleanup completion
- ✅ Positive user feedback

---

**🚨 CRITICAL REMINDER: Never execute cleanup scripts on production without thorough staging environment testing and verified backup procedures.**
