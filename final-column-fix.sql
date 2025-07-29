-- FINAL COLUMN AND RLS FIX
-- This fixes the remaining column name and RLS recursion issues

-- ============================================================================
-- STEP 1: Check the actual properties table structure
-- ============================================================================

-- First, let's see what columns actually exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Fix the create_property_with_owner function with correct column names
-- ============================================================================

-- Drop and recreate with correct column names
DROP FUNCTION IF EXISTS create_property_with_owner(TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS test_property_creation_with_user(UUID, TEXT, TEXT, TEXT);

-- Create function with correct column names based on actual schema
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
  
  -- Verify user exists in auth.users
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
  
  -- Insert property with correct column names
  -- Use property_type instead of type if that's what exists
  INSERT INTO properties (name, physical_address, property_type, landlord_id, created_at, updated_at)
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

-- Test function for verification
CREATE FUNCTION test_property_creation_with_user(
  test_user_id UUID,
  property_name TEXT,
  property_address TEXT,
  property_type TEXT DEFAULT 'APARTMENT'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN create_property_with_owner(property_name, property_address, property_type, test_user_id);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_owner TO service_role;
GRANT EXECUTE ON FUNCTION test_property_creation_with_user TO service_role;

-- ============================================================================
-- STEP 3: Fix RLS policies to avoid recursion
-- ============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "authenticated_users_can_insert_properties" ON properties;
DROP POLICY IF EXISTS "users_can_view_accessible_properties" ON properties;
DROP POLICY IF EXISTS "property_owners_can_update_properties" ON properties;
DROP POLICY IF EXISTS "property_owners_can_delete_properties" ON properties;

-- Create simple, non-recursive RLS policies
CREATE POLICY "authenticated_users_can_insert_properties" ON properties
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND landlord_id = auth.uid()
);

CREATE POLICY "users_can_view_accessible_properties" ON properties
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    landlord_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM property_users 
      WHERE property_id = properties.id
      AND user_id = auth.uid() 
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY "property_owners_can_update_properties" ON properties
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (
    landlord_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM property_users 
      WHERE property_id = properties.id
      AND user_id = auth.uid() 
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
    OR EXISTS (
      SELECT 1 FROM property_users 
      WHERE property_id = properties.id
      AND user_id = auth.uid() 
      AND role = 'OWNER'
      AND status = 'ACTIVE'
    )
  )
);

-- ============================================================================
-- STEP 4: Update helper functions to avoid RLS recursion
-- ============================================================================

-- Drop and recreate get_user_accessible_properties to avoid recursion
DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID);

CREATE FUNCTION get_user_accessible_properties(
  user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(property_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Use direct table access to avoid RLS recursion
  RETURN QUERY
  SELECT DISTINCT p.id
  FROM properties p
  WHERE p.landlord_id = user_id
  
  UNION
  
  SELECT DISTINCT pu.property_id
  FROM property_users pu
  WHERE pu.user_id = get_user_accessible_properties.user_id
  AND pu.status = 'ACTIVE';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO service_role;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

-- Test the column structure
SELECT 'Properties table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
AND column_name IN ('type', 'property_type', 'name', 'physical_address', 'landlord_id')
ORDER BY ordinal_position;

-- Test RLS policies
SELECT 'RLS policies:' as info;
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'properties'
ORDER BY policyname;

SELECT 'Column and RLS fixes applied successfully!' as status;
