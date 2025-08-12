-- SIMPLE: Disable RLS only on tables that exist
-- This avoids errors from non-existent tables

-- Disable RLS on existing tables only
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies using dynamic SQL for existing tables
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on properties
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'properties' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON properties';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
    
    -- Drop all policies on property_users
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'property_users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON property_users';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
    
    -- Drop all policies on tenants
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tenants' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tenants';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
    
    -- Drop all policies on units
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'units' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON units';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END
$$;

-- Verify RLS is disabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('properties', 'property_users', 'tenants', 'units')
AND schemaname = 'public';

-- Test query
SELECT 'RLS disabled on all existing tables - infinite recursion should be gone!' as status;

-- Count records to verify access
SELECT 
    (SELECT COUNT(*) FROM properties) as properties_count,
    (SELECT COUNT(*) FROM property_users) as property_users_count,
    (SELECT COUNT(*) FROM tenants) as tenants_count,
    (SELECT COUNT(*) FROM units) as units_count;
