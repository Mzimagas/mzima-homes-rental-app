-- Migration 079: Add marketing_description column to properties table
-- Description: Adds a dedicated marketing description field for client-facing property descriptions

-- Add marketing_description column to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS marketing_description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN properties.marketing_description IS 'Client-facing marketing description highlighting property features and selling points. Displayed in marketplace and property details.';

-- Create index for text search if needed in the future
-- CREATE INDEX IF NOT EXISTS idx_properties_marketing_description_search 
-- ON properties USING gin(to_tsvector('english', marketing_description)) 
-- WHERE marketing_description IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 079: Added marketing_description column to properties table';
END $$;
