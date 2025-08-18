-- 062: Add handover columns directly to properties table
-- This migration adds handover tracking columns directly to the properties table
-- since the separate property_sale_info table was dropped in migration 061

-- Create handover status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE handover_status_enum AS ENUM (
        'PENDING',
        'IN_PROGRESS', 
        'COMPLETED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add handover columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS handover_status handover_status_enum DEFAULT 'PENDING';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS handover_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN properties.handover_status IS 'Current handover status of the property';
COMMENT ON COLUMN properties.handover_date IS 'Date when handover was completed (if applicable)';

-- Create index for efficient handover status queries
CREATE INDEX IF NOT EXISTS idx_properties_handover_status ON properties(handover_status);

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 062: Added handover_status and handover_date columns to properties table';
END $$;
