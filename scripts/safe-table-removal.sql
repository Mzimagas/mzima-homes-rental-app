-- ============================================================================
-- SAFE TABLE REMOVAL SCRIPT - Targeted Cleanup
-- ============================================================================
-- This script safely removes 66 unused tables in dependency order
-- All tables verified to have 0 rows (completely empty)
-- 
-- BACKUP CREATED: See backups/targeted-cleanup-backup-* directory
-- 
-- EXECUTION: Run this script in Supabase SQL Editor or via API
-- ============================================================================

-- Start transaction for safety
BEGIN;

-- ============================================================================
-- PHASE 1: Drop tables with no dependencies (leaf tables)
-- ============================================================================

-- Audit and logging tables (no dependencies)
DROP TABLE IF EXISTS activities_audit CASCADE;
DROP TABLE IF EXISTS data_access_logs CASCADE;
DROP TABLE IF EXISTS disputes_logs CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS user_activities CASCADE;
DROP TABLE IF EXISTS permission_audit_log CASCADE;
DROP TABLE IF EXISTS property_audit_log CASCADE;

-- Simple utility tables
DROP TABLE IF EXISTS tasks_reminders CASCADE;
DROP TABLE IF EXISTS marketing_leads CASCADE;
DROP TABLE IF EXISTS in_app_notifications CASCADE;
DROP TABLE IF EXISTS notification_history CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;

-- User-related unused tables
DROP TABLE IF EXISTS user_next_of_kin CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;

-- ============================================================================
-- PHASE 2: Drop utility and meter-related tables
-- ============================================================================

-- Utility system (unused)
DROP TABLE IF EXISTS utility_ledger CASCADE;
DROP TABLE IF EXISTS utility_accounts CASCADE;
DROP TABLE IF EXISTS unit_shared_meters CASCADE;
DROP TABLE IF EXISTS shared_meters CASCADE;
DROP TABLE IF EXISTS meter_readings CASCADE;

-- ============================================================================
-- PHASE 3: Drop payment and financial tables
-- ============================================================================

-- Payment system (unused)
DROP TABLE IF EXISTS payment_allocations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS rent_invoices CASCADE;
DROP TABLE IF EXISTS mpesa_transactions CASCADE;
DROP TABLE IF EXISTS bank_mpesa_recons CASCADE;

-- ============================================================================
-- PHASE 4: Drop sales and commission system
-- ============================================================================

-- Commission and receipt system
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Transfer and agreement system
DROP TABLE IF EXISTS transfers_titles CASCADE;
DROP TABLE IF EXISTS payment_plans CASCADE;
DROP TABLE IF EXISTS sale_agreements CASCADE;

-- ============================================================================
-- PHASE 5: Drop reservation and offer system
-- ============================================================================

-- Reservation system
DROP TABLE IF EXISTS reservation_requests CASCADE;
DROP TABLE IF EXISTS offers_reservations CASCADE;
DROP TABLE IF EXISTS listings CASCADE;

-- ============================================================================
-- PHASE 6: Drop client and agent system
-- ============================================================================

-- Client management
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- ============================================================================
-- PHASE 7: Drop land subdivision system
-- ============================================================================

-- Value-add and development
DROP TABLE IF EXISTS value_add_projects CASCADE;
DROP TABLE IF EXISTS wayleaves_easements CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;

-- Pricing and subdivision plots
DROP TABLE IF EXISTS pricing_zones CASCADE;
DROP TABLE IF EXISTS subdivision_plots CASCADE;

-- Plot system
DROP TABLE IF EXISTS plots CASCADE;

-- Subdivision system
DROP TABLE IF EXISTS subdivisions CASCADE;

-- ============================================================================
-- PHASE 8: Drop parcel and land system
-- ============================================================================

-- Land rates and surveys
DROP TABLE IF EXISTS land_rates CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;
DROP TABLE IF EXISTS encumbrances CASCADE;

-- Parcel ownership
DROP TABLE IF EXISTS parcel_owners CASCADE;

-- Owners and parcels
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS parcels CASCADE;

-- ============================================================================
-- PHASE 9: Drop property-related unused tables
-- ============================================================================

-- Property costs and sales
DROP TABLE IF EXISTS property_subdivision_costs CASCADE;
DROP TABLE IF EXISTS property_handover_costs CASCADE;
DROP TABLE IF EXISTS property_payment_records CASCADE;
DROP TABLE IF EXISTS property_sale_status_history CASCADE;
DROP TABLE IF EXISTS property_sale_info CASCADE;

-- Property media and details
DROP TABLE IF EXISTS land_media CASCADE;
DROP TABLE IF EXISTS land_details CASCADE;
DROP TABLE IF EXISTS units_media CASCADE;
DROP TABLE IF EXISTS land_property_amenities CASCADE;

-- ============================================================================
-- PHASE 10: Drop maintenance and amenity system
-- ============================================================================

-- Maintenance system
DROP TABLE IF EXISTS maintenance_tickets CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;

-- Amenity system
DROP TABLE IF EXISTS unit_amenities CASCADE;
DROP TABLE IF EXISTS amenities CASCADE;

-- ============================================================================
-- PHASE 11: Drop purchase pipeline unused tables
-- ============================================================================

-- Purchase pipeline costs and approvals
DROP TABLE IF EXISTS purchase_pipeline_costs CASCADE;
DROP TABLE IF EXISTS purchase_pipeline_change_approvals CASCADE;

-- ============================================================================
-- PHASE 12: Drop remaining miscellaneous tables
-- ============================================================================

-- Miscellaneous unused tables
DROP TABLE IF EXISTS expenses CASCADE;

-- ============================================================================
-- VERIFICATION: Check that only active tables remain
-- ============================================================================

-- This query should show only the tables we want to keep
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected remaining tables (should be ~32 tables):
-- - auth.* tables (Supabase auth)
-- - documents, enhanced_users, handover_pipeline
-- - land_amenities, landlords, notification_rules, notification_templates
-- - permission_*, properties, property_*
-- - purchase_pipeline, purchase_pipeline_audit_log, purchase_pipeline_field_security
-- - tenancy_agreements, tenants, units, user_roles
-- - property_subdivision_history, property_subdivisions

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

-- Uncomment the next line to execute the changes
-- COMMIT;

-- Execute the changes
COMMIT;

-- ============================================================================
-- POST-EXECUTION VERIFICATION
-- ============================================================================

-- After committing, run these queries to verify success:

-- 1. Check table count (should be ~32 tables)
-- SELECT COUNT(*) as remaining_tables FROM information_schema.tables WHERE table_schema = 'public';

-- 2. Check for any remaining empty tables
-- SELECT schemaname, relname as tablename, n_live_tup as row_count 
-- FROM pg_stat_user_tables 
-- WHERE schemaname = 'public' AND n_live_tup = 0 
-- ORDER BY relname;

-- 3. Verify core rental management tables still exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('properties', 'units', 'tenants', 'tenancy_agreements')
-- ORDER BY table_name;
