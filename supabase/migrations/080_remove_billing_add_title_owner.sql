-- Migration 080: Remove billing configuration fields and add registered title owner
-- Description: Removes default_billing_day and default_align_billing_to_start columns and adds registered_title_owner field

-- Add registered_title_owner column to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS registered_title_owner TEXT;

-- Add comment for documentation
COMMENT ON COLUMN properties.registered_title_owner IS 'Full legal name(s) of the registered property owner(s) as they appear on the title deed. For multiple owners, names should be separated by commas.';

-- Remove billing configuration columns (these are no longer needed for land properties)
ALTER TABLE properties 
DROP COLUMN IF EXISTS default_billing_day,
DROP COLUMN IF EXISTS default_align_billing_to_start;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 080: Removed billing configuration fields and added registered_title_owner column to properties table';
END $$;
