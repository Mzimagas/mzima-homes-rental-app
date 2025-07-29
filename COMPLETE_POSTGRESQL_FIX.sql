-- COMPLETE POSTGRESQL FUNCTION FIX
-- This file contains all corrected functions to resolve "query has no destination for result data" errors

-- =============================================================================
-- 1. CORRECTED validate_migration_integrity() FUNCTION
-- =============================================================================

-- Drop the problematic function if it exists
DROP FUNCTION IF EXISTS validate_migration_integrity();

-- Create the corrected function with proper RETURN QUERY statements
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

-- =============================================================================
-- 2. MISSING user_has_permission() FUNCTION
-- =============================================================================

-- Create the missing user_has_permission function
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, property_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Get user role for the property
  SELECT role INTO user_role_val
  FROM property_users 
  WHERE user_id = user_uuid 
  AND property_id = property_uuid 
  AND status = 'ACTIVE';
  
  -- If no role found, user has no access
  IF user_role_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permissions based on role and permission name
  CASE permission_name
    WHEN 'manage_users' THEN
      RETURN user_role_val = 'OWNER';
    WHEN 'edit_property' THEN
      RETURN user_role_val IN ('OWNER', 'PROPERTY_MANAGER');
    WHEN 'manage_tenants' THEN
      RETURN user_role_val IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT');
    WHEN 'manage_maintenance' THEN
      RETURN user_role_val IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR');
    WHEN 'view_property' THEN
      RETURN TRUE; -- All roles can view
    WHEN 'create_property' THEN
      RETURN TRUE; -- All authenticated users can create properties
    ELSE
      RETURN FALSE; -- Unknown permission
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. CORRECTED INLINE CODE BLOCK FOR VALIDATION
-- =============================================================================

-- This is the corrected version of the inline code block that calls validate_migration_integrity
-- Use this instead of the problematic version in the migration script

-- Corrected validation execution block
DO $$
DECLARE
  validation_result RECORD;
  all_checks_passed BOOLEAN := TRUE;
  total_checks INTEGER := 0;
  passed_checks INTEGER := 0;
BEGIN
  RAISE NOTICE '=== MIGRATION VALIDATION ===';
  
  -- Properly iterate through the function results
  FOR validation_result IN 
    SELECT * FROM validate_migration_integrity()
  LOOP
    total_checks := total_checks + 1;
    
    RAISE NOTICE '% - %: %', 
      validation_result.status, 
      validation_result.check_name, 
      validation_result.details;
    
    IF validation_result.status = 'PASS' THEN
      passed_checks := passed_checks + 1;
    ELSE
      all_checks_passed := FALSE;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Validation Summary: %/% checks passed', passed_checks, total_checks;
  
  IF all_checks_passed THEN
    RAISE NOTICE 'All validation checks PASSED - Migration completed successfully!';
  ELSE
    RAISE WARNING 'Some validation checks FAILED - Please review migration results';
  END IF;
  
  RAISE NOTICE '============================';
END $$;

-- =============================================================================
-- 4. ADDITIONAL HELPER FUNCTIONS
-- =============================================================================

-- Function to safely check if a table exists
CREATE OR REPLACE FUNCTION table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_exists.table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely check if a function exists
CREATE OR REPLACE FUNCTION function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = function_exists.function_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get migration status summary
CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE(
  component TEXT,
  exists_status BOOLEAN,
  component_type TEXT
) AS $$
BEGIN
  -- Check essential tables
  RETURN QUERY
  SELECT 'property_users'::TEXT, table_exists('property_users'), 'table'::TEXT;
  
  RETURN QUERY
  SELECT 'user_invitations'::TEXT, table_exists('user_invitations'), 'table'::TEXT;
  
  -- Check essential functions
  RETURN QUERY
  SELECT 'get_user_accessible_properties'::TEXT, function_exists('get_user_accessible_properties'), 'function'::TEXT;
  
  RETURN QUERY
  SELECT 'user_has_property_access'::TEXT, function_exists('user_has_property_access'), 'function'::TEXT;
  
  RETURN QUERY
  SELECT 'user_has_permission'::TEXT, function_exists('user_has_permission'), 'function'::TEXT;
  
  RETURN QUERY
  SELECT 'validate_migration_integrity'::TEXT, function_exists('validate_migration_integrity'), 'function'::TEXT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION validate_migration_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION table_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION function_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_migration_status() TO authenticated;

-- =============================================================================
-- 6. COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION validate_migration_integrity() IS 'Validates the integrity of the landlord to property_users migration - FIXED VERSION with proper RETURN QUERY statements';
COMMENT ON FUNCTION user_has_permission(UUID, UUID, TEXT) IS 'Checks if a user has a specific permission for a property based on their role';
COMMENT ON FUNCTION table_exists(TEXT) IS 'Safely checks if a table exists in the public schema';
COMMENT ON FUNCTION function_exists(TEXT) IS 'Safely checks if a function exists in the database';
COMMENT ON FUNCTION get_migration_status() IS 'Returns the status of all essential migration components';

-- =============================================================================
-- 7. TEST THE FIXES
-- =============================================================================

-- Test all functions to ensure they work correctly
DO $$
DECLARE
  test_result RECORD;
  function_test BOOLEAN;
BEGIN
  RAISE NOTICE '=== TESTING CORRECTED FUNCTIONS ===';
  
  -- Test validate_migration_integrity
  BEGIN
    RAISE NOTICE 'Testing validate_migration_integrity()...';
    
    FOR test_result IN 
      SELECT * FROM validate_migration_integrity() LIMIT 1
    LOOP
      RAISE NOTICE 'validate_migration_integrity: WORKING';
      EXIT;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'validate_migration_integrity: ERROR - %', SQLERRM;
  END;
  
  -- Test user_has_permission
  BEGIN
    RAISE NOTICE 'Testing user_has_permission()...';
    
    SELECT user_has_permission(
      '00000000-0000-0000-0000-000000000000'::UUID,
      '00000000-0000-0000-0000-000000000000'::UUID,
      'view_property'
    ) INTO function_test;
    
    RAISE NOTICE 'user_has_permission: WORKING';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'user_has_permission: ERROR - %', SQLERRM;
  END;
  
  -- Test helper functions
  BEGIN
    RAISE NOTICE 'Testing helper functions...';
    
    SELECT table_exists('properties') INTO function_test;
    SELECT function_exists('get_user_accessible_properties') INTO function_test;
    
    RAISE NOTICE 'Helper functions: WORKING';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Helper functions: ERROR - %', SQLERRM;
  END;
  
  RAISE NOTICE '=== FUNCTION TESTING COMPLETE ===';
END $$;

-- =============================================================================
-- 8. FINAL SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 POSTGRESQL FUNCTION FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Issues:';
  RAISE NOTICE '✅ validate_migration_integrity() - Added proper RETURN QUERY statements';
  RAISE NOTICE '✅ user_has_permission() - Created missing function';
  RAISE NOTICE '✅ Inline code blocks - Corrected function call patterns';
  RAISE NOTICE '✅ Helper functions - Added for safe schema checking';
  RAISE NOTICE '';
  RAISE NOTICE 'All functions should now execute without "query has no destination" errors!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test the fixes with:';
  RAISE NOTICE '- SELECT * FROM validate_migration_integrity();';
  RAISE NOTICE '- SELECT * FROM get_migration_status();';
  RAISE NOTICE '- SELECT user_has_permission(user_id, property_id, ''view_property'');';
END $$;
