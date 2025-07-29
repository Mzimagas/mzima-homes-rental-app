-- Migration 011: Update Meter Types and Add Water Meter Management
-- Simplify KPLC meter types and add comprehensive water meter management

-- Step 1: Investigate current meter_type column definition
DO $$
DECLARE
  constraint_name TEXT;
  column_type TEXT;
BEGIN
  -- Check if meter_type has a CHECK constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'units'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%meter_type%'
  LIMIT 1;

  -- Get column data type
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_name = 'units' AND column_name = 'meter_type';

  RAISE NOTICE 'Current meter_type column type: %', column_type;
  RAISE NOTICE 'Current meter_type constraint: %', COALESCE(constraint_name, 'None found');
END $$;

-- Step 2: Add new columns for water meter management
ALTER TABLE units ADD COLUMN IF NOT EXISTS water_meter_type TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS water_meter_number TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS shared_meter_id UUID;
ALTER TABLE units ADD COLUMN IF NOT EXISTS shared_meter_type TEXT;

-- Step 3: Create shared_meters table for handling shared meter scenarios
CREATE TABLE IF NOT EXISTS shared_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  meter_type TEXT NOT NULL,
  meter_number TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create junction table for units sharing meters
CREATE TABLE IF NOT EXISTS unit_shared_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  shared_meter_id UUID REFERENCES shared_meters(id) ON DELETE CASCADE,
  allocation_percentage DECIMAL(5,2) DEFAULT 100.00, -- For cost allocation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(unit_id, shared_meter_id)
);

-- Step 5: Handle PostgreSQL ENUM migration using temporary column approach
DO $$
DECLARE
  token_count INTEGER;
  postpaid_count INTEGER;
  analog_count INTEGER;
  none_count INTEGER;
  total_count INTEGER;
  enum_name TEXT;
BEGIN
  -- Count existing meter types for logging
  SELECT COUNT(*) INTO token_count FROM units WHERE meter_type = 'TOKEN';
  SELECT COUNT(*) INTO postpaid_count FROM units WHERE meter_type = 'POSTPAID';
  SELECT COUNT(*) INTO analog_count FROM units WHERE meter_type = 'ANALOG';
  SELECT COUNT(*) INTO none_count FROM units WHERE meter_type = 'NONE';
  SELECT COUNT(*) INTO total_count FROM units;

  RAISE NOTICE 'Pre-migration meter type distribution:';
  RAISE NOTICE 'TOKEN: % units', token_count;
  RAISE NOTICE 'POSTPAID: % units', postpaid_count;
  RAISE NOTICE 'ANALOG: % units', analog_count;
  RAISE NOTICE 'NONE: % units', none_count;
  RAISE NOTICE 'Total units: %', total_count;

  -- Check if meter_type is an ENUM
  SELECT t.typname INTO enum_name
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_attribute a ON a.atttypid = t.oid
  JOIN pg_class c ON c.oid = a.attrelid
  WHERE c.relname = 'units' AND a.attname = 'meter_type'
  LIMIT 1;

  IF enum_name IS NOT NULL THEN
    RAISE NOTICE 'Found ENUM type for meter_type: %', enum_name;
  ELSE
    RAISE NOTICE 'meter_type is not an ENUM type';
  END IF;
END $$;

-- Step 6: Create new ENUM type with both old and new values for transition
DO $$
BEGIN
  -- Create temporary ENUM with all values (old + new)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meter_type_new') THEN
    CREATE TYPE meter_type_new AS ENUM ('TOKEN', 'POSTPAID', 'ANALOG', 'NONE', 'PREPAID', 'POSTPAID_ANALOGUE');
    RAISE NOTICE 'Created temporary ENUM type: meter_type_new';
  END IF;
END $$;

-- Step 7: Handle default value and change column to use temporary ENUM type
DO $$
DECLARE
  default_value TEXT;
