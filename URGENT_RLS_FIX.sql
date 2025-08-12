-- URGENT: Fix RLS infinite recursion for authenticated users
-- Execute this in Supabase SQL Editor to resolve the 500 errors

-- Step 1: Disable RLS temporarily
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their accessible properties" ON properties;
DROP POLICY IF EXISTS "Users can insert properties they own" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;
DROP POLICY IF EXISTS "Enable read access for property owners and managers" ON properties;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON properties;
DROP POLICY IF EXISTS "Enable update for property owners" ON properties;
DROP POLICY IF EXISTS "Enable delete for property owners" ON properties;
DROP POLICY IF EXISTS "properties_select_policy" ON properties;
DROP POLICY IF EXISTS "properties_insert_policy" ON properties;
DROP POLICY IF EXISTS "properties_update_policy" ON properties;
DROP POLICY IF EXISTS "properties_delete_policy" ON properties;
DROP POLICY IF EXISTS "property_users_all_access" ON properties;
DROP POLICY IF EXISTS "properties_landlord_access" ON properties;
DROP POLICY IF EXISTS "properties_user_access" ON properties;
DROP POLICY IF EXISTS "properties_landlord_simple" ON properties;
DROP POLICY IF EXISTS "properties_user_simple" ON properties;

-- Drop all property_users policies
DROP POLICY IF EXISTS "property_users_select_policy" ON property_users;
DROP POLICY IF EXISTS "property_users_insert_policy" ON property_users;
DROP POLICY IF EXISTS "property_users_update_policy" ON property_users;
DROP POLICY IF EXISTS "property_users_delete_policy" ON property_users;
DROP POLICY IF EXISTS "property_users_all_access" ON property_users;
DROP POLICY IF EXISTS "property_users_simple_access" ON property_users;

-- Drop all tenants policies
DROP POLICY IF EXISTS "allow_all_for_debugging" ON tenants;
DROP POLICY IF EXISTS "property_owners_can_view_tenants" ON tenants;
DROP POLICY IF EXISTS "property_owners_can_insert_tenants" ON tenants;
DROP POLICY IF EXISTS "property_owners_can_update_tenants" ON tenants;
DROP POLICY IF EXISTS "property_owners_can_delete_tenants" ON tenants;

-- Step 3: Create new, simple, non-recursive policies

-- PROPERTY_USERS: Simple user-based access
CREATE POLICY "property_users_own_access" ON property_users
FOR ALL 
TO authenticated
USING (user_id = auth.uid());

-- PROPERTIES: Direct landlord access (no subqueries to avoid recursion)
CREATE POLICY "properties_direct_landlord" ON properties
FOR ALL 
TO authenticated
USING (landlord_id = auth.uid());

-- PROPERTIES: Simple property access via property_users (minimal subquery)
CREATE POLICY "properties_via_property_users" ON properties
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() AND status = 'ACTIVE'
  )
);

-- TENANTS: Simple access for property owners
CREATE POLICY "tenants_for_property_owners" ON tenants
FOR ALL
TO authenticated
USING (
  current_unit_id IN (
    SELECT u.id FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = auth.uid()
  )
);

-- Step 4: Re-enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Verification query (should not cause infinite recursion)
SELECT 'RLS policies updated successfully - infinite recursion should be resolved!' as status;
