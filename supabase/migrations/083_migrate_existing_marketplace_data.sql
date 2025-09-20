-- Migration: 083_migrate_existing_handover_marketplace_data.sql
-- Description: Migrate existing handover pipeline records to use marketplace_status
-- This migration sets up marketplace status for existing handover properties

-- Log migration start
DO $$
BEGIN
    RAISE NOTICE 'Migration 083: Starting handover marketplace data migration';
    RAISE NOTICE 'Analyzing current handover pipeline records...';
END $$;

-- Analyze current handover data before migration
DO $$
DECLARE
    total_handovers INTEGER;
    in_progress_count INTEGER;
    completed_count INTEGER;
    identified_count INTEGER;
BEGIN
    -- Check if handover_pipeline table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'handover_pipeline') THEN
        SELECT COUNT(*) INTO total_handovers FROM handover_pipeline;
        SELECT COUNT(*) INTO in_progress_count FROM handover_pipeline WHERE handover_status = 'IN_PROGRESS';
        SELECT COUNT(*) INTO completed_count FROM handover_pipeline WHERE handover_status = 'COMPLETED';
        SELECT COUNT(*) INTO identified_count FROM handover_pipeline WHERE handover_status = 'IDENTIFIED';

        RAISE NOTICE 'Current handover pipeline status distribution:';
        RAISE NOTICE '- Total handover records: %', total_handovers;
        RAISE NOTICE '- Handover IN_PROGRESS: %', in_progress_count;
        RAISE NOTICE '- Handover COMPLETED: %', completed_count;
        RAISE NOTICE '- Handover IDENTIFIED: %', identified_count;
    ELSE
        RAISE NOTICE 'Handover pipeline table does not exist yet - will be created by other migrations';
        total_handovers := 0;
    END IF;
END $$;

-- Migrate handover marketplace status based on current handover status
-- Only update existing handover_pipeline records if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'handover_pipeline') THEN
        UPDATE handover_pipeline
        SET
            marketplace_status = CASE
                -- Active handovers become AVAILABLE for marketplace
                WHEN handover_status = 'IN_PROGRESS' THEN 'AVAILABLE'

                -- Completed handovers become SOLD
                WHEN handover_status = 'COMPLETED' THEN 'SOLD'

                -- Identified handovers (early stage) remain NOT_LISTED until ready
                WHEN handover_status = 'IDENTIFIED' THEN 'NOT_LISTED'

                -- All other statuses remain NOT_LISTED
                ELSE 'NOT_LISTED'
            END,

            -- Set marketplace_listed_at for available properties
            marketplace_listed_at = CASE
                WHEN handover_status = 'IN_PROGRESS' THEN
                    COALESCE(created_at, NOW())
                ELSE NULL
            END,

            -- Set marketplace_sold_at for completed properties
            marketplace_sold_at = CASE
                WHEN handover_status = 'COMPLETED' THEN
                    COALESCE(actual_completion_date::timestamp, updated_at, NOW())
                ELSE NULL
            END,

            -- Update the updated_at timestamp
            updated_at = NOW()

        WHERE
            -- Only update records that don't already have marketplace_status set
            marketplace_status IS NULL OR marketplace_status = 'NOT_LISTED';

        RAISE NOTICE 'Updated existing handover_pipeline records with marketplace status';
    ELSE
        RAISE NOTICE 'Handover pipeline table does not exist - skipping data migration';
    END IF;
END $$;

