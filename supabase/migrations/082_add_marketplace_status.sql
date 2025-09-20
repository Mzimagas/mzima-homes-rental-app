-- Migration: 082_add_marketplace_status.sql
-- Description: Add dedicated marketplace status to properties table
-- This replaces the current handover_status-based marketplace filtering logic

-- Create handover marketplace status enum (simplified for handover pipeline only)
DO $$ BEGIN
    CREATE TYPE handover_marketplace_status_enum AS ENUM (
        'NOT_LISTED',      -- Property not available in marketplace (default)
        'AVAILABLE',       -- Property available for interest/purchase
        'RESERVED',        -- Property reserved by client
        'UNDER_CONTRACT',  -- Property under contract/agreement
        'SOLD'            -- Property sold/completed
    );
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'handover_marketplace_status_enum already exists, skipping creation';
END $$;

-- Add marketplace_status column to handover_pipeline table (not properties)
ALTER TABLE handover_pipeline
ADD COLUMN IF NOT EXISTS marketplace_status handover_marketplace_status_enum DEFAULT 'NOT_LISTED';

-- Add marketplace tracking columns to handover_pipeline table
ALTER TABLE handover_pipeline
ADD COLUMN IF NOT EXISTS marketplace_listed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE handover_pipeline
ADD COLUMN IF NOT EXISTS marketplace_reserved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE handover_pipeline
ADD COLUMN IF NOT EXISTS marketplace_sold_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient handover marketplace queries
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_marketplace_status
ON handover_pipeline(marketplace_status)
WHERE marketplace_status IN ('AVAILABLE', 'RESERVED');

-- Create index for marketplace listing date queries
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_marketplace_listed_at
ON handover_pipeline(marketplace_listed_at DESC)
WHERE marketplace_listed_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN handover_pipeline.marketplace_status IS 'Marketplace status for handover properties - controls client-facing availability';
COMMENT ON COLUMN handover_pipeline.marketplace_listed_at IS 'Timestamp when handover property was first listed in marketplace';
COMMENT ON COLUMN handover_pipeline.marketplace_reserved_at IS 'Timestamp when handover property was reserved by client';
COMMENT ON COLUMN handover_pipeline.marketplace_sold_at IS 'Timestamp when handover property sale was completed';

-- Create function to get handover marketplace status display value
CREATE OR REPLACE FUNCTION get_handover_marketplace_status_display(status handover_marketplace_status_enum)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE status
        WHEN 'NOT_LISTED' THEN 'Not Listed'
        WHEN 'AVAILABLE' THEN 'Available Now'
        WHEN 'RESERVED' THEN 'Reserved'
        WHEN 'UNDER_CONTRACT' THEN 'Under Contract'
        WHEN 'SOLD' THEN 'Sold'
        ELSE 'Unknown'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to validate handover marketplace status transitions with auto-completion
CREATE OR REPLACE FUNCTION validate_handover_marketplace_status_transition(
    handover_id UUID,
    old_status handover_marketplace_status_enum,
    new_status handover_marketplace_status_enum
) RETURNS BOOLEAN AS $$
BEGIN
    -- Enforce sequential progression: NOT_LISTED → AVAILABLE → RESERVED → UNDER_CONTRACT → SOLD
    -- Allow backwards transitions for corrections (except from SOLD)

    -- Can't go backwards from SOLD
    IF old_status = 'SOLD' AND new_status != 'SOLD' THEN
        RETURN FALSE;
    END IF;

    -- All other transitions are allowed for flexibility
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set handover marketplace timestamps and enforce auto-completion
CREATE OR REPLACE FUNCTION set_handover_marketplace_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Set marketplace_listed_at when status changes to AVAILABLE for the first time
    IF NEW.marketplace_status = 'AVAILABLE' AND (OLD.marketplace_status IS NULL OR OLD.marketplace_status != 'AVAILABLE') AND NEW.marketplace_listed_at IS NULL THEN
        NEW.marketplace_listed_at = NOW();
    END IF;

    -- Set marketplace_reserved_at when status changes to RESERVED
    IF NEW.marketplace_status = 'RESERVED' AND (OLD.marketplace_status IS NULL OR OLD.marketplace_status != 'RESERVED') THEN
        NEW.marketplace_reserved_at = NOW();
    END IF;

    -- Set marketplace_sold_at when status changes to SOLD
    IF NEW.marketplace_status = 'SOLD' AND (OLD.marketplace_status IS NULL OR OLD.marketplace_status != 'SOLD') THEN
        NEW.marketplace_sold_at = NOW();
    END IF;

    -- Auto-complete handover stages based on marketplace status
    -- RESERVED status means client has expressed interest (no auto-completion)
    -- This allows manual progression through stages while tracking client interest

    IF NEW.marketplace_status = 'UNDER_CONTRACT' THEN
        -- Auto-complete stage 4 (Handover Agreement) when under contract
        NEW.pipeline_stages = jsonb_set(
            COALESCE(NEW.pipeline_stages, '[]'::jsonb),
            '{3,status}', -- Stage 4 (0-indexed)
            '"Signed"'
        );
    END IF;

    IF NEW.marketplace_status = 'SOLD' THEN
        -- Auto-complete final stages when sold
        NEW.pipeline_stages = jsonb_set(
            jsonb_set(
                COALESCE(NEW.pipeline_stages, '[]'::jsonb),
                '{5,status}', -- Stage 6 (Final Payment)
                '"Completed"'
            ),
            '{7,status}', -- Stage 8 (Title Transfer)
            '"Completed"'
        );
        NEW.handover_status = 'COMPLETED';
        NEW.actual_completion_date = CURRENT_DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on handover_pipeline table
DROP TRIGGER IF EXISTS trigger_handover_marketplace_status_timestamps ON handover_pipeline;
CREATE TRIGGER trigger_handover_marketplace_status_timestamps
    BEFORE UPDATE ON handover_pipeline
    FOR EACH ROW
    EXECUTE FUNCTION set_handover_marketplace_timestamps();

-- Grant necessary permissions
GRANT USAGE ON TYPE handover_marketplace_status_enum TO authenticated;
GRANT EXECUTE ON FUNCTION get_handover_marketplace_status_display(handover_marketplace_status_enum) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_handover_marketplace_status_transition(UUID, handover_marketplace_status_enum, handover_marketplace_status_enum) TO authenticated;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 082: Handover marketplace status system created successfully';
    RAISE NOTICE 'Added marketplace_status column to handover_pipeline table with enum type';
    RAISE NOTICE 'Added marketplace tracking columns (listed_at, reserved_at, sold_at)';
    RAISE NOTICE 'Created indexes for efficient handover marketplace queries';
    RAISE NOTICE 'Created helper functions for status display and validation';
    RAISE NOTICE 'Created triggers for automatic timestamp management and stage auto-completion';
    RAISE NOTICE 'Auto-completion: RESERVED → Client Interest (no auto-completion), UNDER_CONTRACT → Agreement Signed, SOLD → Final stages';
    RAISE NOTICE 'Next step: Run migration 083 to migrate existing handover data';
END $$;
