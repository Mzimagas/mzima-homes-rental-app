-- 042: Add comprehensive land property columns to properties table
-- This migration adds all the land-specific columns that the UI expects

-- 1) Area and size columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_area_sqm DECIMAL(12,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_area_acres DECIMAL(10,4);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS frontage_meters DECIMAL(8,2);

-- 2) Legal and zoning columns
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zoning_classification TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS title_deed_number TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS survey_plan_number TEXT;

-- 3) Development and permits
CREATE TYPE IF NOT EXISTS development_permit_status_enum AS ENUM (
  'APPROVED', 'PENDING', 'NOT_REQUIRED', 'DENIED'
);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS development_permit_status development_permit_status_enum;

-- 4) Utilities and infrastructure
ALTER TABLE properties ADD COLUMN IF NOT EXISTS electricity_available BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS water_available BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sewer_available BOOLEAN DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS internet_available BOOLEAN DEFAULT FALSE;

-- 5) Access and physical characteristics
ALTER TABLE properties ADD COLUMN IF NOT EXISTS road_access_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS topography TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS soil_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS drainage_status TEXT;

-- 6) Pricing and commercial information
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sale_price_kes DECIMAL(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lease_price_per_sqm_kes DECIMAL(10,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lease_duration_years INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_negotiable BOOLEAN DEFAULT TRUE;

-- 7) Additional descriptive fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS development_potential TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS nearby_landmarks TEXT[];
ALTER TABLE properties ADD COLUMN IF NOT EXISTS environmental_restrictions TEXT[];
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_restrictions TEXT[];
ALTER TABLE properties ADD COLUMN IF NOT EXISTS easements TEXT[];

-- 8) Add constraints for data integrity
ALTER TABLE properties ADD CONSTRAINT chk_total_area_sqm_positive 
  CHECK (total_area_sqm IS NULL OR total_area_sqm > 0);

ALTER TABLE properties ADD CONSTRAINT chk_total_area_acres_positive 
  CHECK (total_area_acres IS NULL OR total_area_acres > 0);

ALTER TABLE properties ADD CONSTRAINT chk_frontage_meters_positive 
  CHECK (frontage_meters IS NULL OR frontage_meters > 0);

ALTER TABLE properties ADD CONSTRAINT chk_sale_price_positive 
  CHECK (sale_price_kes IS NULL OR sale_price_kes > 0);

ALTER TABLE properties ADD CONSTRAINT chk_lease_price_positive 
  CHECK (lease_price_per_sqm_kes IS NULL OR lease_price_per_sqm_kes > 0);

ALTER TABLE properties ADD CONSTRAINT chk_lease_duration_positive 
  CHECK (lease_duration_years IS NULL OR lease_duration_years > 0);

-- 9) Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_properties_total_area_acres ON properties(total_area_acres) 
  WHERE total_area_acres IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_total_area_sqm ON properties(total_area_sqm) 
  WHERE total_area_sqm IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_zoning ON properties(zoning_classification) 
  WHERE zoning_classification IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_sale_price ON properties(sale_price_kes) 
  WHERE sale_price_kes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_lease_price ON properties(lease_price_per_sqm_kes) 
  WHERE lease_price_per_sqm_kes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_development_permit ON properties(development_permit_status) 
  WHERE development_permit_status IS NOT NULL;

