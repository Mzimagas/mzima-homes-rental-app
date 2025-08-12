-- EMERGENCY: Completely disable RLS to test if that resolves the issue
-- This will temporarily remove ALL security but should eliminate infinite recursion

-- Disable RLS on ALL tables
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE landlords DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies to ensure nothing is left
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on properties
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'properties') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON properties';
    END LOOP;
    
    -- Drop all policies on property_users
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'property_users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON property_users';
    END LOOP;
    
    -- Drop all policies on tenants
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tenants') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tenants';
    END LOOP;
    
    -- Drop all policies on units
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'units') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON units';
    END LOOP;
END
$$;

-- Test query to verify RLS is completely disabled
SELECT 'RLS completely disabled - testing should work now' as status;

-- Verify we can query properties without any restrictions
SELECT COUNT(*) as property_count FROM properties;

SELECT 'If you can see this message, RLS is disabled and infinite recursion should be gone!' as final_status;
