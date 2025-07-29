-- CORRECT FUNCTION FIX
-- This creates the function with the actual table schema (no type column)

-- ============================================================================
-- STEP 1: Drop existing functions
-- ============================================================================

DROP FUNCTION IF EXISTS create_property_with_owner(TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS test_property_creation_with_user(UUID, TEXT, TEXT, TEXT);

-- ============================================================================
-- STEP 2: Create function with correct schema (no type column)
-- ============================================================================

CREATE FUNCTION create_property_with_owner(
  property_name TEXT,
  property_address TEXT,
  property_type TEXT DEFAULT 'APARTMENT', -- This parameter is ignored since table has no type column
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
  
  -- Insert property with actual table schema (no type column)
  INSERT INTO properties (name, physical_address, landlord_id, created_at, updated_at)
  VALUES (
    trim(property_name), 
    trim(property_address), 
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

-- ============================================================================
-- STEP 3: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_owner TO service_role;
GRANT EXECUTE ON FUNCTION test_property_creation_with_user TO service_role;

-- ============================================================================
-- STEP 4: Fix RLS policies to avoid recursion (if not already done)
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
-- STEP 5: Verification
-- ============================================================================

SELECT 'Function updated to match actual table schema!' as status;
SELECT 'Properties table columns: id, landlord_id, name, physical_address, lat, lng, notes, created_at, updated_at' as schema_info;
SELECT 'Function now correctly inserts into: name, physical_address, landlord_id, created_at, updated_at' as function_info;
