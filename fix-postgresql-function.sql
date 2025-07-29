-- Fix for validate_migration_integrity() function
-- This corrects the "query has no destination for result data" error

-- Drop the problematic function first
DROP FUNCTION IF EXISTS validate_migration_integrity();

-- Create the corrected function
CREATE OR REPLACE FUNCTION validate_migration_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: All properties with landlord_id have corresponding property_users entry
  RETURN QUERY
  SELECT 
    'Properties with landlord_id have property_users entry'::TEXT as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END as status,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All properties have corresponding property_users entries'::TEXT
      ELSE COUNT(*)::TEXT || ' properties missing property_users entries'
    END as details
  FROM properties p
  LEFT JOIN property_users pu ON p.id = pu.property_id AND p.landlord_id = pu.user_id
  WHERE p.landlord_id IS NOT NULL AND pu.id IS NULL;
  
  -- Check 2: All migrated users have OWNER role
  RETURN QUERY
  SELECT 
    'Migrated landlords have OWNER role'::TEXT as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END as status,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All migrated landlords have OWNER role'::TEXT
      ELSE COUNT(*)::TEXT || ' migrated landlords do not have OWNER role'
    END as details
  FROM properties p
  JOIN property_users pu ON p.id = pu.property_id AND p.landlord_id = pu.user_id
  WHERE pu.role != 'OWNER';
  
  -- Check 3: All migrated users have ACTIVE status
  RETURN QUERY
  SELECT 
    'Migrated landlords have ACTIVE status'::TEXT as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END as status,
    CASE 
      WHEN COUNT(*) = 0 THEN 'All migrated landlords have ACTIVE status'::TEXT
      ELSE COUNT(*)::TEXT || ' migrated landlords do not have ACTIVE status'
    END as details
  FROM properties p
  JOIN property_users pu ON p.id = pu.property_id AND p.landlord_id = pu.user_id
  WHERE pu.status != 'ACTIVE';
  
  -- Check 4: No duplicate property_users entries
  RETURN QUERY
  SELECT 
    'No duplicate property_users entries'::TEXT as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END as status,
    CASE 
      WHEN COUNT(*) = 0 THEN 'No duplicate property_users entries found'::TEXT
      ELSE COUNT(*)::TEXT || ' duplicate property_users entries found'
    END as details
  FROM (
    SELECT property_id, user_id, COUNT(*) as entry_count
    FROM property_users
    GROUP BY property_id, user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the inline code block that calls the function
-- The original inline block should be replaced with this corrected version:

-- Corrected validation execution block
DO $$
DECLARE
  validation_result RECORD;
  all_checks_passed BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE '=== MIGRATION VALIDATION ===';
  
  -- Properly iterate through the function results
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

-- Test the corrected function
SELECT * FROM validate_migration_integrity();

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_migration_integrity() TO authenticated;

-- Add comment
COMMENT ON FUNCTION validate_migration_integrity() IS 'Validates the integrity of the landlord to property_users migration - FIXED VERSION';
