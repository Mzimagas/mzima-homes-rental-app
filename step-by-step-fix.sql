-- STEP-BY-STEP FIX FOR FOREIGN KEY CONSTRAINTS
-- Execute these statements one by one in Supabase SQL Editor
-- This approach avoids function conflicts and ensures each step succeeds

-- ============================================================================
-- STEP 1: Clean up orphaned data first
-- ============================================================================

-- Remove property_users entries that reference non-existent auth users
DELETE FROM property_users 
WHERE user_id NOT IN (SELECT id FROM auth.users WHERE id IS NOT NULL);

-- ============================================================================
-- STEP 2: Create missing landlord entries for existing auth users
-- ============================================================================

INSERT INTO landlords (id, full_name, email, phone, created_at, updated_at)
SELECT DISTINCT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name', 
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ) as full_name,
  au.email,
  COALESCE(au.raw_user_meta_data->>'phone', '+254700000000') as phone,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM landlords WHERE id IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, landlords.full_name),
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Fix properties with invalid landlord_id
-- ============================================================================

-- Update properties to use the first available auth user if landlord_id is invalid
UPDATE properties 
SET landlord_id = (SELECT id FROM auth.users LIMIT 1),
    updated_at = NOW()
WHERE landlord_id IS NULL 
OR landlord_id NOT IN (SELECT id FROM landlords WHERE id IS NOT NULL)
OR landlord_id NOT IN (SELECT id FROM auth.users WHERE id IS NOT NULL);

-- ============================================================================
-- STEP 4: Create missing property_users entries
-- ============================================================================

INSERT INTO property_users (property_id, user_id, role, status, accepted_at, created_at, updated_at)
SELECT 
  p.id as property_id,
  p.landlord_id as user_id,
  'OWNER' as role,
  'ACTIVE' as status,
  NOW() as accepted_at,
  NOW() as created_at,
  NOW() as updated_at
FROM properties p
INNER JOIN auth.users au ON p.landlord_id = au.id
INNER JOIN landlords l ON p.landlord_id = l.id
WHERE NOT EXISTS (
  SELECT 1 FROM property_users pu 
  WHERE pu.property_id = p.id 
  AND pu.user_id = p.landlord_id 
  AND pu.status = 'ACTIVE'
);

-- ============================================================================
-- STEP 5: Drop existing functions to avoid conflicts
-- ============================================================================

