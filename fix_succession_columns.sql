-- Fix missing succession columns in purchase_pipeline table

-- Add succession choice field to track if this is a succession purchase
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS is_succession_purchase BOOLEAN DEFAULT FALSE;

-- Add succession-specific fields
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS deceased_owner_name TEXT,
ADD COLUMN IF NOT EXISTS deceased_owner_id TEXT,
ADD COLUMN IF NOT EXISTS date_of_death DATE,
ADD COLUMN IF NOT EXISTS succession_court TEXT,
ADD COLUMN IF NOT EXISTS succession_case_number TEXT,
ADD COLUMN IF NOT EXISTS succession_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN purchase_pipeline.is_succession_purchase IS 'Whether this purchase involves succession/inheritance processes';
COMMENT ON COLUMN purchase_pipeline.deceased_owner_name IS 'Name of the deceased property owner';
COMMENT ON COLUMN purchase_pipeline.deceased_owner_id IS 'ID/Passport number of the deceased owner';
COMMENT ON COLUMN purchase_pipeline.date_of_death IS 'Date when the original owner passed away';
COMMENT ON COLUMN purchase_pipeline.succession_court IS 'Court handling the succession case';
COMMENT ON COLUMN purchase_pipeline.succession_case_number IS 'Official succession case number';
COMMENT ON COLUMN purchase_pipeline.succession_notes IS 'Additional notes about the succession process';

-- Create index for succession filtering
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_succession ON purchase_pipeline(is_succession_purchase);

-- Update any existing records to have default succession status
UPDATE purchase_pipeline 
SET is_succession_purchase = FALSE 
WHERE is_succession_purchase IS NULL;
