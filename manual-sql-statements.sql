-- Manual SQL Statements for Supabase SQL Editor
-- Execute these statements one by one in the Supabase SQL Editor
-- This file contains the essential parts of the migration that must be run manually

-- ============================================================================
-- PART 1: Data Consistency Fixes (Execute First)
-- ============================================================================

-- Fix landlord_id mismatches in existing properties
UPDATE properties 
SET landlord_id = subquery.correct_landlord_id,
    updated_at = NOW()
FROM (
  SELECT 
    p.id as property_id,
    COALESCE(
      (SELECT pu.user_id FROM property_users pu 
       WHERE pu.property_id = p.id 
       AND pu.role = 'OWNER' 
       AND pu.status = 'ACTIVE' 
       LIMIT 1),
      p.landlord_id
    ) as correct_landlord_id
  FROM properties p
) as subquery
WHERE properties.id = subquery.property_id
AND properties.landlord_id != subquery.correct_landlord_id;

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
WHERE p.landlord_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM property_users pu 
  WHERE pu.property_id = p.id 
  AND pu.user_id = p.landlord_id 
  AND pu.status = 'ACTIVE'
);

-- ============================================================================
-- PART 2: Helper Functions (Execute Second)
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
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM properties 
    WHERE id = property_id 
    AND landlord_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
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
CREATE OR REPLACE FUNCTION get_user_accessible_properties(
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
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create property';
  END IF;
  
  IF property_name IS NULL OR trim(property_name) = '' THEN
    RAISE EXCEPTION 'Property name is required';
  END IF;
  
  IF property_address IS NULL OR trim(property_address) = '' THEN
    RAISE EXCEPTION 'Property address is required';
  END IF;
  
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
-- PART 3: Drop Existing RLS Policies (Execute Third)
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
-- PART 4: Create New RLS Policies (Execute Fourth)
-- ============================================================================

-- Properties table policies
CREATE POLICY "authenticated_users_can_insert_properties" ON properties
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND landlord_id = auth.uid()
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

-- Property_users table policies
CREATE POLICY "users_can_view_property_relationships" ON property_users
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR user_has_property_access(property_id, auth.uid(), ARRAY['OWNER', 'PROPERTY_MANAGER'])
  )
);

CREATE POLICY "property_managers_can_insert_property_users" ON property_users
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_has_property_access(property_id, auth.uid(), ARRAY['OWNER', 'PROPERTY_MANAGER'])
);

CREATE POLICY "property_managers_can_update_property_users" ON property_users
FOR UPDATE USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR user_has_property_access(property_id, auth.uid(), ARRAY['OWNER', 'PROPERTY_MANAGER'])
  )
);

CREATE POLICY "property_owners_can_delete_property_users" ON property_users
FOR DELETE USING (
  auth.uid() IS NOT NULL
  AND user_has_property_access(property_id, auth.uid(), ARRAY['OWNER', 'PROPERTY_MANAGER'])
);

-- ============================================================================
-- PART 5: Grant Permissions and Create Indexes (Execute Fifth)
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION user_has_property_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_property_users_user_property ON property_users(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_property_users_property_status ON property_users(property_id, status);
CREATE INDEX IF NOT EXISTS idx_property_users_user_status_role ON property_users(user_id, status, role);

-- ============================================================================
-- PART 6: Verification Queries (Execute Last to Test)
-- ============================================================================

-- Test the helper functions
SELECT 'Testing helper functions...' as status;

-- Check if functions were created successfully
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('user_has_property_access', 'get_user_accessible_properties', 'create_property_with_owner');

-- Test data consistency
SELECT 'Checking data consistency...' as status;

SELECT 
  p.id,
  p.name,
  p.landlord_id,
  pu.user_id as property_user_id,
  pu.role,
  CASE 
    WHEN p.landlord_id = pu.user_id THEN 'CONSISTENT'
    ELSE 'INCONSISTENT'
  END as consistency_status
FROM properties p
LEFT JOIN property_users pu ON p.id = pu.property_id AND pu.role = 'OWNER' AND pu.status = 'ACTIVE';

-- Check RLS policies
SELECT 'Checking RLS policies...' as status;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('properties', 'property_users')
ORDER BY tablename, policyname;
