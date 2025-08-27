# Staging Environment Setup Guide

**Purpose**: Create a safe staging environment to test database cleanup operations before applying to production.

**Date**: August 27, 2025
**Project**: Mzima Homes Rental App Technical Debt Cleanup

## 🎯 Objectives

1. **Mirror Production**: Create exact replica of production database
2. **Safe Testing**: Test all cleanup operations without risk
3. **Performance Validation**: Measure improvements before production deployment
4. **Rollback Testing**: Verify rollback procedures work correctly

## 📋 Prerequisites

- ✅ Production database backup completed
- ✅ Supabase CLI installed and configured
- ✅ Access to Supabase dashboard
- ✅ Local development environment ready

## 🏗️ Setup Options

### Option 1: New Supabase Project (Recommended)

#### Step 1: Create New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Configure:
   - **Name**: `Mzima Homes Staging`
   - **Database Password**: Generate secure password
   - **Region**: Same as production (`eu-north-1`)
   - **Pricing Plan**: Free tier (sufficient for testing)

#### Step 2: Configure Project Settings
```bash
# Note the new project details:
# Project URL: https://[new-project-ref].supabase.co
# Service Role Key: [new-service-key]
# Anon Key: [new-anon-key]
```

#### Step 3: Restore Production Data
```bash
# 1. Link to staging project
supabase link --project-ref [staging-project-ref]

# 2. Apply production schema (if available)
supabase db push

# 3. Restore data from backup
# (We'll create a restoration script for this)
```

### Option 2: Local Supabase Instance

#### Step 1: Initialize Local Supabase
```bash
# In project directory
supabase init

# Start local instance
supabase start
```

#### Step 2: Configure Local Environment
```bash
# Local Supabase runs on:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio: http://localhost:54323
```

## 🔧 Environment Configuration

### Create Staging Environment File
Create `.env.staging` with staging credentials:

```env
# Staging Environment Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-key]

# Mark as staging
NODE_ENV=staging
ENVIRONMENT=staging
```

### Update Package.json Scripts
Add staging-specific scripts:

```json
{
  "scripts": {
    "dev:staging": "cp .env.staging .env.local && npm run dev",
    "build:staging": "cp .env.staging .env.local && npm run build",
    "test:staging": "cp .env.staging .env.local && npm run test"
  }
}
```

## 📊 Data Restoration Script

We'll create a script to restore production data to staging:

### Features:
- Restore all table data from backup
- Maintain referential integrity
- Verify data consistency
- Generate restoration report

### Usage:
```bash
# Restore production backup to staging
node scripts/restore-to-staging.js --backup-dir ./backups/database-backup-2025-08-27T08-37-41-160Z
```

## 🧪 Testing Procedures

### 1. Functionality Testing
- ✅ All core rental management features work
- ✅ User authentication and authorization
- ✅ Property management operations
- ✅ Tenant management operations
- ✅ Payment and invoice systems

### 2. Database Cleanup Testing
- ✅ Remove unused tables safely
- ✅ Verify no broken references
- ✅ Confirm application still functions
- ✅ Measure performance improvements

### 3. Rollback Testing
- ✅ Test backup restoration procedures
- ✅ Verify data integrity after rollback
- ✅ Confirm application functionality post-rollback

## 📈 Performance Benchmarking

### Before Cleanup Metrics
- Database size
- Query response times
- Backup duration
- Schema complexity

### After Cleanup Metrics
- Database size reduction
- Query performance improvement
- Backup speed improvement
- Simplified schema

### Benchmarking Script
```bash
# Run performance benchmarks
node scripts/benchmark-performance.js --environment staging
```

## 🔄 Staging Workflow

### Phase 1: Environment Setup
1. ✅ Create staging project/instance
2. ✅ Configure environment variables
3. ✅ Restore production data
4. ✅ Verify application functionality

### Phase 2: Cleanup Testing
1. ✅ Apply database cleanup operations
2. ✅ Test all application features
3. ✅ Measure performance improvements
4. ✅ Document any issues

### Phase 3: Validation
1. ✅ Verify cleanup success
2. ✅ Test rollback procedures
3. ✅ Generate test report
4. ✅ Approve for production deployment

## ⚠️ Safety Considerations

### Data Security
- **No Production Data Exposure**: Staging should be isolated
- **Access Control**: Limit staging access to development team
- **Data Anonymization**: Consider anonymizing sensitive data

### Testing Isolation
- **Separate Infrastructure**: Staging must not affect production
- **Independent Monitoring**: Separate logging and monitoring
- **Clear Labeling**: All staging resources clearly marked

### Rollback Preparedness
- **Multiple Backups**: Maintain multiple backup points
- **Tested Procedures**: All rollback procedures tested
- **Documentation**: Clear rollback instructions

## 📋 Checklist

### Pre-Setup
- [ ] Production backup verified and accessible
- [ ] Supabase CLI installed and authenticated
- [ ] Team access permissions configured
- [ ] Staging project created (if using new project)

### Setup Completion
- [ ] Staging environment configured
- [ ] Production data restored to staging
- [ ] Application connects to staging successfully
- [ ] All core features tested and working

### Ready for Cleanup Testing
- [ ] Baseline performance metrics captured
- [ ] Cleanup scripts prepared and reviewed
- [ ] Test procedures documented
- [ ] Rollback procedures tested

## 🔗 Next Steps

After staging environment setup:
1. **Run Baseline Tests**: Capture current performance metrics
2. **Apply Cleanup Operations**: Remove unused tables in staging
3. **Comprehensive Testing**: Verify all functionality works
4. **Performance Analysis**: Measure improvements
5. **Production Planning**: Prepare production deployment

---

**Status**: Ready for implementation
**Estimated Time**: 2-4 hours for complete setup
**Risk Level**: Low (isolated staging environment)