-- Create the missing get_user_accessible_properties function
-- This function returns properties that the current user can access

CREATE OR REPLACE FUNCTION get_user_accessible_properties()
RETURNS TABLE(property_id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return properties where user is the landlord
  RETURN QUERY
  SELECT DISTINCT p.id as property_id, 'OWNER'::TEXT as role
  FROM properties p
  WHERE p.landlord_id = auth.uid()
  
  UNION
  
  -- Return properties where user has access via property_users
  SELECT DISTINCT pu.property_id, pu.role::TEXT
  FROM property_users pu
  WHERE pu.user_id = auth.uid()
    AND pu.status = 'ACTIVE';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO service_role;

-- Test the function
SELECT 'Function get_user_accessible_properties created successfully!' as status;

-- Also create a simpler version that just returns property IDs
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_properties_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_properties_simple TO service_role;

SELECT 'All missing functions created successfully!' as final_status;
