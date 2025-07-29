-- Migration 018: Fix Properties RLS Violation
-- This migration addresses the RLS policy violation issues by:
-- 1. Fixing data consistency between properties and property_users
-- 2. Creating improved RLS policies
-- 3. Adding helper functions for property creation

-- Step 1: Fix data consistency
-- Update properties.landlord_id to match property_users.user_id for OWNER role
UPDATE properties 
SET landlord_id = (
  SELECT user_id 
  FROM property_users 
  WHERE property_id = properties.id 
  AND role = 'OWNER' 
  AND status = 'ACTIVE'
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM property_users 
  WHERE property_id = properties.id 
  AND role = 'OWNER' 
  AND status = 'ACTIVE'
  AND user_id != properties.landlord_id
);

-- Step 2: Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Property owners can insert properties" ON properties;
DROP POLICY IF EXISTS "Users can view properties they have access to" ON properties;
DROP POLICY IF EXISTS "Property owners can update their properties" ON properties;
DROP POLICY IF EXISTS "Property owners can delete their properties" ON properties;

-- Step 3: Create improved RLS policies

-- INSERT Policy: Allow authenticated users to insert properties they own
CREATE POLICY "Authenticated users can insert properties" ON properties
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND landlord_id = auth.uid()
);

-- SELECT Policy: Users can view properties they own or have access to
CREATE POLICY "Users can view accessible properties" ON properties
FOR SELECT USING (
  -- Direct landlord access
  landlord_id = auth.uid()
  OR
  -- Property users access (any active role)
  id IN (
    SELECT property_id 
    FROM property_users 
    WHERE user_id = auth.uid() 
    AND status = 'ACTIVE'
  )
);

-- UPDATE Policy: Property owners and managers can update properties
CREATE POLICY "Property owners can update properties" ON properties
FOR UPDATE USING (
  -- Direct landlord access
  landlord_id = auth.uid()
  OR
  -- Property users with management roles
  id IN (
    SELECT property_id 
    FROM property_users 
    WHERE user_id = auth.uid() 
    AND role IN ('OWNER', 'PROPERTY_MANAGER')
    AND status = 'ACTIVE'
  )
) WITH CHECK (
  -- Ensure landlord_id doesn't change to someone else
  landlord_id = auth.uid()
  OR
  -- Allow property managers to update but not change ownership
  (
    id IN (
      SELECT property_id 
      FROM property_users 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'PROPERTY_MANAGER')
      AND status = 'ACTIVE'
    )
    AND landlord_id = OLD.landlord_id
  )
);

-- DELETE Policy: Only property owners can delete properties
CREATE POLICY "Property owners can delete properties" ON properties
FOR DELETE USING (
  -- Direct landlord access
  landlord_id = auth.uid()
  OR
  -- Property users with OWNER role only
  id IN (
    SELECT property_id 
    FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER'
    AND status = 'ACTIVE'
  )
);

-- Step 4: Create helper function for atomic property creation
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
  -- Validate input
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create property';
  END IF;
  
  IF property_name IS NULL OR trim(property_name) = '' THEN
    RAISE EXCEPTION 'Property name is required';
  END IF;
  
  IF property_address IS NULL OR trim(property_address) = '' THEN
    RAISE EXCEPTION 'Property address is required';
  END IF;
  
  -- Insert property with correct column names
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
    -- Log the error and re-raise
    RAISE EXCEPTION 'Failed to create property: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;

-- Step 5: Create function to check user property access
CREATE OR REPLACE FUNCTION user_has_property_access(
  property_id UUID,
  user_id UUID DEFAULT auth.uid(),
  required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
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
  IF required_role IS NULL THEN
    -- Any active role is sufficient
    RETURN EXISTS (
      SELECT 1 FROM property_users 
      WHERE property_id = user_has_property_access.property_id
      AND user_id = user_has_property_access.user_id
      AND status = 'ACTIVE'
    );
  ELSE
    -- Specific role required
    RETURN EXISTS (
      SELECT 1 FROM property_users 
      WHERE property_id = user_has_property_access.property_id
      AND user_id = user_has_property_access.user_id
      AND role = required_role
      AND status = 'ACTIVE'
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_has_property_access TO authenticated;

-- Step 6: Create function to safely add property users
CREATE OR REPLACE FUNCTION add_property_user(
  property_id UUID,
  new_user_id UUID,
  user_role TEXT DEFAULT 'TENANT',
  inviter_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_user_id UUID;
BEGIN
  -- Validate inputs
  IF inviter_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to add property users';
  END IF;
  
  IF NOT user_has_property_access(property_id, inviter_id, 'OWNER') THEN
    RAISE EXCEPTION 'Only property owners can add users to properties';
  END IF;
  
  IF user_role NOT IN ('OWNER', 'PROPERTY_MANAGER', 'TENANT', 'MAINTENANCE') THEN
    RAISE EXCEPTION 'Invalid user role: %', user_role;
  END IF;
  
  -- Check if user already has access to this property
  IF EXISTS (
    SELECT 1 FROM property_users 
    WHERE property_id = add_property_user.property_id
    AND user_id = new_user_id
    AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'User already has active access to this property';
  END IF;
  
  -- Insert new property user
  INSERT INTO property_users (property_id, user_id, role, status, invited_by, created_at, updated_at)
  VALUES (
    add_property_user.property_id,
    new_user_id,
    user_role,
    'PENDING',
    inviter_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO property_user_id;
  
  RETURN property_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_property_user TO authenticated;

-- Step 7: Add helpful comments
COMMENT ON POLICY "Authenticated users can insert properties" ON properties IS 
'Allows authenticated users to create properties where they are the landlord';

COMMENT ON POLICY "Users can view accessible properties" ON properties IS 
'Users can view properties they own directly or have access to via property_users';

COMMENT ON POLICY "Property owners can update properties" ON properties IS 
'Property owners and managers can update properties, but only owners can change ownership';

COMMENT ON POLICY "Property owners can delete properties" ON properties IS 
'Only property owners can delete properties';

COMMENT ON FUNCTION create_property_with_owner(TEXT, TEXT, TEXT, UUID) IS 
'Atomically creates a property and assigns the owner role to the creator';

COMMENT ON FUNCTION user_has_property_access(UUID, UUID, TEXT) IS 
'Checks if a user has access to a property, optionally with a specific role';

COMMENT ON FUNCTION add_property_user(UUID, UUID, TEXT, UUID) IS 
'Safely adds a user to a property with proper permission checks';

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_property_users_user_property ON property_users(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_property_users_property_status ON property_users(property_id, status);
CREATE INDEX IF NOT EXISTS idx_property_users_user_status ON property_users(user_id, status);

-- Step 9: Log the migration
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
  '018_fix_properties_rls_violation', 
  NOW(), 
  'Fixed RLS policy violations by improving policies, fixing data consistency, and adding helper functions'
) ON CONFLICT (migration_name) DO UPDATE SET 
  applied_at = NOW(),
  description = EXCLUDED.description;
