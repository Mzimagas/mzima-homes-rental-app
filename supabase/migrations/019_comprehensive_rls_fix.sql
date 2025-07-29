-- Migration 019: Comprehensive RLS Fix for Production
-- This migration provides a complete, scalable solution for RLS policy violations
-- and access denied errors that works for any user and handles all edge cases

-- ============================================================================
-- STEP 1: Data Consistency Fixes
-- ============================================================================

-- Fix all landlord_id mismatches in existing properties
UPDATE properties 
SET landlord_id = subquery.correct_landlord_id,
    updated_at = NOW()
FROM (
  SELECT 
    p.id as property_id,
    COALESCE(
      -- First priority: OWNER role user
      (SELECT pu.user_id FROM property_users pu 
       WHERE pu.property_id = p.id 
       AND pu.role = 'OWNER' 
       AND pu.status = 'ACTIVE' 
       LIMIT 1),
      -- Second priority: PROPERTY_MANAGER role user
      (SELECT pu.user_id FROM property_users pu 
       WHERE pu.property_id = p.id 
       AND pu.role = 'PROPERTY_MANAGER' 
       AND pu.status = 'ACTIVE' 
       LIMIT 1),
      -- Keep existing landlord_id if no property_users found
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
-- STEP 2: Drop All Existing RLS Policies
-- ============================================================================

-- Properties table policies
DROP POLICY IF EXISTS "Property owners can insert properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON properties;
DROP POLICY IF EXISTS "Users can view properties they have access to" ON properties;
DROP POLICY IF EXISTS "Users can view accessible properties" ON properties;
DROP POLICY IF EXISTS "Property owners can update their properties" ON properties;
DROP POLICY IF EXISTS "Property owners can update properties" ON properties;
DROP POLICY IF EXISTS "Property owners can delete their properties" ON properties;
DROP POLICY IF EXISTS "Property owners can delete properties" ON properties;

-- Property_users table policies
DROP POLICY IF EXISTS "Users can view their property relationships" ON property_users;
DROP POLICY IF EXISTS "Property owners can manage property users" ON property_users;
DROP POLICY IF EXISTS "Users can update their own property relationships" ON property_users;

-- ============================================================================
-- STEP 3: Create Comprehensive Helper Functions
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

-- Function to safely add user to property
CREATE OR REPLACE FUNCTION add_user_to_property(
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
  
  IF NOT user_has_property_access(property_id, inviter_id, ARRAY['OWNER', 'PROPERTY_MANAGER']) THEN
    RAISE EXCEPTION 'Only property owners and managers can add users to properties';
  END IF;
  
  IF user_role NOT IN ('OWNER', 'PROPERTY_MANAGER', 'TENANT', 'MAINTENANCE') THEN
    RAISE EXCEPTION 'Invalid user role: %', user_role;
  END IF;
  
  -- Check if user already has access
  IF EXISTS (
    SELECT 1 FROM property_users 
    WHERE property_id = add_user_to_property.property_id
    AND user_id = new_user_id
    AND status IN ('ACTIVE', 'PENDING')
  ) THEN
    RAISE EXCEPTION 'User already has access to this property';
  END IF;
  
  -- Insert new property user
  INSERT INTO property_users (property_id, user_id, role, status, invited_by, created_at, updated_at)
  VALUES (
    add_user_to_property.property_id,
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

-- ============================================================================
-- STEP 4: Create New Comprehensive RLS Policies
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
    -- Allow owners to change anything
    user_has_property_access(id, auth.uid(), ARRAY['OWNER'])
    OR
    -- Allow managers to update but not change ownership
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
) WITH CHECK (
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
-- STEP 5: Grant Permissions and Create Indexes
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION user_has_property_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_to_property TO authenticated;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_property_users_user_property ON property_users(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_property_users_property_status ON property_users(property_id, status);
CREATE INDEX IF NOT EXISTS idx_property_users_user_status_role ON property_users(user_id, status, role);

-- ============================================================================
-- STEP 6: Add Helpful Comments
-- ============================================================================

COMMENT ON FUNCTION user_has_property_access IS 'Checks if a user has access to a property with optional role requirements';
COMMENT ON FUNCTION get_user_accessible_properties IS 'Returns all property IDs that a user can access';
COMMENT ON FUNCTION create_property_with_owner IS 'Safely creates a property and assigns ownership atomically';
COMMENT ON FUNCTION add_user_to_property IS 'Safely adds a user to a property with proper permission checks';

COMMENT ON POLICY "authenticated_users_can_insert_properties" ON properties IS 'Allows authenticated users to create properties they own';
COMMENT ON POLICY "users_can_view_accessible_properties" ON properties IS 'Users can view properties they own or have access to';
COMMENT ON POLICY "property_owners_can_update_properties" ON properties IS 'Property owners and managers can update properties';
COMMENT ON POLICY "property_owners_can_delete_properties" ON properties IS 'Only property owners can delete properties';
