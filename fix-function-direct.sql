-- Fix get_user_accessible_properties function to return correct format
-- This function should return property details with permissions for the frontend

-- Step 1: Drop existing function
DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID);
DROP FUNCTION IF EXISTS get_user_accessible_properties();

-- Step 2: Create the correct function that matches frontend expectations
CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
  property_id UUID,
  property_name TEXT,
  user_role user_role,
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
    (pu.role = 'OWNER') as can_manage_users,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) as can_manage_maintenance
  FROM properties p
  JOIN property_users pu ON p.id = pu.property_id
  WHERE pu.user_id = user_uuid
    AND pu.status = 'ACTIVE'
  
  UNION
  
  -- Also include properties where user is the direct landlord (for backward compatibility)
  SELECT 
    p.id as property_id,
    p.name as property_name,
    'OWNER'::user_role as user_role,
    true as can_manage_users,
    true as can_edit_property,
    true as can_manage_tenants,
    true as can_manage_maintenance
  FROM properties p
  WHERE p.landlord_id = user_uuid
    AND NOT EXISTS (
      SELECT 1 FROM property_users pu2 
      WHERE pu2.property_id = p.id AND pu2.user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO service_role;
