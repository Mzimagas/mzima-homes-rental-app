-- Migration 006 (TX-safe): Indexes and Performance Optimization
-- This variant removes CONCURRENTLY so it can run inside a transaction block
-- Use this in environments that wrap statements in a transaction (e.g., some SQL editors)
-- For large/production tables, prefer the original 006 with CONCURRENTLY to avoid locks.

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_parcels_county_tenure 
ON parcels(county, tenure) 
WHERE county IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parcels_locality_use 
ON parcels(locality, current_use);

CREATE INDEX IF NOT EXISTS idx_parcels_acreage_range 
ON parcels(acreage_ha) 
WHERE acreage_ha IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plots_subdivision_stage 
ON plots(subdivision_id, stage);

CREATE INDEX IF NOT EXISTS idx_plots_size_utility 
ON plots(size_sqm, utility_level) 
WHERE stage = 'ready_for_sale';

CREATE INDEX IF NOT EXISTS idx_plots_premium_corner 
ON plots(premium_location, corner_plot) 
WHERE stage = 'ready_for_sale';

-- Client and sales indexes
CREATE INDEX IF NOT EXISTS idx_clients_source_agent 
ON clients(source, agent_id);

CREATE INDEX IF NOT EXISTS idx_clients_kyc_blacklist 
ON clients(kyc_verified, blacklisted);

CREATE INDEX IF NOT EXISTS idx_listings_status_price 
ON listings(status, list_price) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_offers_status_expiry 
ON offers_reservations(status, expiry_date);

CREATE INDEX IF NOT EXISTS idx_sale_agreements_status_date 
ON sale_agreements(status, agreement_date);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_receipts_date_amount 
ON receipts(paid_date, amount) 
WHERE paid_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_method_date 
ON receipts(payment_method, paid_date);