BEGIN
  -- Check if there's a default value for meter_type column
  SELECT column_default INTO default_value
  FROM information_schema.columns
  WHERE table_name = 'units' AND column_name = 'meter_type';

  IF default_value IS NOT NULL THEN
    RAISE NOTICE 'Found default value for meter_type: %', default_value;
    -- Drop the default temporarily
    ALTER TABLE units ALTER COLUMN meter_type DROP DEFAULT;
    RAISE NOTICE 'Dropped default value for meter_type column';
  ELSE
    RAISE NOTICE 'No default value found for meter_type column';
  END IF;
END $$;

-- Change column to use temporary ENUM type
ALTER TABLE units ALTER COLUMN meter_type TYPE meter_type_new USING meter_type::text::meter_type_new;

-- Restore appropriate default value for the new ENUM type
ALTER TABLE units ALTER COLUMN meter_type SET DEFAULT 'PREPAID'::meter_type_new;

-- Step 8: Update existing meter_type values to new simplified system
-- Now we can safely update the values since the ENUM includes both old and new values
DO $$
DECLARE
  updated_count INTEGER;
  total_migrated INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting meter type data migration...';

  -- Migrate TOKEN to PREPAID
  UPDATE units SET meter_type = 'PREPAID'::meter_type_new WHERE meter_type = 'TOKEN'::meter_type_new;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_migrated := total_migrated + updated_count;
  RAISE NOTICE 'Migrated % TOKEN meters to PREPAID', updated_count;

  -- Migrate ANALOG to POSTPAID_ANALOGUE
  UPDATE units SET meter_type = 'POSTPAID_ANALOGUE'::meter_type_new WHERE meter_type = 'ANALOG'::meter_type_new;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_migrated := total_migrated + updated_count;
  RAISE NOTICE 'Migrated % ANALOG meters to POSTPAID_ANALOGUE', updated_count;

  -- POSTPAID becomes POSTPAID_ANALOGUE for consistency
  UPDATE units SET meter_type = 'POSTPAID_ANALOGUE'::meter_type_new WHERE meter_type = 'POSTPAID'::meter_type_new;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_migrated := total_migrated + updated_count;
  RAISE NOTICE 'Migrated % POSTPAID meters to POSTPAID_ANALOGUE', updated_count;

  -- NONE becomes PREPAID as default (most common in Kenya)
  UPDATE units SET meter_type = 'PREPAID'::meter_type_new WHERE meter_type = 'NONE'::meter_type_new;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_migrated := total_migrated + updated_count;
  RAISE NOTICE 'Migrated % NONE meters to PREPAID', updated_count;

  RAISE NOTICE 'Total units migrated: %', total_migrated;

  -- Check for any remaining unmigrated values
  SELECT COUNT(*) INTO updated_count FROM units
  WHERE meter_type NOT IN ('PREPAID'::meter_type_new, 'POSTPAID_ANALOGUE'::meter_type_new);

  IF updated_count > 0 THEN
    RAISE WARNING 'Found % units with unexpected meter_type values that need manual review:', updated_count;

    -- Set unexpected values to PREPAID as fallback
    UPDATE units SET meter_type = 'PREPAID'::meter_type_new
    WHERE meter_type NOT IN ('PREPAID'::meter_type_new, 'POSTPAID_ANALOGUE'::meter_type_new);
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Set % units with unexpected meter types to PREPAID as fallback', updated_count;
  ELSE
    RAISE NOTICE 'All meter types migrated successfully - no unexpected values found';
  END IF;

  RAISE NOTICE 'Meter type data migration completed successfully';
END $$;

-- Step 9: Create final ENUM type with only the new values
DO $$
BEGIN
  -- Create final ENUM with only new values
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meter_type_final') THEN
    CREATE TYPE meter_type_final AS ENUM ('PREPAID', 'POSTPAID_ANALOGUE');
    RAISE NOTICE 'Created final ENUM type: meter_type_final';
  END IF;
END $$;

