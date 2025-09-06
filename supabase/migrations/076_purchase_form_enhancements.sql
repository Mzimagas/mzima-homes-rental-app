-- 076: Purchase Form Enhancements
-- Add succession status tracking and broker information

-- Add succession status to properties table if not exists
-- This helps filter properties for purchase linking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'properties' AND column_name = 'succession_status') THEN
        ALTER TABLE properties ADD COLUMN succession_status TEXT DEFAULT 'NOT_STARTED' 
        CHECK (succession_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'));
    END IF;
END $$;

-- Add broker information to purchase_pipeline table
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS broker_name TEXT,
ADD COLUMN IF NOT EXISTS broker_contact TEXT;

-- Remove seller_email column if it exists (replaced with broker info)
ALTER TABLE purchase_pipeline 
DROP COLUMN IF EXISTS seller_email;

-- Add comments for documentation
COMMENT ON COLUMN properties.succession_status IS 'Status of succession process for the property';
COMMENT ON COLUMN purchase_pipeline.broker_name IS 'Name of the property broker/agent';
COMMENT ON COLUMN purchase_pipeline.broker_contact IS 'Contact information for the property broker/agent';

-- Create index for succession status filtering
CREATE INDEX IF NOT EXISTS idx_properties_succession_status ON properties(succession_status);

-- Update any existing records to have default succession status
UPDATE properties 
SET succession_status = 'NOT_STARTED' 
WHERE succession_status IS NULL;
