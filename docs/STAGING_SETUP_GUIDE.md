# Staging Environment Setup Guide - Soft Delete Testing

**Purpose**: Create a safe staging environment to test soft delete operations on 73 empty tables.

**Date**: August 27, 2025
**Updated**: Corrected analysis - 106 tables total, 73 empty
**Strategy**: Soft delete with monitoring and rollback capability

## 🎯 Updated Objectives

1. **Test Soft Delete Strategy**: Safely archive 73 empty tables using table renaming
2. **Monitor Application Health**: Track any issues during table archiving
3. **Measure Performance Gains**: Document improvements from cleanup
4. **Validate Rollback Procedures**: Ensure we can restore tables if needed

## 📊 **CORRECTED Scope**

### **Database Reality**
- **Total Tables**: 106 (not 17!)
- **Empty Tables**: 73 (69% of database)
- **Cleanup Strategy**: 5-phase soft delete approach
- **Expected Impact**: 69-94% storage reduction

### **Soft Delete Phases**
1. **Phase 1**: Schema backup & monitoring (ZERO risk)
2. **Phase 2**: 28 high-priority tables (LOW risk)
3. **Phase 3**: 13 medium-priority tables (MEDIUM risk)
4. **Phase 4**: 30 low-priority tables (HIGH risk)
5. **Phase 5**: 2 core tables (CRITICAL risk)

## 🚀 **Quick Setup (Automated)**

### **Option 1: Automated Setup Script**
```bash
# Run the automated staging setup
node scripts/setup-staging-environment.js
```

This script will:
1. Guide you through Supabase project creation
2. Configure staging credentials
3. Restore production data automatically
4. Validate the setup

### **Option 2: Manual Setup**

#### **Step 1: Create Staging Supabase Project**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Configure:
   - **Name**: `Mzima Homes Staging`
   - **Region**: `eu-north-1` (same as production)
   - **Database Password**: Generate secure password
4. Wait for project creation (2-3 minutes)

#### **Step 2: Configure Staging Credentials**
Update `.env.staging` with your staging project details:

```env
# Staging Environment Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-staging-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-staging-service-key]

# Environment Markers
NODE_ENV=staging
ENVIRONMENT=staging

# Soft Delete Testing Configuration
ENABLE_TABLE_ARCHIVING=true
ARCHIVE_MONITORING_MODE=true
ROLLBACK_ON_ERROR=true
```

#### **Step 3: Restore Production Data**
```bash
# Use the most recent backup
node scripts/restore-to-staging.js --backup-dir=./backups/database-backup-2025-08-27T08-37-41-160Z
```

## 🛡️ **Phase 1: Schema Backup & Monitoring**

Before any table archiving, execute Phase 1:

```bash
# Execute Phase 1 in staging
NODE_ENV=staging node scripts/execute-phase1-schema-backup.js
```

**Phase 1 Creates**:
- ✅ Complete schema backup (all 106 tables)
- ✅ Foreign key constraint backup
- ✅ Index backup
- ✅ Restoration scripts
- ✅ Monitoring configuration

## 🧪 **Testing Workflow**

### **1. Baseline Testing**
```bash
# Start staging application
npm run dev:staging

# Test core functionality:
# - User authentication
# - Property management
# - Tenant operations
# - Payment systems
```

### **2. Phase 2 Soft Delete Testing**
```bash
# Archive 28 high-priority tables (safest)
npm run archive:staging

# Monitor application for errors
# Test all core features
# Measure performance improvements
```

### **3. Rollback Testing**
```bash
# Test rollback capability
node backups/schema-backup-[timestamp]/restore-archived-tables.js

# Verify application works after rollback
npm run dev:staging
```

## 📈 **Performance Monitoring**

### **Before Cleanup Metrics**
- Database size: ~106 tables
- Query performance: baseline
- Backup duration: baseline
- Application startup time: baseline

### **After Phase 2 Metrics** (28 tables archived)
- Database size: ~78 tables (-26%)
- Query performance: expected 15-25% improvement
- Backup duration: expected 20-35% faster
- Application startup: expected improvement

### **Maximum Potential** (73 tables archived)
- Database size: ~33 tables (-69%)
- Query performance: 21-35% improvement
- Backup duration: 28-41% faster
- Schema complexity: 69% reduction

## 🛡️ **Safety Measures**

### **Soft Delete Benefits**
- ✅ **Reversible**: Tables renamed, not deleted
- ✅ **Gradual**: Phased approach with monitoring
- ✅ **Monitored**: Application health tracking
- ✅ **Tested**: Staging environment validation

### **Rollback Capability**
```bash
# Immediate rollback (rename tables back)
ALTER TABLE "_archived_phase2_clients" RENAME TO "clients";

# Or use restoration script
node restore-archived-tables.js
```

### **Monitoring Checklist**
- [ ] Application starts without errors
- [ ] No "table does not exist" errors in logs
- [ ] Core features work correctly
- [ ] Performance improvements measured
- [ ] Rollback tested and working

## 📋 **Staging Checklist**

### **Environment Setup**
- [ ] Staging Supabase project created
- [ ] `.env.staging` configured with correct credentials
- [ ] Production data restored (9,234 rows)
- [ ] Application connects and runs in staging

### **Phase 1 Completion**
- [ ] Schema backup completed (106 tables)
- [ ] Restoration scripts created
- [ ] Monitoring configuration set up
- [ ] Baseline performance metrics captured

### **Phase 2 Ready**
- [ ] 28 high-priority tables identified
- [ ] Archiving scripts tested
- [ ] Rollback procedures validated
- [ ] Application monitoring in place

## 🔄 **Next Steps After Staging Setup**

1. **Execute Phase 1**: Schema backup and monitoring setup
2. **Test Phase 2**: Archive 28 high-priority tables
3. **Monitor for 1 week**: Watch for any issues
4. **Measure improvements**: Document performance gains
5. **Plan production deployment**: If staging successful

## 📋 **Quick Commands**

```bash
# Setup staging environment
node scripts/setup-staging-environment.js

# Execute Phase 1 (schema backup)
NODE_ENV=staging node scripts/execute-phase1-schema-backup.js

# Start staging application
npm run dev:staging

# Analyze staging database
npm run analyze:staging

# Archive tables (Phase 2)
npm run archive:staging
```

---

**Ready to proceed?** Run the setup script and let's safely test the soft delete approach on your 73 empty tables!