-- Step 10: Change column to use final ENUM type and clean up
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Verify all data is valid before final type change
  SELECT COUNT(*) INTO invalid_count FROM units
  WHERE meter_type NOT IN ('PREPAID'::meter_type_new, 'POSTPAID_ANALOGUE'::meter_type_new);

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot change to final type: % units have invalid meter_type values', invalid_count;
  END IF;

  -- Drop default before changing type
  ALTER TABLE units ALTER COLUMN meter_type DROP DEFAULT;
  RAISE NOTICE 'Dropped default before final type change';

  -- Change to final ENUM type
  ALTER TABLE units ALTER COLUMN meter_type TYPE meter_type_final USING meter_type::text::meter_type_final;
  RAISE NOTICE 'Changed meter_type column to final ENUM type';

  -- Set final default value
  ALTER TABLE units ALTER COLUMN meter_type SET DEFAULT 'PREPAID'::meter_type_final;
  RAISE NOTICE 'Set final default value for meter_type';

  -- Drop temporary ENUM type
  DROP TYPE meter_type_new;
  RAISE NOTICE 'Dropped temporary ENUM type: meter_type_new';

  RAISE NOTICE 'ENUM migration completed successfully';
END $$;

-- Step 11: Add constraints for new columns
ALTER TABLE units ADD CONSTRAINT units_water_meter_type_check
  CHECK (water_meter_type IN ('DIRECT_TAVEVO', 'INTERNAL_SUBMETER'));

ALTER TABLE units ADD CONSTRAINT units_shared_meter_type_check
  CHECK (shared_meter_type IN ('KPLC', 'WATER'));

ALTER TABLE shared_meters ADD CONSTRAINT shared_meters_meter_type_check
  CHECK (meter_type IN ('KPLC_PREPAID', 'KPLC_POSTPAID_ANALOGUE', 'WATER_DIRECT_TAVEVO', 'WATER_INTERNAL_SUBMETER'));

