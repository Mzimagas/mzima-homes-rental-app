-- Production Table Archiving Script
-- Phase 2: Archive 28 High-Priority Empty Tables
-- Date: August 27, 2025
-- Validation: 100% successful in staging environment

-- IMPORTANT: Execute these commands in Supabase SQL Editor or database admin tool
-- DO NOT run all at once - execute in batches and test application health between batches

-- =============================================================================
-- BATCH 1: Land Sales & Development Tables (Part 1) - 7 tables
-- =============================================================================

-- Batch 1a: Core land sales tables
ALTER TABLE "clients" RENAME TO "_archived_phase2_clients";
ALTER TABLE "parcels" RENAME TO "_archived_phase2_parcels";
ALTER TABLE "plots" RENAME TO "_archived_phase2_plots";

-- Test application health here before proceeding
-- Verify: Properties, Units, Tenants, Tenancy Agreements still work

-- Batch 1b: Land development tables
ALTER TABLE "subdivisions" RENAME TO "_archived_phase2_subdivisions";
ALTER TABLE "subdivision_plots" RENAME TO "_archived_phase2_subdivision_plots";
ALTER TABLE "surveys" RENAME TO "_archived_phase2_surveys";
ALTER TABLE "encumbrances" RENAME TO "_archived_phase2_encumbrances";

-- Test application health here before proceeding

-- =============================================================================
-- BATCH 2: Land Sales & Development Tables (Part 2) - 7 tables
-- =============================================================================

-- Batch 2a: Property sales tables
ALTER TABLE "listings" RENAME TO "_archived_phase2_listings";
ALTER TABLE "sale_agreements" RENAME TO "_archived_phase2_sale_agreements";
ALTER TABLE "property_sale_info" RENAME TO "_archived_phase2_property_sale_info";
ALTER TABLE "property_sale_status_history" RENAME TO "_archived_phase2_property_sale_status_history";

-- Test application health here before proceeding

-- Batch 2b: Sales process tables
ALTER TABLE "offers_reservations" RENAME TO "_archived_phase2_offers_reservations";
ALTER TABLE "reservation_requests" RENAME TO "_archived_phase2_reservation_requests";
ALTER TABLE "transfers_titles" RENAME TO "_archived_phase2_transfers_titles";

-- Test application health here before proceeding

-- =============================================================================
-- BATCH 3: Land Sales & Development Tables (Part 3) - 7 tables
-- =============================================================================

-- Batch 3a: Cost and ownership tables
ALTER TABLE "parcel_owners" RENAME TO "_archived_phase2_parcel_owners";
ALTER TABLE "property_handover_costs" RENAME TO "_archived_phase2_property_handover_costs";
ALTER TABLE "property_subdivision_costs" RENAME TO "_archived_phase2_property_subdivision_costs";
ALTER TABLE "purchase_pipeline_costs" RENAME TO "_archived_phase2_purchase_pipeline_costs";

-- Test application health here before proceeding

-- Batch 3b: Process and approval tables
ALTER TABLE "property_subdivision_history" RENAME TO "_archived_phase2_property_subdivision_history";
ALTER TABLE "purchase_pipeline_change_approvals" RENAME TO "_archived_phase2_purchase_pipeline_change_approvals";
ALTER TABLE "wayleaves_easements" RENAME TO "_archived_phase2_wayleaves_easements";

-- Test application health here before proceeding

-- =============================================================================
-- BATCH 4: Document & Media Management Tables - 5 tables
-- =============================================================================

-- Batch 4a: Document tables
ALTER TABLE "documents" RENAME TO "_archived_phase2_documents";
ALTER TABLE "land_media" RENAME TO "_archived_phase2_land_media";

-- Test application health here before proceeding

-- Batch 4b: Property media and amenities
ALTER TABLE "land_property_amenities" RENAME TO "_archived_phase2_land_property_amenities";
ALTER TABLE "unit_amenities" RENAME TO "_archived_phase2_unit_amenities";
ALTER TABLE "units_media" RENAME TO "_archived_phase2_units_media";

-- Test application health here before proceeding

-- =============================================================================
-- BATCH 5: Marketing & Amenities Tables - 2 tables
-- =============================================================================

-- Final batch: Marketing tables
ALTER TABLE "amenities" RENAME TO "_archived_phase2_amenities";
ALTER TABLE "marketing_leads" RENAME TO "_archived_phase2_marketing_leads";

