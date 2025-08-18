-- 063: Add handover status columns to properties table
-- This migration adds handover tracking functionality directly to the properties table

-- Create handover status enum
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
COMMENT ON COLUMN properties.handover_status IS 'Current handover status of the property (PENDING, IN_PROGRESS, COMPLETED)';
COMMENT ON COLUMN properties.handover_date IS 'Date when handover was completed (set automatically when status becomes COMPLETED)';

-- Create index for efficient handover status queries
CREATE INDEX IF NOT EXISTS idx_properties_handover_status ON properties(handover_status);
CREATE INDEX IF NOT EXISTS idx_properties_handover_date ON properties(handover_date) WHERE handover_date IS NOT NULL;

-- Create trigger function to automatically set handover_date when status becomes COMPLETED
CREATE OR REPLACE FUNCTION set_handover_date()
RETURNS TRIGGER AS $$
BEGIN
    -- If handover_status is being set to COMPLETED and handover_date is not already set
    IF NEW.handover_status = 'COMPLETED' AND (OLD.handover_status != 'COMPLETED' OR OLD.handover_status IS NULL) THEN
        NEW.handover_date = CURRENT_DATE;
    -- If handover_status is being changed from COMPLETED to something else, clear the date
    ELSIF NEW.handover_status != 'COMPLETED' AND OLD.handover_status = 'COMPLETED' THEN
        NEW.handover_date = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically manage handover_date
DROP TRIGGER IF EXISTS trigger_set_handover_date ON properties;
CREATE TRIGGER trigger_set_handover_date
    BEFORE UPDATE ON properties
    FOR EACH ROW
    WHEN (OLD.handover_status IS DISTINCT FROM NEW.handover_status)
    EXECUTE FUNCTION set_handover_date();

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 063: Added handover_status and handover_date columns to properties table';
  RAISE NOTICE 'Created enum: handover_status_enum (PENDING, IN_PROGRESS, COMPLETED)';
  RAISE NOTICE 'Created trigger: trigger_set_handover_date to automatically manage handover_date';
  RAISE NOTICE 'Handover functionality ready for implementation';
END $$;
