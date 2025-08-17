-- Quick Property Type Migration Script
-- Run this directly in your Supabase SQL editor or via psql

-- 1) Update property_type enum to include land categories
DO $$ BEGIN
  -- Drop existing enum if it exists and recreate with land types
  DROP TYPE IF EXISTS property_type_enum CASCADE;
  CREATE TYPE property_type_enum AS ENUM (
    'HOME',           -- Residential properties (existing)
    'HOSTEL',         -- Shared accommodation (existing)
    'STALL',          -- Commercial/retail spaces (existing)
    'RESIDENTIAL_LAND', -- Land for residential development
    'COMMERCIAL_LAND',  -- Land for commercial development
    'AGRICULTURAL_LAND', -- Agricultural/farming land
    'MIXED_USE_LAND'    -- Mixed-use development land
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Add property_type column with proper constraints
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS property_type property_type_enum NOT NULL DEFAULT 'HOME';

-- 3) Add constraints and validation (with proper error handling)
DO $$ BEGIN
  ALTER TABLE properties 
    ADD CONSTRAINT chk_property_type_valid 
    CHECK (property_type IN ('HOME', 'HOSTEL', 'STALL', 'RESIDENTIAL_LAND', 'COMMERCIAL_LAND', 'AGRICULTURAL_LAND', 'MIXED_USE_LAND'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Create index for efficient property type filtering
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_type_published ON properties(property_type, is_published) WHERE disabled_at IS NULL;

-- 5) Update create_property_with_owner function to support property types
CREATE OR REPLACE FUNCTION create_property_with_owner(
  property_name TEXT,
  property_address TEXT,
  property_type property_type_enum DEFAULT 'HOME',
  owner_user_id UUID DEFAULT auth.uid()
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_property_id UUID;
BEGIN
  IF owner_user_id IS NULL THEN RAISE EXCEPTION 'User must be authenticated'; END IF;
  IF trim(property_name) = '' THEN RAISE EXCEPTION 'Property name is required'; END IF;
  IF trim(property_address) = '' THEN RAISE EXCEPTION 'Property address is required'; END IF;

  INSERT INTO properties (name, physical_address, property_type, landlord_id, created_at, updated_at)
  VALUES (trim(property_name), trim(property_address), property_type, owner_user_id, NOW(), NOW())
  RETURNING id INTO new_property_id;

  INSERT INTO property_users (property_id, user_id, role, status, invited_by, accepted_at)
  VALUES (new_property_id, owner_user_id, 'OWNER', 'ACTIVE', owner_user_id, NOW());

  RETURN new_property_id;
END $$;

-- 6) Update view_public_vacant_units to include property_type filtering
CREATE OR REPLACE VIEW view_public_vacant_units AS
SELECT 
  u.id as unit_id,
  u.unit_label,
  u.monthly_rent_kes,
  u.deposit_kes,
  u.available_from,
  p.id as property_id,
  p.name as property_name,
  p.physical_address,
  p.property_type,
  -- First photo URL
  (SELECT url FROM units_media um 
   WHERE um.unit_id = u.id AND um.type = 'PHOTO' 
   ORDER BY um.order_index LIMIT 1) as thumbnail_url
FROM units u
JOIN properties p ON u.property_id = p.id
WHERE u.is_active = true
  AND p.is_published = true
  AND p.disabled_at IS NULL
  AND u.disabled_at IS NULL
  AND p.property_type IN ('HOME', 'HOSTEL', 'STALL'); -- Only rental properties

-- 7) Add comment for future land expansion
COMMENT ON COLUMN properties.property_type IS 'Property type: HOME, HOSTEL, STALL for rentals; RESIDENTIAL_LAND, COMMERCIAL_LAND, AGRICULTURAL_LAND, MIXED_USE_LAND for land sales/leases';

-- 8) Verify the migration worked
DO $$ 
DECLARE 
  property_count INTEGER;
  total_properties INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_properties FROM properties;
  SELECT COUNT(*) INTO property_count FROM properties WHERE property_type IS NOT NULL;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Total properties: %', total_properties;
  RAISE NOTICE 'Properties with property_type: %', property_count;
  
  IF property_count = total_properties THEN
    RAISE NOTICE '✅ All properties have property_type set correctly';
  ELSE
    RAISE WARNING '⚠️ Some properties may not have property_type set';
  END IF;
END $$;
