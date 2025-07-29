-- Migration 015: Migrate Existing Landlord Relationships to Multi-User System
-- This migration converts existing landlord-property relationships to OWNER entries in property_users

-- Step 1: Create a temporary function to migrate landlord relationships
CREATE OR REPLACE FUNCTION migrate_landlord_to_property_users()
RETURNS TABLE(
  property_id UUID,
  landlord_id UUID,
  migration_status TEXT,
  property_user_id UUID
) AS $$
DECLARE
  property_record RECORD;
  new_property_user_id UUID;
  migration_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting migration of landlord relationships to property_users system...';
  
  -- Loop through all properties with landlord_id
  FOR property_record IN 
    SELECT p.id as prop_id, p.landlord_id, p.name as prop_name
    FROM properties p 
    WHERE p.landlord_id IS NOT NULL
  LOOP
    BEGIN
      -- Check if this landlord-property relationship already exists in property_users
      IF EXISTS (
        SELECT 1 FROM property_users pu 
        WHERE pu.property_id = property_record.prop_id 
        AND pu.user_id = property_record.landlord_id
      ) THEN
        -- Relationship already exists, skip
        property_id := property_record.prop_id;
        landlord_id := property_record.landlord_id;
        migration_status := 'ALREADY_EXISTS';
        property_user_id := (
          SELECT id FROM property_users 
          WHERE property_id = property_record.prop_id 
          AND user_id = property_record.landlord_id
        );
        
        RAISE NOTICE 'Property % already has user relationship for landlord %', 
          property_record.prop_name, property_record.landlord_id;
      ELSE
        -- Create new property_users entry for this landlord as OWNER
        INSERT INTO property_users (
          property_id,
          user_id,
          role,
          status,
          accepted_at,
          invited_by,
          invited_at
        ) VALUES (
          property_record.prop_id,
          property_record.landlord_id,
          'OWNER',
          'ACTIVE',
          NOW(), -- Auto-accept since they're existing landlords
          property_record.landlord_id, -- Self-invited
          NOW()
        ) RETURNING id INTO new_property_user_id;
        
        property_id := property_record.prop_id;
        landlord_id := property_record.landlord_id;
        migration_status := 'MIGRATED';
        property_user_id := new_property_user_id;
        migration_count := migration_count + 1;
        
        RAISE NOTICE 'Migrated property % (%) - landlord % is now OWNER with ID %', 
          property_record.prop_name, property_record.prop_id, 
          property_record.landlord_id, new_property_user_id;
      END IF;
      
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other properties
      property_id := property_record.prop_id;
      landlord_id := property_record.landlord_id;
      migration_status := 'ERROR: ' || SQLERRM;
      property_user_id := NULL;
      
      RAISE WARNING 'Failed to migrate property % - landlord %: %', 
        property_record.prop_id, property_record.landlord_id, SQLERRM;
      
      RETURN NEXT;
    END;
  END LOOP;
  
  RAISE NOTICE 'Migration completed. Successfully migrated % landlord relationships', migration_count;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Execute the migration
DO $$
DECLARE
  migration_results RECORD;
  total_properties INTEGER;
  successful_migrations INTEGER := 0;
  existing_relationships INTEGER := 0;
  failed_migrations INTEGER := 0;
BEGIN
  -- Count total properties to migrate
  SELECT COUNT(*) INTO total_properties 
  FROM properties 
  WHERE landlord_id IS NOT NULL;
  
  RAISE NOTICE 'Found % properties with landlord_id to migrate', total_properties;
  
  -- Execute migration and count results
  FOR migration_results IN 
    SELECT * FROM migrate_landlord_to_property_users()
  LOOP
    CASE 
      WHEN migration_results.migration_status = 'MIGRATED' THEN
        successful_migrations := successful_migrations + 1;
      WHEN migration_results.migration_status = 'ALREADY_EXISTS' THEN
        existing_relationships := existing_relationships + 1;
      WHEN migration_results.migration_status LIKE 'ERROR:%' THEN
        failed_migrations := failed_migrations + 1;
    END CASE;
  END LOOP;
  
  -- Log migration summary
  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'Total properties: %', total_properties;
  RAISE NOTICE 'Successfully migrated: %', successful_migrations;
  RAISE NOTICE 'Already existed: %', existing_relationships;
  RAISE NOTICE 'Failed migrations: %', failed_migrations;
  RAISE NOTICE '========================';
  
  -- Verify migration results
  DECLARE
    property_users_count INTEGER;
    active_owners_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO property_users_count FROM property_users;
    SELECT COUNT(*) INTO active_owners_count 
    FROM property_users 
    WHERE role = 'OWNER' AND status = 'ACTIVE';
    
    RAISE NOTICE 'Verification: % total property_users entries', property_users_count;
    RAISE NOTICE 'Verification: % active OWNER entries', active_owners_count;
  END;
