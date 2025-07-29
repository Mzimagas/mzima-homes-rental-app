-- Migration 016: Update RLS Policies for Multi-User Property Access
-- This migration updates all RLS policies to use property_users table instead of direct landlord_id checks

-- Step 1: Update Properties table RLS policies
DROP POLICY IF EXISTS "Landlords can view their properties" ON properties;
DROP POLICY IF EXISTS "Landlords can insert their properties" ON properties;
DROP POLICY IF EXISTS "Landlords can update their properties" ON properties;
DROP POLICY IF EXISTS "Landlords can delete their properties" ON properties;

-- Create new multi-user policies for properties
CREATE POLICY "Users can view properties they have access to" ON properties
FOR SELECT USING (
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property owners can insert properties" ON properties
FOR INSERT WITH CHECK (
  -- Only allow if user will be set as owner (handled by application logic)
  auth.uid() IS NOT NULL
);

CREATE POLICY "Property owners can update their properties" ON properties
FOR UPDATE USING (
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property owners can delete their properties" ON properties
FOR DELETE USING (
  id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

-- Step 2: Update Units table RLS policies
DROP POLICY IF EXISTS "Landlords can view their units" ON units;
DROP POLICY IF EXISTS "Landlords can insert their units" ON units;
DROP POLICY IF EXISTS "Landlords can update their units" ON units;
DROP POLICY IF EXISTS "Landlords can delete their units" ON units;

-- Create new multi-user policies for units
CREATE POLICY "Users can view units in their accessible properties" ON units
FOR SELECT USING (
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property managers can insert units" ON units
FOR INSERT WITH CHECK (
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
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role IN ('OWNER', 'PROPERTY_MANAGER')
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property owners can delete units" ON units
FOR DELETE USING (
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER'
    AND status = 'ACTIVE'
  )
);

-- Step 3: Update Tenants table RLS policies
DROP POLICY IF EXISTS "Landlords can view their tenants" ON tenants;
DROP POLICY IF EXISTS "Landlords can insert their tenants" ON tenants;
DROP POLICY IF EXISTS "Landlords can update their tenants" ON tenants;
DROP POLICY IF EXISTS "Landlords can delete their tenants" ON tenants;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON tenants;

-- Create new multi-user policies for tenants
CREATE POLICY "Users can view tenants in their accessible properties" ON tenants
FOR SELECT USING (
  current_unit_id IN (
    SELECT u.id FROM units u
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.status = 'ACTIVE'
  )
  OR
  id IN (
    SELECT ta.tenant_id FROM tenancy_agreements ta
    JOIN units u ON ta.unit_id = u.id
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.status = 'ACTIVE'
  )
);

CREATE POLICY "Leasing agents can insert tenants" ON tenants
FOR INSERT WITH CHECK (
  -- Allow users with tenant management permissions
  EXISTS (
    SELECT 1 FROM property_users pu
    WHERE pu.user_id = auth.uid()
    AND pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')
    AND pu.status = 'ACTIVE'
  )
);

CREATE POLICY "Leasing agents can update tenants" ON tenants
FOR UPDATE USING (
  current_unit_id IN (
    SELECT u.id FROM units u
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')
    AND pu.status = 'ACTIVE'
  )
  OR
  id IN (
    SELECT ta.tenant_id FROM tenancy_agreements ta
    JOIN units u ON ta.unit_id = u.id
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')
    AND pu.status = 'ACTIVE'
  )
);

CREATE POLICY "Property managers can delete tenants" ON tenants
FOR DELETE USING (
  current_unit_id IN (
    SELECT u.id FROM units u
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.role IN ('OWNER', 'PROPERTY_MANAGER')
    AND pu.status = 'ACTIVE'
  )
  OR
  id IN (
    SELECT ta.tenant_id FROM tenancy_agreements ta
    JOIN units u ON ta.unit_id = u.id
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.role IN ('OWNER', 'PROPERTY_MANAGER')
    AND pu.status = 'ACTIVE'
  )
);

-- Step 4: Update Tenancy Agreements table RLS policies
DROP POLICY IF EXISTS "Landlords can view their tenancy agreements" ON tenancy_agreements;
DROP POLICY IF EXISTS "Landlords can insert their tenancy agreements" ON tenancy_agreements;
DROP POLICY IF EXISTS "Landlords can update their tenancy agreements" ON tenancy_agreements;
DROP POLICY IF EXISTS "Landlords can delete their tenancy agreements" ON tenancy_agreements;

-- Create new multi-user policies for tenancy agreements
CREATE POLICY "Users can view tenancy agreements in their accessible properties" ON tenancy_agreements
FOR SELECT USING (
  unit_id IN (
    SELECT u.id FROM units u
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.status = 'ACTIVE'
  )
);

CREATE POLICY "Leasing agents can insert tenancy agreements" ON tenancy_agreements
FOR INSERT WITH CHECK (
  unit_id IN (
    SELECT u.id FROM units u
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')
    AND pu.status = 'ACTIVE'
  )
);

CREATE POLICY "Leasing agents can update tenancy agreements" ON tenancy_agreements
FOR UPDATE USING (
  unit_id IN (
    SELECT u.id FROM units u
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')
    AND pu.status = 'ACTIVE'
  )
);

CREATE POLICY "Property managers can delete tenancy agreements" ON tenancy_agreements
FOR DELETE USING (
  unit_id IN (
    SELECT u.id FROM units u
    JOIN property_users pu ON u.property_id = pu.property_id
    WHERE pu.user_id = auth.uid() 
    AND pu.role IN ('OWNER', 'PROPERTY_MANAGER')
    AND pu.status = 'ACTIVE'
  )
);

-- Step 5: Create helper function for property access check (used in frontend)
CREATE OR REPLACE FUNCTION get_accessible_properties_for_user(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
  property_id UUID,
  property_name TEXT,
  user_role user_role,
  permissions JSONB,
  can_manage_users BOOLEAN,
  can_edit_property BOOLEAN,
  can_manage_tenants BOOLEAN,
  can_manage_maintenance BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as property_id,
    p.name as property_name,
    pu.role as user_role,
    pu.permissions,
    (pu.role = 'OWNER') as can_manage_users,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) as can_manage_maintenance
  FROM properties p
  JOIN property_users pu ON p.id = pu.property_id
  WHERE pu.user_id = user_uuid
  AND pu.status = 'ACTIVE'
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to check if user can access specific property
CREATE OR REPLACE FUNCTION can_user_access_property(
  user_uuid UUID,
  property_uuid UUID,
  required_permission TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  has_access BOOLEAN := FALSE;
BEGIN
  -- Get user role for this property
  SELECT role INTO user_role_val
  FROM property_users 
  WHERE user_id = user_uuid 
  AND property_id = property_uuid 
  AND status = 'ACTIVE';
  
  -- If no role found, no access
  IF user_role_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If no specific permission required, just check if user has access
  IF required_permission IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission using existing function
  RETURN user_has_permission(user_uuid, property_uuid, required_permission);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant permissions on new functions
GRANT EXECUTE ON FUNCTION get_accessible_properties_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_property(UUID, UUID, TEXT) TO authenticated;

-- Step 8: Create view for easy property access checking
CREATE OR REPLACE VIEW user_property_access AS
SELECT 
  pu.user_id,
  pu.property_id,
  p.name as property_name,
  pu.role,
  pu.status,
  pu.permissions,
  pu.accepted_at,
  (pu.role = 'OWNER') as is_owner,
  (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
  (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants,
  (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) as can_manage_maintenance,
  (pu.role != 'VIEWER') as can_create_data
FROM property_users pu
JOIN properties p ON pu.property_id = p.id
WHERE pu.status = 'ACTIVE';

-- Grant access to the view
GRANT SELECT ON user_property_access TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Users can view their own property access" ON user_property_access
FOR SELECT USING (user_id = auth.uid());

-- Add comments
COMMENT ON FUNCTION get_accessible_properties_for_user(UUID) IS 'Returns all properties accessible by a user with their permissions';
COMMENT ON FUNCTION can_user_access_property(UUID, UUID, TEXT) IS 'Checks if a user can access a specific property with optional permission check';
COMMENT ON VIEW user_property_access IS 'Provides easy access to user property permissions and capabilities';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 016: RLS policies updated for multi-user access';
  RAISE NOTICE 'Updated policies for: properties, units, tenants, tenancy_agreements';
  RAISE NOTICE 'Created helper functions: get_accessible_properties_for_user, can_user_access_property';
  RAISE NOTICE 'Created view: user_property_access';
  RAISE NOTICE 'Multi-user RLS system is now active';
END $$;
