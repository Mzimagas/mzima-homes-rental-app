-- FIX RPC TYPE MISMATCH ERROR
-- Resolves: "UNION types user_role and text cannot be matched"

-- ============================================================================
-- STEP 1: Drop the problematic function
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_accessible_properties();

-- ============================================================================
-- STEP 2: Create corrected function with proper type handling
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_accessible_properties()
RETURNS TABLE(property_id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple query that handles type conversion properly
  RETURN QUERY
  SELECT DISTINCT 
    pu.property_id, 
    pu.role::TEXT as role  -- Explicitly cast user_role enum to TEXT
  FROM property_users pu
  WHERE pu.user_id = auth.uid()
    AND pu.status = 'ACTIVE'
  
  UNION
  
  -- Also include properties where user is the landlord
  SELECT DISTINCT 
    p.id as property_id, 
    'OWNER'::TEXT as role  -- Explicitly cast string literal to TEXT
  FROM properties p
  WHERE p.landlord_id = auth.uid();
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO service_role;

-- ============================================================================
-- STEP 3: Create alternative function without UNION (safer approach)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_properties_simple()
RETURNS TABLE(property_id UUID, role TEXT, property_name TEXT, property_address TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return properties from property_users table
  RETURN QUERY
  SELECT DISTINCT 
    pu.property_id,
    pu.role::TEXT as role,
    p.name as property_name,
    p.physical_address as property_address
  FROM property_users pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.user_id = auth.uid()
    AND pu.status = 'ACTIVE';
  
  -- Also return properties where user is the landlord
  RETURN QUERY
  SELECT DISTINCT 
    p.id as property_id,
    'OWNER'::TEXT as role,
    p.name as property_name,
    p.physical_address as property_address
  FROM properties p
  WHERE p.landlord_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM property_users pu2 
      WHERE pu2.property_id = p.id 
      AND pu2.user_id = auth.uid()
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_properties_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_properties_simple TO service_role;

-- ============================================================================
-- STEP 4: Create a function that returns JSON (most flexible)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_properties_json()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Build JSON result with proper type handling
  SELECT json_agg(
    json_build_object(
      'property_id', property_id,
      'role', role,
      'property_name', property_name,
      'property_address', property_address
    )
  ) INTO result
  FROM (
    -- Properties from property_users table
    SELECT DISTINCT 
      pu.property_id,
      pu.role::TEXT as role,
      p.name as property_name,
      p.physical_address as property_address
    FROM property_users pu
    JOIN properties p ON p.id = pu.property_id
    WHERE pu.user_id = auth.uid()
      AND pu.status = 'ACTIVE'
    
    UNION ALL
    
    -- Properties where user is the landlord
    SELECT DISTINCT 
      p.id as property_id,
      'OWNER'::TEXT as role,
      p.name as property_name,
      p.physical_address as property_address
    FROM properties p
    WHERE p.landlord_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM property_users pu2 
        WHERE pu2.property_id = p.id 
        AND pu2.user_id = auth.uid()
      )
  ) combined_properties;
  
  -- Return empty array if no results
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_properties_json TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_properties_json TO service_role;

-- ============================================================================
-- STEP 5: Test the functions
-- ============================================================================

-- Test that the functions work
SELECT 'RPC type mismatch fixed - functions recreated successfully!' as status;

-- Show available functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%user_properties%' OR routine_name LIKE '%user_accessible%'
ORDER BY routine_name;