END $$;

-- Step 3: Create a view to show the migration results
CREATE OR REPLACE VIEW property_ownership_summary AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  p.landlord_id as original_landlord_id,
  l.full_name as landlord_name,
  l.email as landlord_email,
  pu.id as property_user_id,
  pu.user_id,
  pu.role,
  pu.status,
  pu.accepted_at,
  CASE 
    WHEN pu.id IS NOT NULL THEN 'MIGRATED'
    ELSE 'NOT_MIGRATED'
  END as migration_status
FROM properties p
LEFT JOIN landlords l ON p.landlord_id = l.id
LEFT JOIN property_users pu ON p.id = pu.property_id AND p.landlord_id = pu.user_id
ORDER BY p.name;

-- Step 4: Create function to validate migration integrity
CREATE OR REPLACE FUNCTION validate_migration_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: All properties with landlord_id have corresponding property_users entry
  SELECT 
    'Properties with landlord_id have property_users entry' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END as status,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All properties have corresponding property_users entries'
      ELSE COUNT(*)::TEXT || ' properties missing property_users entries'
    END as details
  FROM properties p
  LEFT JOIN property_users pu ON p.id = pu.property_id AND p.landlord_id = pu.user_id
  WHERE p.landlord_id IS NOT NULL AND pu.id IS NULL;
  
  RETURN NEXT;
  
  -- Check 2: All migrated users have OWNER role
  SELECT 
    'Migrated landlords have OWNER role' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END as status,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All migrated landlords have OWNER role'
      ELSE COUNT(*)::TEXT || ' migrated landlords do not have OWNER role'
    END as details
  FROM properties p
  JOIN property_users pu ON p.id = pu.property_id AND p.landlord_id = pu.user_id
  WHERE pu.role != 'OWNER';
  
  RETURN NEXT;
  
  -- Check 3: All migrated users have ACTIVE status
  SELECT 
    'Migrated landlords have ACTIVE status' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END as status,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All migrated landlords have ACTIVE status'
      ELSE COUNT(*)::TEXT || ' migrated landlords do not have ACTIVE status'
    END as details
  FROM properties p
  JOIN property_users pu ON p.id = pu.property_id AND p.landlord_id = pu.user_id
  WHERE pu.status != 'ACTIVE';
  
  RETURN NEXT;
  
  -- Check 4: No duplicate property_users entries
  SELECT 
    'No duplicate property_users entries' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END as status,
    CASE 
      WHEN COUNT(*) = 0 THEN 'No duplicate property_users entries found'
      ELSE COUNT(*)::TEXT || ' duplicate property_users entries found'
    END as details
  FROM (
    SELECT property_id, user_id, COUNT(*) as entry_count
    FROM property_users
    GROUP BY property_id, user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RETURN NEXT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Run validation
DO $$
DECLARE
  validation_result RECORD;
  all_checks_passed BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE '=== MIGRATION VALIDATION ===';
  
  FOR validation_result IN 
    SELECT * FROM validate_migration_integrity()
  LOOP
    RAISE NOTICE '% - %: %', 
      validation_result.status, 
      validation_result.check_name, 
      validation_result.details;
    
    IF validation_result.status = 'FAIL' THEN
      all_checks_passed := FALSE;
    END IF;
  END LOOP;
  
  IF all_checks_passed THEN
    RAISE NOTICE 'All validation checks PASSED - Migration completed successfully!';
  ELSE
    RAISE WARNING 'Some validation checks FAILED - Please review migration results';
  END IF;
  
  RAISE NOTICE '============================';
END $$;

-- Step 6: Clean up temporary function
DROP FUNCTION migrate_landlord_to_property_users();

-- Grant permissions on new view
GRANT SELECT ON property_ownership_summary TO authenticated;

-- Add comments
COMMENT ON VIEW property_ownership_summary IS 'Shows the migration status of landlord relationships to property_users system';
COMMENT ON FUNCTION validate_migration_integrity() IS 'Validates the integrity of the landlord to property_users migration';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 015: Landlord relationships migration completed';
  RAISE NOTICE 'All existing landlords are now OWNER users in their properties';
  RAISE NOTICE 'Created view: property_ownership_summary';
  RAISE NOTICE 'Created function: validate_migration_integrity()';
  RAISE NOTICE 'Multi-user system is ready for use';
END $$;
