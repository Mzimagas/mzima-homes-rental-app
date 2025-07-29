-- Migration 012: Add Emergency Contact Fields to Tenants Table
-- This migration adds emergency/next of kin contact information to the tenants table

-- Add emergency contact fields to tenants table
ALTER TABLE tenants 
ADD COLUMN emergency_contact_name TEXT,
ADD COLUMN emergency_contact_phone TEXT,
ADD COLUMN emergency_contact_relationship TEXT,
ADD COLUMN emergency_contact_email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN tenants.emergency_contact_name IS 'Full name of emergency contact/next of kin';
COMMENT ON COLUMN tenants.emergency_contact_phone IS 'Phone number of emergency contact';
COMMENT ON COLUMN tenants.emergency_contact_relationship IS 'Relationship to tenant (e.g., Mother, Father, Sister, Brother, Spouse, Friend)';
COMMENT ON COLUMN tenants.emergency_contact_email IS 'Email address of emergency contact (optional)';

-- Create index for emergency contact searches (optional but useful for reporting)
CREATE INDEX IF NOT EXISTS idx_tenants_emergency_contact_name ON tenants(emergency_contact_name);
CREATE INDEX IF NOT EXISTS idx_tenants_emergency_contact_phone ON tenants(emergency_contact_phone);

-- Add constraint to ensure emergency contact phone follows basic format if provided
ALTER TABLE tenants 
ADD CONSTRAINT check_emergency_contact_phone_format 
CHECK (
  emergency_contact_phone IS NULL OR 
  emergency_contact_phone ~ '^\+?[0-9\s\-\(\)]+$'
);

-- Add constraint to ensure emergency contact email is valid if provided
ALTER TABLE tenants 
ADD CONSTRAINT check_emergency_contact_email_format 
CHECK (
  emergency_contact_email IS NULL OR 
  emergency_contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 012: Emergency contact fields added to tenants table';
  RAISE NOTICE 'Added fields: emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, emergency_contact_email';
  RAISE NOTICE 'Added validation constraints for phone and email formats';
  RAISE NOTICE 'Added indexes for emergency contact name and phone searches';
END $$;
