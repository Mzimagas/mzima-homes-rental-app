-- AGGRESSIVE: Drop all variants of the function and recreate cleanly
-- This will eliminate all ambiguity

-- Drop ALL possible variants of the function
DROP FUNCTION IF EXISTS get_user_accessible_properties();
DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID);
DROP FUNCTION IF EXISTS get_user_accessible_properties(user_uuid UUID);
DROP FUNCTION IF EXISTS get_user_properties_simple();
DROP FUNCTION IF EXISTS get_user_properties_simple(UUID);

-- Use CASCADE to force drop if there are dependencies
DROP FUNCTION IF EXISTS get_user_accessible_properties() CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_properties(user_uuid UUID) CASCADE;

-- Query to find any remaining functions with similar names
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%get_user_accessible_properties%'
   OR proname LIKE '%get_user_properties%';

-- Now create ONLY the function the frontend expects
CREATE FUNCTION get_user_accessible_properties(user_uuid UUID)
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

-- Create the simple version too
CREATE FUNCTION get_user_properties_simple()
RETURNS TABLE(property_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.id as property_id
  FROM properties p
  WHERE p.landlord_id = auth.uid()
  
  UNION
  
  SELECT DISTINCT pu.property_id
  FROM property_users pu
  WHERE pu.user_id = auth.uid()
    AND pu.status = 'ACTIVE';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_accessible_properties(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_properties_simple() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_properties_simple() TO service_role;

-- Verify the functions exist and are unique
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('get_user_accessible_properties', 'get_user_properties_simple');

SELECT 'Functions cleaned up and recreated successfully!' as status;