-- Step 12: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_water_meter_type ON units(water_meter_type);
CREATE INDEX IF NOT EXISTS idx_units_shared_meter_id ON units(shared_meter_id);
CREATE INDEX IF NOT EXISTS idx_shared_meters_property_id ON shared_meters(property_id);
CREATE INDEX IF NOT EXISTS idx_unit_shared_meters_unit_id ON unit_shared_meters(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_shared_meters_shared_meter_id ON unit_shared_meters(shared_meter_id);

-- Step 13: Add RLS policies for new tables
ALTER TABLE shared_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_shared_meters ENABLE ROW LEVEL SECURITY;

-- RLS policies for shared_meters
CREATE POLICY "Users can view shared meters for their properties" ON shared_meters
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can create shared meters for their properties" ON shared_meters
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update shared meters for their properties" ON shared_meters
  FOR UPDATE USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete shared meters for their properties" ON shared_meters
  FOR DELETE USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

-- RLS policies for unit_shared_meters
CREATE POLICY "Users can view unit shared meters for their units" ON unit_shared_meters
  FOR SELECT USING (
    unit_id IN (
      SELECT u.id FROM units u 
      JOIN properties p ON u.property_id = p.id 
      WHERE p.landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can create unit shared meters for their units" ON unit_shared_meters
  FOR INSERT WITH CHECK (
    unit_id IN (
      SELECT u.id FROM units u 
      JOIN properties p ON u.property_id = p.id 
      WHERE p.landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update unit shared meters for their units" ON unit_shared_meters
  FOR UPDATE USING (
    unit_id IN (
      SELECT u.id FROM units u 
      JOIN properties p ON u.property_id = p.id 
      WHERE p.landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete unit shared meters for their units" ON unit_shared_meters
  FOR DELETE USING (
    unit_id IN (
      SELECT u.id FROM units u 
      JOIN properties p ON u.property_id = p.id 
      WHERE p.landlord_id = ANY(get_user_landlord_ids(auth.uid()))
    )
  );

-- Step 14: Create helper functions for shared meter management
CREATE OR REPLACE FUNCTION get_unit_shared_meters(p_unit_id UUID)
RETURNS TABLE (
  shared_meter_id UUID,
  meter_type TEXT,
  meter_number TEXT,
  description TEXT,
  allocation_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.meter_type,
    sm.meter_number,
    sm.description,
    usm.allocation_percentage
  FROM shared_meters sm
  JOIN unit_shared_meters usm ON sm.id = usm.shared_meter_id
  WHERE usm.unit_id = p_unit_id AND sm.is_active = true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_shared_meter(
  p_property_id UUID,
  p_meter_type TEXT,
  p_meter_number TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_shared_meter_id UUID;
BEGIN
  INSERT INTO shared_meters (property_id, meter_type, meter_number, description)
  VALUES (p_property_id, p_meter_type, p_meter_number, p_description)
  RETURNING id INTO v_shared_meter_id;
  
  RETURN v_shared_meter_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assign_unit_to_shared_meter(
  p_unit_id UUID,
  p_shared_meter_id UUID,
  p_allocation_percentage DECIMAL DEFAULT 100.00
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO unit_shared_meters (unit_id, shared_meter_id, allocation_percentage)
  VALUES (p_unit_id, p_shared_meter_id, p_allocation_percentage)
  ON CONFLICT (unit_id, shared_meter_id) 
  DO UPDATE SET allocation_percentage = p_allocation_percentage;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shared_meters_updated_at 
  BEFORE UPDATE ON shared_meters 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 16: Add comments for documentation
COMMENT ON TABLE shared_meters IS 'Stores shared meters that can be used by multiple units';
COMMENT ON TABLE unit_shared_meters IS 'Junction table linking units to shared meters with allocation percentages';
COMMENT ON COLUMN units.water_meter_type IS 'Type of water meter: DIRECT_TAVEVO or INTERNAL_SUBMETER';
COMMENT ON COLUMN units.water_meter_number IS 'Water meter identification number';
COMMENT ON COLUMN units.shared_meter_id IS 'Reference to shared meter if unit uses one';
COMMENT ON COLUMN units.shared_meter_type IS 'Type of shared meter: KPLC or WATER';

-- Step 17: Final validation and summary
DO $$
DECLARE
  prepaid_count INTEGER;
  postpaid_count INTEGER;
  total_count INTEGER;
  water_meter_count INTEGER;
  shared_meter_count INTEGER;
BEGIN
  -- Count final meter type distribution
  SELECT COUNT(*) INTO prepaid_count FROM units WHERE meter_type = 'PREPAID';
  SELECT COUNT(*) INTO postpaid_count FROM units WHERE meter_type = 'POSTPAID_ANALOGUE';
  SELECT COUNT(*) INTO total_count FROM units;
  SELECT COUNT(*) INTO water_meter_count FROM units WHERE water_meter_type IS NOT NULL;
  SELECT COUNT(*) INTO shared_meter_count FROM shared_meters;

  RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE 'Final meter type distribution:';
  RAISE NOTICE 'PREPAID: % units', prepaid_count;
  RAISE NOTICE 'POSTPAID_ANALOGUE: % units', postpaid_count;
  RAISE NOTICE 'Total units: %', total_count;
  RAISE NOTICE 'Units with water meters: %', water_meter_count;
  RAISE NOTICE 'Shared meters created: %', shared_meter_count;

  -- Validate that all units have valid meter types
  IF (prepaid_count + postpaid_count) = total_count THEN
    RAISE NOTICE '✅ All units have valid meter types';
  ELSE
    RAISE WARNING '❌ Some units may have invalid meter types';
  END IF;

  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE '✅ KPLC meter types simplified to PREPAID and POSTPAID_ANALOGUE';
  RAISE NOTICE '✅ Water meter management fields added';
  RAISE NOTICE '✅ Shared meter infrastructure created';
  RAISE NOTICE '✅ RLS policies applied';
  RAISE NOTICE '✅ Helper functions created';
  RAISE NOTICE '✅ Indexes added for performance';
  RAISE NOTICE '=== READY FOR FRONTEND DEPLOYMENT ===';
END $$;