DROP FUNCTION IF EXISTS user_has_property_access(UUID, UUID, TEXT[]);
DROP FUNCTION IF EXISTS user_has_property_access(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_property_access(UUID);
DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID);
DROP FUNCTION IF EXISTS get_user_accessible_properties();
DROP FUNCTION IF EXISTS create_property_with_owner(TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_property_with_owner(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_property_with_owner(TEXT, TEXT);

-- ============================================================================
-- STEP 6: Create helper functions with new signatures
-- ============================================================================

-- Function to check if user has access to a property
CREATE FUNCTION user_has_property_access(
  property_id UUID,
  user_id UUID DEFAULT auth.uid(),
  required_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check direct landlord access
  IF EXISTS (
    SELECT 1 FROM properties 
    WHERE id = property_id 
    AND landlord_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check property_users access
  IF required_roles IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM property_users 
      WHERE property_id = user_has_property_access.property_id
      AND user_id = user_has_property_access.user_id
      AND status = 'ACTIVE'
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM property_users 
      WHERE property_id = user_has_property_access.property_id
      AND user_id = user_has_property_access.user_id
      AND role = ANY(required_roles)
      AND status = 'ACTIVE'
    );
  END IF;
END;
$$;

-- Function to get user's accessible property IDs
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

-- Function to safely create property with owner
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
BEGIN
  -- Validate inputs
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create property';
  END IF;
  
  -- Verify user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = owner_user_id) THEN
    RAISE EXCEPTION 'User does not exist in auth.users table';
  END IF;
  
  IF property_name IS NULL OR trim(property_name) = '' THEN
    RAISE EXCEPTION 'Property name is required';
  END IF;
  
  IF property_address IS NULL OR trim(property_address) = '' THEN
    RAISE EXCEPTION 'Property address is required';
  END IF;
  
  -- Ensure user has a landlord entry
  IF NOT EXISTS (SELECT 1 FROM landlords WHERE id = owner_user_id) THEN
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
    WHERE au.id = owner_user_id;
  END IF;
  
  -- Insert property
  INSERT INTO properties (name, physical_address, type, landlord_id, created_at, updated_at)
  VALUES (
    trim(property_name), 
    trim(property_address), 
    COALESCE(property_type, 'APARTMENT'), 
    owner_user_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_property_id;
  
  -- Create property_users entry for the owner
  INSERT INTO property_users (property_id, user_id, role, status, accepted_at, created_at, updated_at)
  VALUES (
    new_property_id, 
    owner_user_id, 
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

-- ============================================================================
-- STEP 7: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION user_has_property_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;

-- ============================================================================
-- STEP 8: Drop existing RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Property owners can insert properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON properties;
DROP POLICY IF EXISTS "Users can view properties they have access to" ON properties;
DROP POLICY IF EXISTS "Users can view accessible properties" ON properties;
DROP POLICY IF EXISTS "Property owners can update their properties" ON properties;
DROP POLICY IF EXISTS "Property owners can update properties" ON properties;
DROP POLICY IF EXISTS "Property owners can delete their properties" ON properties;
DROP POLICY IF EXISTS "Property owners can delete properties" ON properties;
DROP POLICY IF EXISTS "authenticated_users_can_insert_properties" ON properties;
DROP POLICY IF EXISTS "users_can_view_accessible_properties" ON properties;
DROP POLICY IF EXISTS "property_owners_can_update_properties" ON properties;
DROP POLICY IF EXISTS "property_owners_can_delete_properties" ON properties;

-- ============================================================================
-- STEP 9: Create new RLS policies
-- ============================================================================

CREATE POLICY "authenticated_users_can_insert_properties" ON properties
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND landlord_id = auth.uid()
  AND EXISTS (SELECT 1 FROM landlords WHERE id = auth.uid())
);

CREATE POLICY "users_can_view_accessible_properties" ON properties
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND id IN (SELECT property_id FROM get_user_accessible_properties())
);

CREATE POLICY "property_owners_can_update_properties" ON properties
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND user_has_property_access(id, auth.uid(), ARRAY['OWNER', 'PROPERTY_MANAGER'])
);

CREATE POLICY "property_owners_can_delete_properties" ON properties
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND user_has_property_access(id, auth.uid(), ARRAY['OWNER'])
);

-- ============================================================================
-- STEP 10: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_property_users_user_property ON property_users(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_property_users_property_status ON property_users(property_id, status);

-- ============================================================================
-- STEP 11: Verification queries
-- ============================================================================

-- Check for any remaining foreign key issues
SELECT 
  'Properties with invalid landlord_id' as issue_type,
  COUNT(*) as count
FROM properties p
WHERE p.landlord_id IS NOT NULL 
AND (p.landlord_id NOT IN (SELECT id FROM landlords WHERE id IS NOT NULL)
     OR p.landlord_id NOT IN (SELECT id FROM auth.users WHERE id IS NOT NULL));

SELECT 
  'Property_users with invalid user_id' as issue_type,
  COUNT(*) as count
FROM property_users pu
WHERE pu.user_id NOT IN (SELECT id FROM auth.users WHERE id IS NOT NULL);

-- Show final data state
SELECT 
  'Final Data Summary' as summary_type,
  (SELECT COUNT(*) FROM properties) as total_properties,
  (SELECT COUNT(*) FROM landlords) as total_landlords,
  (SELECT COUNT(*) FROM property_users WHERE status = 'ACTIVE') as active_property_users,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users;

SELECT 'All foreign key constraints should now be satisfied!' as status;
