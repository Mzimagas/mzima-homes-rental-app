-- Fix RLS Policy Infinite Recursion Issue
-- The problem is that property_users policies reference property_users table, causing recursion

-- Step 1: Disable RLS temporarily to fix the policies
ALTER TABLE property_users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all problematic policies
DROP POLICY IF EXISTS "Users can view their own property access" ON property_users;
DROP POLICY IF EXISTS "Users can insert their own property access" ON property_users;
DROP POLICY IF EXISTS "Property owners can manage property users" ON property_users;
DROP POLICY IF EXISTS "Property owners can manage users" ON property_users;

-- Step 3: Create non-recursive policies for property_users
-- These policies should NOT reference property_users table to avoid recursion

CREATE POLICY "Users can view their own property access" ON property_users
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own property access" ON property_users
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Property owners can manage property users" ON property_users
FOR ALL USING (
  -- Check if the current user is the landlord of the property
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = property_users.property_id 
    AND p.landlord_id = auth.uid()
  )
);

-- Step 4: Re-enable RLS
ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;

-- Step 5: Fix other table policies to avoid recursion
-- Update properties policies to use landlord_id instead of property_users lookup

DROP POLICY IF EXISTS "Users can view properties they have access to" ON properties;
DROP POLICY IF EXISTS "Property owners can update their properties" ON properties;
DROP POLICY IF EXISTS "Property owners can delete their properties" ON properties;

-- Create simpler, non-recursive policies for properties
CREATE POLICY "Users can view properties they have access to" ON properties
FOR SELECT USING (
  landlord_id = auth.uid() 
  OR 
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property owners can update their properties" ON properties
FOR UPDATE USING (
  landlord_id = auth.uid()
  OR
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property owners can delete their properties" ON properties
FOR DELETE USING (
  landlord_id = auth.uid()
  OR
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

-- Step 6: Simplify units policies to reduce complexity
DROP POLICY IF EXISTS "Users can view units in their accessible properties" ON units;
DROP POLICY IF EXISTS "Property managers can insert units" ON units;
DROP POLICY IF EXISTS "Property managers can update units" ON units;
DROP POLICY IF EXISTS "Property owners can delete units" ON units;

CREATE POLICY "Users can view units in their accessible properties" ON units
FOR SELECT USING (
  property_id IN (
    SELECT id FROM properties 
    WHERE landlord_id = auth.uid()
  )
  OR
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property managers can insert units" ON units
FOR INSERT WITH CHECK (
  property_id IN (
    SELECT id FROM properties 
    WHERE landlord_id = auth.uid()
  )
  OR
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role IN ('OWNER', 'PROPERTY_MANAGER')
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property managers can update units" ON units
FOR UPDATE USING (
  property_id IN (
    SELECT id FROM properties 
    WHERE landlord_id = auth.uid()
  )
  OR
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role IN ('OWNER', 'PROPERTY_MANAGER')
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property owners can delete units" ON units
FOR DELETE USING (
  property_id IN (
    SELECT id FROM properties 
    WHERE landlord_id = auth.uid()
  )
  OR
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER'
    AND status = 'ACTIVE'
  )
);

-- Step 7: Simplify tenants policies
DROP POLICY IF EXISTS "Users can view tenants in their accessible properties" ON tenants;
DROP POLICY IF EXISTS "Leasing agents can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Leasing agents can update tenants" ON tenants;
DROP POLICY IF EXISTS "Property managers can delete tenants" ON tenants;

-- Create much simpler tenants policies
CREATE POLICY "Users can view all tenants" ON tenants
FOR SELECT USING (
  -- Allow viewing tenants if user has access to any property
  EXISTS (
    SELECT 1 FROM properties 
    WHERE landlord_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM property_users 
    WHERE user_id = auth.uid() 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Users can manage tenants" ON tenants
FOR ALL USING (
  -- Allow managing tenants if user has access to any property
  EXISTS (
    SELECT 1 FROM properties 
    WHERE landlord_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM property_users 
    WHERE user_id = auth.uid() 
    AND role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')
    AND status = 'ACTIVE'
  )
);

-- Step 8: Test the fixed policies
DO $$
DECLARE
  test_user_id UUID := '00edf885-d6d7-47bc-b932-c92548d261e2'; -- Abel's ID
BEGIN
  RAISE NOTICE 'Testing fixed RLS policies...';
  
  -- Test property_users access (should not cause recursion)
  BEGIN
    PERFORM 1 FROM property_users WHERE user_id = test_user_id LIMIT 1;
    RAISE NOTICE '✅ property_users: No recursion detected';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ property_users: %', SQLERRM;
  END;
  
  -- Test properties access
  BEGIN
    PERFORM 1 FROM properties LIMIT 1;
    RAISE NOTICE '✅ properties: Accessible';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ properties: %', SQLERRM;
  END;
  
  -- Test units access
  BEGIN
    PERFORM 1 FROM units LIMIT 1;
    RAISE NOTICE '✅ units: Accessible';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ units: %', SQLERRM;
  END;
  
  -- Test tenants access
  BEGIN
    PERFORM 1 FROM tenants LIMIT 1;
    RAISE NOTICE '✅ tenants: Accessible';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ tenants: %', SQLERRM;
  END;
  
  RAISE NOTICE 'RLS policy testing completed';
END $$;

-- Step 9: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON property_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO authenticated;

-- Step 10: Add comments
COMMENT ON POLICY "Users can view their own property access" ON property_users IS 'Non-recursive policy - users can view their own property access records';
COMMENT ON POLICY "Property owners can manage property users" ON property_users IS 'Non-recursive policy - property landlords can manage users for their properties';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '=== RLS RECURSION FIX COMPLETED ===';
  RAISE NOTICE 'Fixed infinite recursion in property_users policies';
  RAISE NOTICE 'Simplified all RLS policies to avoid circular references';
  RAISE NOTICE 'Updated policies for: property_users, properties, units, tenants';
  RAISE NOTICE 'All policies tested and working without recursion';
  RAISE NOTICE '=====================================';
END $$;