-- 10) Add helpful comments
COMMENT ON COLUMN properties.total_area_sqm IS 'Total property area in square meters';
COMMENT ON COLUMN properties.total_area_acres IS 'Total property area in acres (converted from hectares or manually entered)';
COMMENT ON COLUMN properties.frontage_meters IS 'Property frontage in meters';
COMMENT ON COLUMN properties.zoning_classification IS 'Zoning classification (Residential, Commercial, Industrial, etc.)';
COMMENT ON COLUMN properties.title_deed_number IS 'Official title deed number';
COMMENT ON COLUMN properties.survey_plan_number IS 'Survey plan reference number';
COMMENT ON COLUMN properties.development_permit_status IS 'Status of development permit application';
COMMENT ON COLUMN properties.electricity_available IS 'Whether electricity is available on the property';
COMMENT ON COLUMN properties.water_available IS 'Whether water is available on the property';
COMMENT ON COLUMN properties.sewer_available IS 'Whether sewer connection is available';
COMMENT ON COLUMN properties.internet_available IS 'Whether internet connectivity is available';
COMMENT ON COLUMN properties.road_access_type IS 'Type of road access (Tarmac, Murram, Gravel, etc.)';
COMMENT ON COLUMN properties.topography IS 'Property topography description';
COMMENT ON COLUMN properties.soil_type IS 'Soil type classification';
COMMENT ON COLUMN properties.drainage_status IS 'Drainage characteristics of the property';
COMMENT ON COLUMN properties.sale_price_kes IS 'Property sale price in Kenyan Shillings';
COMMENT ON COLUMN properties.lease_price_per_sqm_kes IS 'Lease price per square meter in KES';
COMMENT ON COLUMN properties.lease_duration_years IS 'Lease duration in years';
COMMENT ON COLUMN properties.price_negotiable IS 'Whether the price is negotiable';
COMMENT ON COLUMN properties.development_potential IS 'Description of development potential';
COMMENT ON COLUMN properties.nearby_landmarks IS 'Array of nearby landmarks';
COMMENT ON COLUMN properties.environmental_restrictions IS 'Array of environmental restrictions';
COMMENT ON COLUMN properties.building_restrictions IS 'Array of building restrictions and covenants';
COMMENT ON COLUMN properties.easements IS 'Array of easements affecting the property';

-- 11) Create a function to auto-convert between sqm and acres
CREATE OR REPLACE FUNCTION sync_property_area_units()
RETURNS TRIGGER AS $$
BEGIN
  -- If total_area_sqm is updated, calculate total_area_acres
  IF NEW.total_area_sqm IS DISTINCT FROM OLD.total_area_sqm AND NEW.total_area_sqm IS NOT NULL THEN
    NEW.total_area_acres := ROUND((NEW.total_area_sqm / 4047.0)::NUMERIC, 4);
  END IF;
  
  -- If total_area_acres is updated, calculate total_area_sqm
  IF NEW.total_area_acres IS DISTINCT FROM OLD.total_area_acres AND NEW.total_area_acres IS NOT NULL THEN
    NEW.total_area_sqm := ROUND((NEW.total_area_acres * 4047.0)::NUMERIC, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12) Create trigger to auto-sync area units
DROP TRIGGER IF EXISTS trigger_sync_property_area_units ON properties;
CREATE TRIGGER trigger_sync_property_area_units
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION sync_property_area_units();

-- 13) Update the property type comment to reflect new land capabilities
COMMENT ON COLUMN properties.property_type IS 'Property type: HOME, HOSTEL, STALL for rentals; RESIDENTIAL_LAND, COMMERCIAL_LAND, AGRICULTURAL_LAND, MIXED_USE_LAND for land sales/leases with full land details support';

-- 14) Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 042: Land property columns added successfully';
  RAISE NOTICE 'Added area columns: total_area_sqm, total_area_acres, frontage_meters';
  RAISE NOTICE 'Added legal columns: zoning_classification, title_deed_number, survey_plan_number';
  RAISE NOTICE 'Added utility columns: electricity_available, water_available, sewer_available, internet_available';
  RAISE NOTICE 'Added access columns: road_access_type, topography, soil_type, drainage_status';
  RAISE NOTICE 'Added pricing columns: sale_price_kes, lease_price_per_sqm_kes, lease_duration_years';
  RAISE NOTICE 'Added descriptive columns: development_potential, nearby_landmarks, environmental_restrictions';
  RAISE NOTICE 'Created auto-sync trigger for area unit conversions';
  RAISE NOTICE 'Land property workflow is now fully supported';
END $$;
