-- Database Cleanup Analysis Script
-- Run this on your Supabase database to identify unused tables and objects
-- IMPORTANT: Run this in READ-ONLY mode first to analyze before making changes

-- ============================================================================
-- 1. TABLE USAGE ANALYSIS
-- ============================================================================

-- Check table activity (requires pg_stat_statements extension)
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_tup_ins + n_tup_upd + n_tup_del as total_operations,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY total_operations ASC, live_rows ASC;

-- ============================================================================
-- 2. IDENTIFY TABLES WITH NO RECENT ACTIVITY
-- ============================================================================

-- Tables with zero operations (potential candidates for removal)
SELECT 
  tablename,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
  AND n_tup_ins + n_tup_upd + n_tup_del = 0
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 3. FOREIGN KEY DEPENDENCY ANALYSIS
-- ============================================================================

-- Find all foreign key relationships
SELECT 
  tc.table_name as referencing_table,
  kcu.column_name as referencing_column,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, ccu.table_name;

-- ============================================================================
-- 4. IDENTIFY ORPHANED TABLES (NO FOREIGN KEY REFERENCES)
-- ============================================================================

-- Tables that are not referenced by any foreign keys
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN (
    SELECT DISTINCT ccu.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  )
ORDER BY t.table_name;

-- ============================================================================
-- 5. ANALYZE SPECIFIC SUSPECTED UNUSED TABLES
-- ============================================================================

-- Check if these specific tables have any data or recent activity
SELECT 
  'parcels' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as last_created,
  MAX(updated_at) as last_updated
FROM parcels
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels')

UNION ALL

SELECT 
  'subdivisions' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as last_created,
  MAX(updated_at) as last_updated
FROM subdivisions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subdivisions')

UNION ALL

SELECT 
  'plots' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as last_created,
  MAX(updated_at) as last_updated
FROM plots
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plots')

UNION ALL

SELECT 
  'clients' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as last_created,
  MAX(updated_at) as last_updated
FROM clients
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients')

UNION ALL

SELECT 
  'enhanced_users' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as last_created,
  MAX(updated_at) as last_updated
FROM enhanced_users
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enhanced_users')

UNION ALL

SELECT 
  'documents' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as last_created,
  MAX(updated_at) as last_updated
FROM documents
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents');

-- ============================================================================
-- 6. INDEX USAGE ANALYSIS
-- ============================================================================

-- Find unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_tup_read = 0 
  AND idx_tup_fetch = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- 7. FUNCTION USAGE ANALYSIS
-- ============================================================================

-- Find potentially unused functions
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prokind = 'f' THEN 'function'
    WHEN p.prokind = 'p' THEN 'procedure'
    WHEN p.prokind = 'a' THEN 'aggregate'
    WHEN p.prokind = 'w' THEN 'window'
  END as function_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;

-- ============================================================================
-- 8. STORAGE ANALYSIS
-- ============================================================================

-- Database size breakdown by table
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
  n_live_tup as estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 9. MIGRATION TRACKING
-- ============================================================================

-- Check migration history (if migration tracking table exists)
SELECT 
  migration_name,
  executed_at,
  success,
  details
FROM migration_log
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_log')
ORDER BY executed_at DESC;

-- ============================================================================
-- 10. RECOMMENDED CLEANUP ACTIONS
-- ============================================================================

-- Generate DROP statements for potentially unused tables
-- IMPORTANT: Review carefully before executing!

SELECT 
  'DROP TABLE IF EXISTS ' || tablename || ' CASCADE;' as cleanup_sql,
  tablename,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_saved
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
  AND n_tup_ins + n_tup_upd + n_tup_del = 0  -- No activity
  AND n_live_tup = 0  -- No data
  AND tablename NOT IN (
    -- Exclude core rental management tables
    'properties', 'units', 'tenants', 'tenancy_agreements', 
    'rent_invoices', 'payments', 'property_users', 'landlords',
    'notifications', 'maintenance_requests'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- SAFETY CHECKS BEFORE CLEANUP
-- ============================================================================

-- 1. Verify no application code references these tables
-- 2. Check for any scheduled jobs or triggers using these tables
-- 3. Ensure full database backup exists
-- 4. Test on staging environment first
-- 5. Plan rollback strategy

-- ============================================================================
-- BACKUP COMMANDS (Run before cleanup)
-- ============================================================================

/*
-- Create backup schema for safety
CREATE SCHEMA IF NOT EXISTS backup_before_cleanup;

-- Example backup commands (adjust table names as needed):
CREATE TABLE backup_before_cleanup.parcels AS SELECT * FROM parcels;
CREATE TABLE backup_before_cleanup.subdivisions AS SELECT * FROM subdivisions;
CREATE TABLE backup_before_cleanup.plots AS SELECT * FROM plots;
-- ... continue for all tables being removed

-- Full database backup (run from command line):
-- pg_dump -h your-host -U your-user -d your-database > backup_before_cleanup.sql
*/
