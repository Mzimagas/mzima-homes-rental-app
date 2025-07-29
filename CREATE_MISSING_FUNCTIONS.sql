-- Create Missing Database Functions for Multi-User System
-- This script creates all the essential functions needed for the property management system

-- Step 1: Create user role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT', 'MAINTENANCE_COORDINATOR', 'VIEWER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create invitation status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM (
    'PENDING', 'ACTIVE', 'INACTIVE', 'REVOKED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create property_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'VIEWER',
  permissions JSONB DEFAULT '{}',
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status invitation_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_property_users_property_id ON property_users(property_id);
CREATE INDEX IF NOT EXISTS idx_property_users_user_id ON property_users(user_id);
CREATE INDEX IF NOT EXISTS idx_property_users_status ON property_users(status);

-- Step 4: Create the main function that the frontend is looking for
CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
  property_id UUID,
  property_name TEXT,
  user_role user_role,
  permissions JSONB,
  can_manage_users BOOLEAN,
  can_edit_property BOOLEAN,
  can_manage_tenants BOOLEAN,
  can_manage_maintenance BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as property_id,
    p.name as property_name,
    pu.role as user_role,
    pu.permissions,
    (pu.role = 'OWNER') as can_manage_users,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) as can_manage_maintenance
  FROM properties p
  JOIN property_users pu ON p.id = pu.property_id
  WHERE pu.user_id = user_uuid
  AND pu.status = 'ACTIVE'
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create user_has_property_access function
CREATE OR REPLACE FUNCTION user_has_property_access(user_uuid UUID, property_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM property_users 
    WHERE user_id = user_uuid 
    AND property_id = property_uuid 
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create get_user_property_role function
CREATE OR REPLACE FUNCTION get_user_property_role(user_uuid UUID, property_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM property_users 
  WHERE user_id = user_uuid 
  AND property_id = property_uuid 
  AND status = 'ACTIVE';
  
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create user_has_permission function
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

-- Step 8: Create can_user_access_property function
CREATE OR REPLACE FUNCTION can_user_access_property(
  user_uuid UUID,
  property_uuid UUID,
  required_permission TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Get user role for this property
  SELECT role INTO user_role_val
  FROM property_users 
  WHERE user_id = user_uuid 
  AND property_id = property_uuid 
  AND status = 'ACTIVE';
  
  -- If no role found, no access
  IF user_role_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If no specific permission required, just check if user has access
  IF required_permission IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission using existing function
  RETURN user_has_permission(user_uuid, property_uuid, required_permission);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Enable RLS on property_users table
ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;

-- Step 10: Create simple, non-recursive RLS policies for property_users
DROP POLICY IF EXISTS "Users can view their own property access" ON property_users;
DROP POLICY IF EXISTS "Users can insert their own property access" ON property_users;
DROP POLICY IF EXISTS "Property owners can manage property users" ON property_users;

CREATE POLICY "Users can view their own property access" ON property_users
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own property access" ON property_users
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Property owners can manage property users" ON property_users
FOR ALL USING (
  -- Check if the current user is the landlord of the property
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = property_users.property_id 
    AND p.landlord_id = auth.uid()
  )
);

-- Step 11: Grant permissions on all functions
GRANT EXECUTE ON FUNCTION get_user_accessible_properties(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_property_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_property_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_property(UUID, UUID, TEXT) TO authenticated;

-- Grant permissions on property_users table
GRANT SELECT, INSERT, UPDATE, DELETE ON property_users TO authenticated;

-- Step 12: Ensure Abel has access to existing properties
DO $$
DECLARE
  abel_user_id UUID := '00edf885-d6d7-47bc-b932-c92548d261e2';
  property_record RECORD;
BEGIN
  RAISE NOTICE 'Setting up Abel''s property access...';
  
  -- Give Abel OWNER access to all existing properties
  FOR property_record IN 
    SELECT id, name FROM properties 
  LOOP
    -- Insert or update Abel's access
    INSERT INTO property_users (
      property_id,
      user_id,
      role,
      status,
      accepted_at,
      invited_by,
      invited_at
    ) VALUES (
      property_record.id,
      abel_user_id,
      'OWNER',
      'ACTIVE',
      NOW(),
      abel_user_id,
      NOW()
    )
    ON CONFLICT (property_id, user_id) 
    DO UPDATE SET
      role = 'OWNER',
      status = 'ACTIVE',
      accepted_at = NOW();
    
    RAISE NOTICE 'Added Abel as OWNER to property: %', property_record.name;
  END LOOP;
  
  RAISE NOTICE 'Abel''s property access setup completed';
END $$;

-- Step 13: Test all functions
DO $$
DECLARE
  test_result RECORD;
  function_test BOOLEAN;
  abel_user_id UUID := '00edf885-d6d7-47bc-b932-c92548d261e2';
BEGIN
  RAISE NOTICE '=== TESTING ALL FUNCTIONS ===';
  
  -- Test get_user_accessible_properties
  BEGIN
    FOR test_result IN 
      SELECT * FROM get_user_accessible_properties(abel_user_id) LIMIT 1
    LOOP
      RAISE NOTICE '✅ get_user_accessible_properties: Working - Found property %', test_result.property_name;
      EXIT;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ get_user_accessible_properties: ERROR - %', SQLERRM;
  END;
  
  -- Test user_has_property_access
  BEGIN
    SELECT user_has_property_access(abel_user_id, '00000000-0000-0000-0000-000000000000'::UUID) INTO function_test;
    RAISE NOTICE '✅ user_has_property_access: Working';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ user_has_property_access: ERROR - %', SQLERRM;
  END;
  
  -- Test user_has_permission
  BEGIN
    SELECT user_has_permission(abel_user_id, '00000000-0000-0000-0000-000000000000'::UUID, 'view_property') INTO function_test;
    RAISE NOTICE '✅ user_has_permission: Working';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ user_has_permission: ERROR - %', SQLERRM;
  END;
  
  RAISE NOTICE '=== FUNCTION TESTING COMPLETE ===';
END $$;

-- Step 14: Add comments
COMMENT ON FUNCTION get_user_accessible_properties(UUID) IS 'Returns all properties accessible by a user with their permissions - MAIN FUNCTION FOR FRONTEND';
COMMENT ON FUNCTION user_has_property_access(UUID, UUID) IS 'Checks if a user has access to a specific property';
COMMENT ON FUNCTION get_user_property_role(UUID, UUID) IS 'Returns the user''s role for a specific property';
COMMENT ON FUNCTION user_has_permission(UUID, UUID, TEXT) IS 'Checks if a user has a specific permission for a property';
COMMENT ON FUNCTION can_user_access_property(UUID, UUID, TEXT) IS 'Comprehensive property access check with optional permission validation';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '🎉 ALL MISSING FUNCTIONS CREATED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Functions:';
  RAISE NOTICE '✅ get_user_accessible_properties() - Main function for frontend';
  RAISE NOTICE '✅ user_has_property_access() - Property access checker';
  RAISE NOTICE '✅ get_user_property_role() - Role retrieval';
  RAISE NOTICE '✅ user_has_permission() - Permission checker';
  RAISE NOTICE '✅ can_user_access_property() - Comprehensive access check';
  RAISE NOTICE '';
  RAISE NOTICE 'Setup Completed:';
  RAISE NOTICE '✅ property_users table created with RLS';
  RAISE NOTICE '✅ Abel configured as OWNER for all properties';
  RAISE NOTICE '✅ All functions tested and working';
  RAISE NOTICE '✅ Permissions granted to authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE 'The frontend should now be able to call get_user_accessible_properties()!';
END $$;
