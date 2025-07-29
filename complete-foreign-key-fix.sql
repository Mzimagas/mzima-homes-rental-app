-- Complete Foreign Key Constraint Fix
-- This SQL script resolves all foreign key constraint issues and implements the RLS fix
-- Execute this entire script in the Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create Missing Landlord Entries for Auth Users
-- ============================================================================

-- Create landlord entries for all auth users who don't have them
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
-- STEP 2: Fix Property Landlord References
-- ============================================================================

-- Update properties to use valid landlord IDs
UPDATE properties 
SET landlord_id = subquery.correct_landlord_id,
    updated_at = NOW()
FROM (
  SELECT 
    p.id as property_id,
    COALESCE(
      -- First: Try to find OWNER in property_users who exists in landlords
      (SELECT pu.user_id FROM property_users pu 
       INNER JOIN landlords l ON pu.user_id = l.id
       WHERE pu.property_id = p.id 
       AND pu.role = 'OWNER' 
       AND pu.status = 'ACTIVE' 
       LIMIT 1),
      -- Second: Try to find any active user in property_users who exists in landlords
      (SELECT pu.user_id FROM property_users pu 
       INNER JOIN landlords l ON pu.user_id = l.id
       WHERE pu.property_id = p.id 
       AND pu.status = 'ACTIVE' 
       LIMIT 1),
      -- Third: Use first available landlord if no property_users exist
      (SELECT l.id FROM landlords l LIMIT 1)
    ) as correct_landlord_id
  FROM properties p
  WHERE p.landlord_id IS NULL 
  OR p.landlord_id NOT IN (SELECT id FROM landlords WHERE id IS NOT NULL)
) as subquery
WHERE properties.id = subquery.property_id;

-- ============================================================================
-- STEP 3: Create Missing Property Users Entries
-- ============================================================================

-- Create property_users entries for properties that don't have them
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
INNER JOIN landlords l ON p.landlord_id = l.id
WHERE NOT EXISTS (
  SELECT 1 FROM property_users pu 
  WHERE pu.property_id = p.id 
  AND pu.user_id = p.landlord_id 
  AND pu.status = 'ACTIVE'
);

-- ============================================================================
-- STEP 4: Create Helper Functions
-- ============================================================================

-- Function to check if user has access to a property
CREATE OR REPLACE FUNCTION user_has_property_access(
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
  -- Return false if user is not authenticated
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
    -- Any active role is sufficient
    RETURN EXISTS (
      SELECT 1 FROM property_users 
      WHERE property_id = user_has_property_access.property_id
      AND user_id = user_has_property_access.user_id
      AND status = 'ACTIVE'
    );
  ELSE
    -- Specific roles required
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
CREATE OR REPLACE FUNCTION get_user_accessible_properties(
  user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(property_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Return empty if user is not authenticated
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
CREATE OR REPLACE FUNCTION create_property_with_owner(
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
  
  IF property_name IS NULL OR trim(property_name) = '' THEN
    RAISE EXCEPTION 'Property name is required';
  END IF;
  
  IF property_address IS NULL OR trim(property_address) = '' THEN
    RAISE EXCEPTION 'Property address is required';
  END IF;
  
  -- Ensure user has a landlord entry
  IF NOT EXISTS (SELECT 1 FROM landlords WHERE id = owner_user_id) THEN
    -- Get user info from auth.users
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

-- Function to ensure user has landlord entry
CREATE OR REPLACE FUNCTION ensure_user_landlord_entry(
  user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if landlord entry exists
  IF EXISTS (SELECT 1 FROM landlords WHERE id = user_id) THEN
    RETURN user_id;
  END IF;
  
  -- Create landlord entry from auth.users
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
  WHERE au.id = user_id;
  
  RETURN user_id;
END;
$$;

-- ============================================================================
-- STEP 5: Drop Existing RLS Policies
-- ============================================================================

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Property owners can insert properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON properties;
DROP POLICY IF EXISTS "Users can view properties they have access to" ON properties;
DROP POLICY IF EXISTS "Users can view accessible properties" ON properties;
DROP POLICY IF EXISTS "Property owners can update their properties" ON properties;
DROP POLICY IF EXISTS "Property owners can update properties" ON properties;
DROP POLICY IF EXISTS "Property owners can delete their properties" ON properties;
DROP POLICY IF EXISTS "Property owners can delete properties" ON properties;

-- ============================================================================
-- STEP 6: Create New RLS Policies
-- ============================================================================

-- Properties table policies
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
) WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    user_has_property_access(id, auth.uid(), ARRAY['OWNER'])
    OR
    (
      user_has_property_access(id, auth.uid(), ARRAY['PROPERTY_MANAGER'])
      AND landlord_id = OLD.landlord_id
    )
  )
);

CREATE POLICY "property_owners_can_delete_properties" ON properties
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND user_has_property_access(id, auth.uid(), ARRAY['OWNER'])
);

-- ============================================================================
-- STEP 7: Grant Permissions and Create Indexes
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION user_has_property_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_landlord_entry TO authenticated;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_property_users_user_property ON property_users(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_property_users_property_status ON property_users(property_id, status);
CREATE INDEX IF NOT EXISTS idx_property_users_user_status_role ON property_users(user_id, status, role);
CREATE INDEX IF NOT EXISTS idx_landlords_email ON landlords(email);

-- ============================================================================
-- STEP 8: Verification Queries
-- ============================================================================

-- Verify data consistency
SELECT 'Data Consistency Check' as check_type;

SELECT 
  COUNT(*) as total_properties,
  COUNT(CASE WHEN landlord_id IS NOT NULL THEN 1 END) as properties_with_landlord,
  COUNT(CASE WHEN landlord_id IN (SELECT id FROM landlords) THEN 1 END) as valid_landlord_references
FROM properties;

-- Verify property_users relationships
SELECT 'Property Users Check' as check_type;

SELECT 
  COUNT(*) as total_property_users,
  COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_relationships,
  COUNT(CASE WHEN role = 'OWNER' THEN 1 END) as owner_relationships
FROM property_users;

-- Verify helper functions exist
SELECT 'Helper Functions Check' as check_type;

SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'user_has_property_access', 
  'get_user_accessible_properties', 
  'create_property_with_owner',
  'ensure_user_landlord_entry'
);

-- Test message
SELECT 'Migration completed successfully! You can now use the helper functions for property operations.' as status;
