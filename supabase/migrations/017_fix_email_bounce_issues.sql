-- Migration 017: Fix Email Bounce Issues
-- This migration addresses critical email bounce issues by:
-- 1. Fixing invalid default email addresses
-- 2. Adding email validation constraints
-- 3. Cleaning up existing invalid email data

-- Fix the invalid default email in notification_settings
ALTER TABLE notification_settings 
ALTER COLUMN email_from_email SET DEFAULT 'noreply@mzimahomes.com';

-- Update any existing records with the invalid default
UPDATE notification_settings 
SET email_from_email = 'noreply@mzimahomes.com' 
WHERE email_from_email = 'noreply@example.com' 
   OR email_from_email LIKE '%@example.com'
   OR email_from_email LIKE '%@test.%'
   OR email_from_email LIKE 'test@%';

-- Add constraint to prevent invalid email domains in notification settings
ALTER TABLE notification_settings 
ADD CONSTRAINT check_valid_from_email 
CHECK (
  email_from_email IS NULL OR 
  (
    email_from_email ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    AND email_from_email NOT LIKE '%@example.%'
    AND email_from_email NOT LIKE '%@test.%'
    AND email_from_email NOT LIKE 'test@%'
    AND email_from_email NOT LIKE '%@localhost%'
    AND email_from_email NOT LIKE '%@invalid%'
    AND email_from_email NOT LIKE '%@local%'
  )
);

-- Clean up any test emails in tenants table
UPDATE tenants 
SET email = NULL 
WHERE email LIKE '%@example.com'
   OR email LIKE '%@test.%'
   OR email LIKE 'test@%'
   OR email LIKE '%@localhost%'
   OR email LIKE '%@invalid%'
   OR email LIKE '%@local%';

-- Clean up emergency contact emails
UPDATE tenants 
SET emergency_contact_email = NULL 
WHERE emergency_contact_email LIKE '%@example.com'
   OR emergency_contact_email LIKE '%@test.%'
   OR emergency_contact_email LIKE 'test@%'
   OR emergency_contact_email LIKE '%@localhost%'
   OR emergency_contact_email LIKE '%@invalid%'
   OR emergency_contact_email LIKE '%@local%';

-- Add enhanced email validation constraint to tenants table
ALTER TABLE tenants 
DROP CONSTRAINT IF EXISTS check_emergency_contact_email_format;

ALTER TABLE tenants 
ADD CONSTRAINT check_tenant_email_format 
CHECK (
  email IS NULL OR 
  (
    email ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    AND email NOT LIKE '%@example.%'
    AND email NOT LIKE '%@test.%'
    AND email NOT LIKE 'test@%'
    AND email NOT LIKE '%@localhost%'
    AND email NOT LIKE '%@invalid%'
    AND email NOT LIKE '%@local%'
  )
);

ALTER TABLE tenants 
ADD CONSTRAINT check_emergency_contact_email_format 
CHECK (
  emergency_contact_email IS NULL OR 
  (
    emergency_contact_email ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    AND emergency_contact_email NOT LIKE '%@example.%'
    AND emergency_contact_email NOT LIKE '%@test.%'
    AND emergency_contact_email NOT LIKE 'test@%'
    AND emergency_contact_email NOT LIKE '%@localhost%'
    AND emergency_contact_email NOT LIKE '%@invalid%'
    AND emergency_contact_email NOT LIKE '%@local%'
  )
);

-- Create a function to validate emails before sending
CREATE OR REPLACE FUNCTION validate_email_for_sending(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return false for null or empty emails
  IF email_address IS NULL OR trim(email_address) = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Check basic email format
  IF NOT email_address ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$' THEN
    RETURN FALSE;
  END IF;
  
  -- Check for invalid domains that cause bounces
  IF email_address LIKE '%@example.%' 
     OR email_address LIKE '%@test.%'
     OR email_address LIKE 'test@%'
     OR email_address LIKE '%@localhost%'
     OR email_address LIKE '%@invalid%'
     OR email_address LIKE '%@local%'
     OR email_address LIKE '%.example'
     OR email_address LIKE '%.test'
     OR email_address LIKE '%.invalid'
     OR email_address LIKE '%.local' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create a view for valid email addresses only
CREATE OR REPLACE VIEW valid_tenant_emails AS
SELECT 
  t.id,
  t.full_name,
  t.email,
  t.emergency_contact_name,
  t.emergency_contact_email
FROM tenants t
WHERE validate_email_for_sending(t.email) = TRUE
   OR validate_email_for_sending(t.emergency_contact_email) = TRUE;

-- Add comment explaining the migration
COMMENT ON CONSTRAINT check_valid_from_email ON notification_settings IS 
'Prevents invalid email domains that cause bounces (example.com, test domains, localhost, etc.)';

COMMENT ON CONSTRAINT check_tenant_email_format ON tenants IS 
'Enhanced email validation to prevent bounce-causing email addresses';

COMMENT ON CONSTRAINT check_emergency_contact_email_format ON tenants IS 
'Enhanced email validation for emergency contacts to prevent bounce-causing email addresses';

COMMENT ON FUNCTION validate_email_for_sending(TEXT) IS 
'Validates email addresses before sending to prevent bounces from invalid domains';

-- Migration completed successfully
-- This migration fixes email bounce issues by:
-- 1. Updating invalid default email addresses
-- 2. Adding validation constraints
-- 3. Cleaning up test email data
-- 4. Creating validation functions
