-- Fix existing functions by dropping and recreating them
-- This resolves the "cannot change return type" error

-- Drop ALL existing function variants first
DROP FUNCTION IF EXISTS get_user_accessible_properties();
DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID);
DROP FUNCTION IF EXISTS get_user_properties_simple();

-- Create ONLY the parameterized version (what the frontend expects)
CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(property_id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return properties where user is the landlord
  RETURN QUERY
  SELECT DISTINCT p.id as property_id, 'OWNER'::TEXT as role
  FROM properties p
  WHERE p.landlord_id = user_uuid

  UNION

  -- Return properties where user has access via property_users
  SELECT DISTINCT pu.property_id, pu.role::TEXT
  FROM property_users pu
  WHERE pu.user_id = user_uuid
    AND pu.status = 'ACTIVE';
END;
$$;

-- Create simpler version that just returns property IDs
CREATE OR REPLACE FUNCTION get_user_properties_simple()
RETURNS TABLE(property_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return properties where user is the landlord
  RETURN QUERY
  SELECT DISTINCT p.id as property_id
  FROM properties p
  WHERE p.landlord_id = auth.uid()
  
  UNION
  
  -- Return properties where user has access via property_users
  SELECT DISTINCT pu.property_id
  FROM property_users pu
  WHERE pu.user_id = auth.uid()
    AND pu.status = 'ACTIVE';
END;
$$;

-- Grant permissions to the function
GRANT EXECUTE ON FUNCTION get_user_accessible_properties(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_properties_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_properties_simple TO service_role;

-- Test the functions
SELECT 'Functions recreated successfully!' as status;

-- Test that the function works (with explicit parameter)
SELECT COUNT(*) as accessible_properties_count
FROM get_user_accessible_properties(auth.uid());

SELECT 'All functions are working!' as final_status;
