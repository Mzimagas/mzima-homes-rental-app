-- 031: Add alternate_phone to tenants

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT;

COMMENT ON COLUMN tenants.alternate_phone IS 'Optional alternate phone number for the tenant';

