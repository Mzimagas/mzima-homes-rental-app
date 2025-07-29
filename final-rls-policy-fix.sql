-- FINAL RLS POLICY FIX
-- This addresses the remaining RLS configuration issues

-- ============================================================================
-- STEP 1: Fix the create_property_with_owner function to work with service role
-- ============================================================================

-- Drop and recreate the function with better authentication handling
DROP FUNCTION IF EXISTS create_property_with_owner(TEXT, TEXT, TEXT, UUID);

CREATE FUNCTION create_property_with_owner(
  property_name TEXT,
  property_address TEXT,
  property_type TEXT DEFAULT 'APARTMENT',
  owner_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_property_id UUID;
  effective_user_id UUID;
BEGIN
  -- Determine effective user ID
  effective_user_id := COALESCE(owner_user_id, auth.uid());
  
  -- Validate inputs
  IF effective_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID must be provided or user must be authenticated';
  END IF;
  
  -- Verify user exists in auth.users (only if not using service role)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = effective_user_id) THEN
    RAISE EXCEPTION 'User % does not exist in auth.users table', effective_user_id;
  END IF;
  
  IF property_name IS NULL OR trim(property_name) = '' THEN
    RAISE EXCEPTION 'Property name is required';
  END IF;
  
  IF property_address IS NULL OR trim(property_address) = '' THEN
    RAISE EXCEPTION 'Property address is required';
  END IF;
  
  -- Ensure user has a landlord entry
  IF NOT EXISTS (SELECT 1 FROM landlords WHERE id = effective_user_id) THEN
    INSERT INTO landlords (id, full_name, email, phone, created_at, updated_at)
    SELECT 
      au.id,
      COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name', 
        split_part(au.email, '@', 1)
      ),
      au.email,
      COALESCE(au.raw_user_meta_data->>'phone', '+254700000000'),
      NOW(),
      NOW()
    FROM auth.users au 
    WHERE au.id = effective_user_id;
  END IF;
  
  -- Insert property
  INSERT INTO properties (name, physical_address, type, landlord_id, created_at, updated_at)
  VALUES (
    trim(property_name), 
    trim(property_address), 
    COALESCE(property_type, 'APARTMENT'), 
    effective_user_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_property_id;
  
  -- Create property_users entry for the owner
  INSERT INTO property_users (property_id, user_id, role, status, accepted_at, created_at, updated_at)
  VALUES (
    new_property_id, 
    effective_user_id, 
    'OWNER', 
    'ACTIVE', 
    NOW(),
    NOW(),
    NOW()
  );
  
  RETURN new_property_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create property: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_owner TO service_role;

-- ============================================================================
-- STEP 2: Update RLS policies to be more restrictive
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "authenticated_users_can_insert_properties" ON properties;
DROP POLICY IF EXISTS "users_can_view_accessible_properties" ON properties;
DROP POLICY IF EXISTS "property_owners_can_update_properties" ON properties;
DROP POLICY IF EXISTS "property_owners_can_delete_properties" ON properties;

-- Create more restrictive RLS policies
CREATE POLICY "authenticated_users_can_insert_properties" ON properties
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND landlord_id = auth.uid()
  AND EXISTS (SELECT 1 FROM landlords WHERE id = auth.uid())
);

CREATE POLICY "users_can_view_accessible_properties" ON properties
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    landlord_id = auth.uid()
    OR id IN (
      SELECT property_id FROM property_users 
      WHERE user_id = auth.uid() 
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY "property_owners_can_update_properties" ON properties
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (
    landlord_id = auth.uid()
    OR id IN (
      SELECT property_id FROM property_users 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'PROPERTY_MANAGER')
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY "property_owners_can_delete_properties" ON properties
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    landlord_id = auth.uid()
    OR id IN (
      SELECT property_id FROM property_users 
      WHERE user_id = auth.uid() 
      AND role = 'OWNER'
      AND status = 'ACTIVE'
    )
  )
);

-- ============================================================================
-- STEP 3: Ensure RLS is enabled on properties table
-- ============================================================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS policies for property_users table
-- ============================================================================

-- Enable RLS on property_users if not already enabled
ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;

-- Drop existing property_users policies
DROP POLICY IF EXISTS "users_can_view_property_relationships" ON property_users;
DROP POLICY IF EXISTS "property_managers_can_insert_property_users" ON property_users;
DROP POLICY IF EXISTS "property_managers_can_update_property_users" ON property_users;
DROP POLICY IF EXISTS "property_owners_can_delete_property_users" ON property_users;

-- Create property_users RLS policies
CREATE POLICY "users_can_view_property_relationships" ON property_users
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
    OR property_id IN (
      SELECT property_id FROM property_users 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'PROPERTY_MANAGER')
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY "property_managers_can_insert_property_users" ON property_users
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
    OR property_id IN (
      SELECT property_id FROM property_users 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'PROPERTY_MANAGER')
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY "property_managers_can_update_property_users" ON property_users
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
    OR property_id IN (
      SELECT property_id FROM property_users 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'PROPERTY_MANAGER')
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY "property_owners_can_delete_property_users" ON property_users
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND (
    property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
    OR property_id IN (
      SELECT property_id FROM property_users 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'PROPERTY_MANAGER')
      AND status = 'ACTIVE'
    )
  )
);

-- ============================================================================
-- STEP 5: Create a test function that works with service role
-- ============================================================================

CREATE OR REPLACE FUNCTION test_property_creation_with_user(
  test_user_id UUID,
  property_name TEXT,
  property_address TEXT,
  property_type TEXT DEFAULT 'APARTMENT'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_property_id UUID;
BEGIN
  -- This function bypasses RLS for testing purposes
  -- It should only be used for verification
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user ID is required';
  END IF;
  
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
    RAISE EXCEPTION 'Test user does not exist';
  END IF;
  
  -- Call the main function with explicit user ID
  SELECT create_property_with_owner(
    property_name, 
    property_address, 
    property_type, 
    test_user_id
  ) INTO new_property_id;
  
  RETURN new_property_id;
END;
$$;

-- Grant permissions for testing
GRANT EXECUTE ON FUNCTION test_property_creation_with_user TO service_role;

-- ============================================================================
-- STEP 6: Verification queries
-- ============================================================================

-- Check RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('properties', 'property_users');

-- Check policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('properties', 'property_users')
ORDER BY tablename, policyname;

-- Final status
SELECT 'RLS policies have been updated and should now work correctly!' as status;
