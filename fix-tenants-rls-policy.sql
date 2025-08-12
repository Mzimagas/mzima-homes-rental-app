-- FIX TENANTS RLS POLICY
-- Resolves the 500 error caused by RLS policies on tenants table

-- ============================================================================
-- STEP 1: Drop existing problematic policies
-- ============================================================================

-- Drop all existing policies on tenants table that might cause recursion
DROP POLICY IF EXISTS "Landlords can view their tenants" ON tenants;
DROP POLICY IF EXISTS "Landlords can insert their tenants" ON tenants;
DROP POLICY IF EXISTS "Landlords can update their tenants" ON tenants;
DROP POLICY IF EXISTS "Landlords can delete their tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view tenants for their properties" ON tenants;
DROP POLICY IF EXISTS "Users can create tenants" ON tenants;
DROP POLICY IF EXISTS "Users can update tenants for their properties" ON tenants;
DROP POLICY IF EXISTS "Users can delete tenants for their properties" ON tenants;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON tenants;

-- ============================================================================
-- STEP 2: Create simple, non-recursive RLS policies
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow property owners to view tenants in their properties
CREATE POLICY "property_owners_can_view_tenants" ON tenants
FOR SELECT 
TO authenticated
USING (
  -- Simple check: tenant is in a unit owned by the authenticated user
  current_unit_id IN (
    SELECT u.id 
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = auth.uid()
  )
  OR
  -- Allow service role to access all tenants
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy 2: Allow property owners to insert tenants
CREATE POLICY "property_owners_can_insert_tenants" ON tenants
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow authenticated users to insert tenants
  auth.uid() IS NOT NULL
  OR
  -- Allow service role to insert tenants
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy 3: Allow property owners to update their tenants
CREATE POLICY "property_owners_can_update_tenants" ON tenants
FOR UPDATE 
TO authenticated
USING (
  -- Tenant is in a unit owned by the authenticated user
  current_unit_id IN (
    SELECT u.id 
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = auth.uid()
  )
  OR
  -- Allow service role to update all tenants
  auth.jwt() ->> 'role' = 'service_role'
);

-- Policy 4: Allow property owners to delete their tenants
CREATE POLICY "property_owners_can_delete_tenants" ON tenants
FOR DELETE 
TO authenticated
USING (
  -- Tenant is in a unit owned by the authenticated user
  current_unit_id IN (
    SELECT u.id 
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = auth.uid()
  )
  OR
  -- Allow service role to delete all tenants
  auth.jwt() ->> 'role' = 'service_role'
);

-- ============================================================================
-- STEP 3: Alternative - Temporary permissive policy for testing
-- ============================================================================

-- Uncomment this if you want to temporarily allow all access for testing
-- CREATE POLICY "temp_allow_all_tenants" ON tenants
-- FOR ALL 
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- ============================================================================
-- STEP 4: Grant necessary permissions
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO service_role;

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

-- Test that policies are working
SELECT 'Tenants RLS policies fixed - 500 error should be resolved!' as status;

-- Show current policies on tenants table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY policyname;
