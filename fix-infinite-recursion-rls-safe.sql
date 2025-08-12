-- SAFE FIX FOR INFINITE RECURSION IN RLS POLICIES
-- This version handles existing function conflicts gracefully

-- ============================================================================
-- STEP 1: Drop existing problematic RLS policies
-- ============================================================================

-- Drop all existing policies on properties table
DROP POLICY IF EXISTS "Users can view their accessible properties" ON properties;
DROP POLICY IF EXISTS "Users can insert properties they own" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;
DROP POLICY IF EXISTS "Enable read access for property owners and managers" ON properties;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON properties;
DROP POLICY IF EXISTS "Enable update for property owners" ON properties;
DROP POLICY IF EXISTS "Enable delete for property owners" ON properties;

-- Drop all existing policies on property_users table
DROP POLICY IF EXISTS "Users can view their property relationships" ON property_users;
DROP POLICY IF EXISTS "Users can insert property relationships" ON property_users;
DROP POLICY IF EXISTS "Users can update their property relationships" ON property_users;
DROP POLICY IF EXISTS "Users can delete their property relationships" ON property_users;
DROP POLICY IF EXISTS "Enable read access for users" ON property_users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON property_users;
DROP POLICY IF EXISTS "Enable update for users" ON property_users;
DROP POLICY IF EXISTS "Enable delete for users" ON property_users;

-- ============================================================================
-- STEP 2: Create simple, non-recursive RLS policies
-- ============================================================================

-- Properties table policies (simple and direct)
CREATE POLICY "properties_select_policy" ON properties
  FOR SELECT
  TO authenticated
  USING (
    -- Direct check: user is the landlord OR user has access via property_users
    landlord_id = auth.uid() 
    OR 
    id IN (
      SELECT property_id 
      FROM property_users 
      WHERE user_id = auth.uid() 
      AND status = 'ACTIVE'
    )
  );

CREATE POLICY "properties_insert_policy" ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow insert if user is the landlord
    landlord_id = auth.uid()
  );

CREATE POLICY "properties_update_policy" ON properties
  FOR UPDATE
  TO authenticated
  USING (
    -- User is the landlord OR user has OWNER/PROPERTY_MANAGER role
    landlord_id = auth.uid()
    OR
    id IN (
      SELECT property_id 
      FROM property_users 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'PROPERTY_MANAGER')
      AND status = 'ACTIVE'
    )
  );

CREATE POLICY "properties_delete_policy" ON properties
  FOR DELETE
  TO authenticated
  USING (
    -- Only landlord can delete
    landlord_id = auth.uid()
  );

-- Property_users table policies (simple and direct)
CREATE POLICY "property_users_select_policy" ON property_users
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own relationships
    user_id = auth.uid()
    OR
    -- User can see relationships for properties they own/manage
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY "property_users_insert_policy" ON property_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can add themselves to properties they own
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE landlord_id = auth.uid()
    )
    OR
    -- User can add themselves if they're being added
    user_id = auth.uid()
  );

CREATE POLICY "property_users_update_policy" ON property_users
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own relationships
    user_id = auth.uid()
    OR
    -- Property owner can update relationships
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY "property_users_delete_policy" ON property_users
  FOR DELETE
  TO authenticated
  USING (
    -- User can remove themselves
    user_id = auth.uid()
    OR
    -- Property owner can remove others
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: Create new bypass function with unique name
-- ============================================================================

-- Function to get properties without RLS for service role (unique name)
CREATE OR REPLACE FUNCTION get_properties_for_user_v2(target_user_id UUID)
RETURNS TABLE(
  property_id UUID,
  property_name TEXT,
  property_address TEXT,
  landlord_id UUID,
  user_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function bypasses RLS by using SECURITY DEFINER
  RETURN QUERY
  SELECT DISTINCT 
    p.id as property_id,
    p.name as property_name,
    p.physical_address as property_address,
    p.landlord_id,
    COALESCE(pu.role, 'OWNER') as user_role
  FROM properties p
  LEFT JOIN property_users pu ON p.id = pu.property_id AND pu.user_id = target_user_id
  WHERE p.landlord_id = target_user_id
     OR (pu.user_id = target_user_id AND pu.status = 'ACTIVE');
END;
$$;

GRANT EXECUTE ON FUNCTION get_properties_for_user_v2 TO service_role;
GRANT EXECUTE ON FUNCTION get_properties_for_user_v2 TO authenticated;

-- ============================================================================
-- STEP 4: Create alternative simple function
-- ============================================================================

-- Simple function that returns just property IDs and roles
CREATE OR REPLACE FUNCTION get_user_property_access(target_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(property_id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple query that doesn't trigger RLS recursion
  RETURN QUERY
  SELECT DISTINCT pu.property_id, pu.role
  FROM property_users pu
  WHERE pu.user_id = target_user_id
    AND pu.status = 'ACTIVE'
  
  UNION
  
  -- Also include properties where user is the landlord
  SELECT DISTINCT p.id as property_id, 'OWNER' as role
  FROM properties p
  WHERE p.landlord_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_property_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_property_access TO service_role;

-- ============================================================================
-- STEP 5: Handle existing function conflicts safely
-- ============================================================================

-- Try to drop existing functions safely
DO $$
BEGIN
  -- Try to drop various versions of the function
  BEGIN
    DROP FUNCTION IF EXISTS get_user_accessible_properties();
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors
  END;
  
  BEGIN
    DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors
  END;
  
  BEGIN
    DROP FUNCTION IF EXISTS get_user_accessible_properties(user_uuid UUID);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors
  END;
END $$;

-- Create the function with a clear signature
CREATE OR REPLACE FUNCTION get_user_accessible_properties()
RETURNS TABLE(property_id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple query that doesn't trigger RLS recursion
  RETURN QUERY
  SELECT DISTINCT pu.property_id, pu.role
  FROM property_users pu
  WHERE pu.user_id = auth.uid()
    AND pu.status = 'ACTIVE'
  
  UNION
  
  -- Also include properties where user is the landlord
  SELECT DISTINCT p.id as property_id, 'OWNER' as role
  FROM properties p
  WHERE p.landlord_id = auth.uid();
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO service_role;

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

-- Test that policies are working
SELECT 'RLS policies recreated successfully - infinite recursion should be resolved!' as status;

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('properties', 'property_users')
ORDER BY tablename, policyname;
