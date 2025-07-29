-- FINAL FUNCTION FIX
-- This ensures the function works correctly with both authenticated users and service role

-- ============================================================================
-- Drop and recreate the function with proper service role handling
-- ============================================================================

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
  -- If owner_user_id is provided, use it; otherwise try auth.uid()
  IF owner_user_id IS NOT NULL THEN
    effective_user_id := owner_user_id;
  ELSE
    effective_user_id := auth.uid();
  END IF;
  
  -- Validate that we have a user ID
  IF effective_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID must be provided as parameter when called with service role, or user must be authenticated';
  END IF;
  
  -- Verify user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = effective_user_id) THEN
    RAISE EXCEPTION 'User % does not exist in auth.users table', effective_user_id;
  END IF;
  
  -- Validate inputs
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

-- Grant permissions to both authenticated users and service role
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_owner TO service_role;

-- ============================================================================
-- Update the test function to explicitly pass user ID
-- ============================================================================

DROP FUNCTION IF EXISTS test_property_creation_with_user(UUID, TEXT, TEXT, TEXT);

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
  -- Explicitly pass the user ID to avoid authentication issues
  RETURN create_property_with_owner(property_name, property_address, property_type, test_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION test_property_creation_with_user TO service_role;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Function updated to handle both authenticated users and service role calls!' as status;