-- Log migration results
DO $$
DECLARE
    not_listed_count INTEGER;
    available_count INTEGER;
    reserved_count INTEGER;
    under_contract_count INTEGER;
    sold_count INTEGER;
    total_migrated INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'handover_pipeline') THEN
        SELECT COUNT(*) INTO not_listed_count FROM handover_pipeline WHERE marketplace_status = 'NOT_LISTED';
        SELECT COUNT(*) INTO available_count FROM handover_pipeline WHERE marketplace_status = 'AVAILABLE';
        SELECT COUNT(*) INTO reserved_count FROM handover_pipeline WHERE marketplace_status = 'RESERVED';
        SELECT COUNT(*) INTO under_contract_count FROM handover_pipeline WHERE marketplace_status = 'UNDER_CONTRACT';
        SELECT COUNT(*) INTO sold_count FROM handover_pipeline WHERE marketplace_status = 'SOLD';

        total_migrated := available_count + reserved_count + under_contract_count + sold_count;

        RAISE NOTICE 'Migration 083: Handover marketplace status migration completed';
        RAISE NOTICE 'New handover marketplace status distribution:';
        RAISE NOTICE '- NOT_LISTED: %', not_listed_count;
        RAISE NOTICE '- AVAILABLE: %', available_count;
        RAISE NOTICE '- RESERVED: %', reserved_count;
        RAISE NOTICE '- UNDER_CONTRACT: %', under_contract_count;
        RAISE NOTICE '- SOLD: %', sold_count;
        RAISE NOTICE 'Total handover records with marketplace activity: %', total_migrated;
    ELSE
        RAISE NOTICE 'Handover pipeline table does not exist - no data to migrate';
    END IF;
END $$;

-- Create a view to help with the handover marketplace transition
-- This view shows handover pipeline records with marketplace status
CREATE OR REPLACE VIEW handover_marketplace_status_view AS
SELECT
    h.id,
    h.property_id,
    h.property_name,
    h.handover_status,
    h.marketplace_status,
    get_handover_marketplace_status_display(h.marketplace_status) as marketplace_status_display,
    h.marketplace_listed_at,
    h.marketplace_reserved_at,
    h.marketplace_sold_at,
    h.buyer_name,
    h.asking_price_kes,
    h.negotiated_price_kes,
    h.overall_progress,
    -- Show if handover is visible in marketplace
    CASE
        WHEN h.marketplace_status IN ('AVAILABLE', 'RESERVED')
        THEN true
        ELSE false
    END as is_marketplace_visible,
    h.created_at,
    h.updated_at
FROM handover_pipeline h
WHERE h.marketplace_status IS NOT NULL
ORDER BY h.marketplace_listed_at DESC NULLS LAST, h.created_at DESC;

-- Grant access to the migration view (only if handover_pipeline table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'handover_pipeline') THEN
        GRANT SELECT ON handover_marketplace_status_view TO authenticated;
        RAISE NOTICE 'Created handover_marketplace_status_view and granted access';
    END IF;
END $$;

-- Add helpful comments
COMMENT ON VIEW handover_marketplace_status_view IS 'View showing handover pipeline records with marketplace status for transition monitoring';

-- Verify handover marketplace migration integrity
DO $$
DECLARE
    total_handovers INTEGER;
    marketplace_enabled_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'handover_pipeline') THEN
        -- Count total handover records
        SELECT COUNT(*) INTO total_handovers FROM handover_pipeline;

        -- Count handovers with marketplace status enabled
        SELECT COUNT(*) INTO marketplace_enabled_count
        FROM handover_pipeline
        WHERE marketplace_status IN ('AVAILABLE', 'RESERVED', 'UNDER_CONTRACT', 'SOLD');

        RAISE NOTICE 'Handover marketplace migration integrity check:';
        RAISE NOTICE '- Total handover records: %', total_handovers;
        RAISE NOTICE '- Records with marketplace status: %', marketplace_enabled_count;

        IF marketplace_enabled_count > 0 THEN
            RAISE NOTICE '✅ Handover marketplace migration completed successfully';
            RAISE NOTICE 'Review handover_marketplace_status_view for details';
        ELSE
            RAISE NOTICE 'ℹ️ No handover records required marketplace status migration';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ Handover pipeline table does not exist - migration will apply when table is created';
    END IF;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 083: Handover marketplace data migration completed successfully';
    RAISE NOTICE 'Created handover_marketplace_status_view for transition monitoring';
    RAISE NOTICE 'Next step: Update HandoverPipelineManager to include marketplace status dropdown';
    RAISE NOTICE 'Next step: Update public properties API to query handover_pipeline marketplace_status';
    RAISE NOTICE 'Auto-completion enabled: RESERVED → Client Interest (no auto-completion), UNDER_CONTRACT → Agreement Signed, SOLD → Final stages';
END $$;