CREATE INDEX IF NOT EXISTS idx_invoices_status_due 
ON invoices(status, due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_overdue 
ON invoices(due_date) 
WHERE status IN ('unpaid', 'partly_paid') AND due_date < CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_commissions_agent_status 
ON commissions(agent_id, status);

CREATE INDEX IF NOT EXISTS idx_commissions_payable_status 
ON commissions(payable_date, status) 
WHERE status = 'approved';

-- Document and audit indexes
CREATE INDEX IF NOT EXISTS idx_documents_entity_type_current 
ON documents(entity_type, entity_id, doc_type) 
WHERE is_current_version = TRUE AND is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_documents_expiry_upcoming 
ON documents(expires_at) 
WHERE expires_at IS NOT NULL AND expires_at > CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_activities_audit_date_entity 
ON activities_audit(created_at, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_date 
ON user_activities(user_id, created_at);

-- M-PESA and reconciliation indexes
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_date_processed 
ON mpesa_transactions(transaction_date, processed);

CREATE INDEX IF NOT EXISTS idx_bank_mpesa_recons_date_status 
ON bank_mpesa_recons(transaction_date, status);

CREATE INDEX IF NOT EXISTS idx_bank_mpesa_recons_unmatched 
ON bank_mpesa_recons(amount, transaction_date) 
WHERE status = 'unmatched';

-- Task and reminder indexes
CREATE INDEX IF NOT EXISTS idx_tasks_due_status 
ON tasks_reminders(due_date, status) 
WHERE status IN ('pending', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_tasks_reminder_date 
ON tasks_reminders(reminder_date) 
WHERE reminder_date IS NOT NULL AND status IN ('pending', 'in_progress');

-- Geospatial indexes (if using PostGIS)
DO $$
BEGIN
    -- Check if PostGIS is available and geometry columns exist
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        -- Create spatial indexes if geometry columns exist (non-concurrent)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parcels' AND column_name = 'geometry') THEN
            PERFORM 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_parcels_geometry';
            IF NOT FOUND THEN
                EXECUTE 'CREATE INDEX idx_parcels_geometry ON parcels USING GIST(geometry) WHERE geometry IS NOT NULL';
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plots' AND column_name = 'geometry') THEN
            PERFORM 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_plots_geometry';
            IF NOT FOUND THEN
                EXECUTE 'CREATE INDEX idx_plots_geometry ON plots USING GIST(geometry) WHERE geometry IS NOT NULL';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'PostGIS not available - skipping spatial indexes';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create spatial indexes: %', SQLERRM;
END $$;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_parcels_lr_number_trgm 
ON parcels USING gin(lr_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_parcels_locality_trgm 
ON parcels USING gin(locality gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_name_trgm 
ON clients USING gin(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_subdivisions_name_trgm 
ON subdivisions USING gin(name gin_trgm_ops);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_parcels_active_tenure 
ON parcels(tenure, county) 
WHERE current_use IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plots_available 
ON plots(subdivision_id, size_sqm, utility_level) 
WHERE stage = 'ready_for_sale';

CREATE INDEX IF NOT EXISTS idx_clients_active 
ON clients(source, created_at) 
WHERE blacklisted = FALSE;

CREATE INDEX IF NOT EXISTS idx_sale_agreements_active 
ON sale_agreements(client_id, status, agreement_date) 
WHERE status IN ('active', 'completed');

CREATE INDEX IF NOT EXISTS idx_receipts_recent 
ON receipts(sale_agreement_id, paid_date, amount) 
WHERE paid_date >= CURRENT_DATE - INTERVAL '1 year';

-- Covering indexes for common queries
CREATE INDEX IF NOT EXISTS idx_plots_listing_info 
ON plots(plot_id, subdivision_id, plot_no, size_sqm, stage, utility_level, corner_plot, premium_location);

CREATE INDEX IF NOT EXISTS idx_clients_basic_info 
ON clients(client_id, full_name, phone, email, source, kyc_verified, blacklisted);

CREATE INDEX IF NOT EXISTS idx_sale_agreements_summary 
ON sale_agreements(sale_agreement_id, agreement_no, plot_id, client_id, status, price, balance_due);

-- Expression indexes for calculated fields
CREATE INDEX IF NOT EXISTS idx_parcels_price_per_acre
ON parcels((acquisition_cost_total / NULLIF((acreage_ha * 2.47105), 0)))
WHERE acquisition_cost_total > 0 AND acreage_ha > 0;

-- Index on the price_per_sqm column (now a regular column, not calculated)
CREATE INDEX IF NOT EXISTS idx_listings_price_per_sqm
ON listings(price_per_sqm)
WHERE price_per_sqm IS NOT NULL;

-- Indexes for reporting and analytics
CREATE INDEX IF NOT EXISTS idx_receipts_monthly_summary 
ON receipts(EXTRACT(YEAR FROM paid_date), EXTRACT(MONTH FROM paid_date), payment_method, amount);

CREATE INDEX IF NOT EXISTS idx_sale_agreements_monthly 
ON sale_agreements(EXTRACT(YEAR FROM agreement_date), EXTRACT(MONTH FROM agreement_date), status);

CREATE INDEX IF NOT EXISTS idx_plots_subdivision_summary 
ON plots(subdivision_id, stage) 
INCLUDE (size_sqm, utility_level, corner_plot, premium_location);

-- Unique constraints for business rules
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_listing_per_plot 
ON listings(plot_id) 
WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_offer_per_plot 
ON offers_reservations(plot_id) 
WHERE status IN ('reserved', 'accepted');

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_agreement_per_plot 
ON sale_agreements(plot_id) 
WHERE status IN ('active', 'completed');

-- Indexes for foreign key constraints (if not automatically created)
CREATE INDEX IF NOT EXISTS idx_parcel_owners_parcel_fk 
ON parcel_owners(parcel_id);

CREATE INDEX IF NOT EXISTS idx_parcel_owners_owner_fk 
ON parcel_owners(owner_id);

CREATE INDEX IF NOT EXISTS idx_encumbrances_parcel_fk 
ON encumbrances(parcel_id);

CREATE INDEX IF NOT EXISTS idx_surveys_parcel_fk 
ON surveys(parcel_id);

CREATE INDEX IF NOT EXISTS idx_subdivisions_parcel_fk 
ON subdivisions(parcel_id);

CREATE INDEX IF NOT EXISTS idx_plots_subdivision_fk 
ON plots(subdivision_id);

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_activities_audit_performance 
ON activities_audit(created_at, action) 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_security_events_recent 
ON security_events(created_at, event_type, severity) 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- Maintenance indexes for cleanup operations
CREATE INDEX IF NOT EXISTS idx_user_activities_cleanup 
ON user_activities(created_at) 
WHERE created_at < CURRENT_DATE - INTERVAL '1 year';

CREATE INDEX IF NOT EXISTS idx_data_access_logs_cleanup 
ON data_access_logs(accessed_at) 
WHERE accessed_at < CURRENT_DATE - INTERVAL '2 years';

-- Statistics and vacuum settings for key tables
ALTER TABLE parcels SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE plots SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE clients SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE sale_agreements SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE receipts SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- Update table statistics
ANALYZE parcels;
ANALYZE plots;
ANALYZE clients;
ANALYZE sale_agreements;
ANALYZE receipts;
ANALYZE invoices;
ANALYZE listings;
ANALYZE offers_reservations;

-- Comments for documentation
COMMENT ON INDEX idx_parcels_county_tenure IS 'Composite index for filtering parcels by county and tenure';
COMMENT ON INDEX idx_plots_subdivision_stage IS 'Composite index for plot queries by subdivision and stage';
COMMENT ON INDEX idx_receipts_date_amount IS 'Index for financial reporting by date and amount';
COMMENT ON INDEX idx_invoices_overdue IS 'Partial index for identifying overdue invoices';
COMMENT ON INDEX idx_documents_entity_type_current IS 'Index for current document versions by entity';
COMMENT ON INDEX idx_tasks_due_status IS 'Index for task management queries by due date and status';