-- Final application health test

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify archived tables exist with new names
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '_archived_phase2_%' 
ORDER BY table_name;

-- Verify core rental tables still exist and are accessible
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('properties', 'units', 'tenants', 'tenancy_agreements', 'rent_invoices', 'payments')
ORDER BY table_name;

-- =============================================================================
-- ROLLBACK COMMANDS (Emergency Use Only)
-- =============================================================================

-- UNCOMMENT AND RUN THESE ONLY IF ROLLBACK IS NEEDED

-- Rollback Batch 1
-- ALTER TABLE "_archived_phase2_clients" RENAME TO "clients";
-- ALTER TABLE "_archived_phase2_parcels" RENAME TO "parcels";
-- ALTER TABLE "_archived_phase2_plots" RENAME TO "plots";
-- ALTER TABLE "_archived_phase2_subdivisions" RENAME TO "subdivisions";
-- ALTER TABLE "_archived_phase2_subdivision_plots" RENAME TO "subdivision_plots";
-- ALTER TABLE "_archived_phase2_surveys" RENAME TO "surveys";
-- ALTER TABLE "_archived_phase2_encumbrances" RENAME TO "encumbrances";

-- Rollback Batch 2
-- ALTER TABLE "_archived_phase2_listings" RENAME TO "listings";
-- ALTER TABLE "_archived_phase2_sale_agreements" RENAME TO "sale_agreements";
-- ALTER TABLE "_archived_phase2_property_sale_info" RENAME TO "property_sale_info";
-- ALTER TABLE "_archived_phase2_property_sale_status_history" RENAME TO "property_sale_status_history";
-- ALTER TABLE "_archived_phase2_offers_reservations" RENAME TO "offers_reservations";
-- ALTER TABLE "_archived_phase2_reservation_requests" RENAME TO "reservation_requests";
-- ALTER TABLE "_archived_phase2_transfers_titles" RENAME TO "transfers_titles";

-- Rollback Batch 3
-- ALTER TABLE "_archived_phase2_parcel_owners" RENAME TO "parcel_owners";
-- ALTER TABLE "_archived_phase2_property_handover_costs" RENAME TO "property_handover_costs";
-- ALTER TABLE "_archived_phase2_property_subdivision_costs" RENAME TO "property_subdivision_costs";
-- ALTER TABLE "_archived_phase2_purchase_pipeline_costs" RENAME TO "purchase_pipeline_costs";
-- ALTER TABLE "_archived_phase2_property_subdivision_history" RENAME TO "property_subdivision_history";
-- ALTER TABLE "_archived_phase2_purchase_pipeline_change_approvals" RENAME TO "purchase_pipeline_change_approvals";
-- ALTER TABLE "_archived_phase2_wayleaves_easements" RENAME TO "wayleaves_easements";

-- Rollback Batch 4
-- ALTER TABLE "_archived_phase2_documents" RENAME TO "documents";
-- ALTER TABLE "_archived_phase2_land_media" RENAME TO "land_media";
-- ALTER TABLE "_archived_phase2_land_property_amenities" RENAME TO "land_property_amenities";
-- ALTER TABLE "_archived_phase2_unit_amenities" RENAME TO "unit_amenities";
-- ALTER TABLE "_archived_phase2_units_media" RENAME TO "units_media";

-- Rollback Batch 5
-- ALTER TABLE "_archived_phase2_amenities" RENAME TO "amenities";
-- ALTER TABLE "_archived_phase2_marketing_leads" RENAME TO "marketing_leads";

/*
EXECUTION INSTRUCTIONS:

1. BEFORE STARTING:
   - Ensure complete database backup is completed
   - Verify staging validation results
   - Have team standing by for monitoring

2. EXECUTION APPROACH:
   - Execute one batch at a time
   - Test application health between each batch
   - Monitor application logs for any errors
   - Be ready to rollback if issues arise

3. HEALTH CHECK BETWEEN BATCHES:
   - Test property management features
   - Test tenant management features
   - Test tenancy agreement features
   - Check application logs for errors

4. SUCCESS CRITERIA:
   - All 28 tables successfully archived
   - No application errors
   - Core functionality working
   - Performance improvements measurable

ESTIMATED EXECUTION TIME: 45 minutes (including health checks)
RISK LEVEL: LOW (staging validation successful)
REVERSIBILITY: 100% (complete rollback available)
*/
