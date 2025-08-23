-- 036: Additional functions for rental management system

-- Function to get total outstanding rent across all properties for a user
CREATE OR REPLACE FUNCTION get_total_outstanding_rent()
RETURNS DECIMAL(15,2) AS $$
DECLARE
  total_outstanding DECIMAL(15,2) := 0;
BEGIN
  -- This is a simplified calculation
  -- In a real system, you would calculate based on rent_invoices and payments
  -- For now, we'll return 0 as a placeholder
  SELECT COALESCE(SUM(0), 0) INTO total_outstanding;
  
  RETURN total_outstanding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a property
CREATE OR REPLACE FUNCTION check_property_access(user_id UUID, property_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN := FALSE;
BEGIN
  -- Check if user is the property owner
  SELECT EXISTS(
    SELECT 1 FROM properties 
    WHERE id = property_id AND landlord_id = user_id
  ) INTO has_access;
  
  -- If not owner, check property_users table
  IF NOT has_access THEN
    SELECT EXISTS(
      SELECT 1 FROM property_users 
      WHERE property_id = check_property_access.property_id 
      AND user_id = check_property_access.user_id 
      AND status = 'ACCEPTED'
    ) INTO has_access;
  END IF;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible properties
CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_id UUID)
RETURNS TABLE (
  property_id UUID,
  property_name TEXT,
  user_role TEXT,
  access_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Properties owned by user
  SELECT 
    p.id as property_id,
    p.name as property_name,
    'OWNER'::TEXT as user_role,
    'FULL'::TEXT as access_level
  FROM properties p
  WHERE p.landlord_id = user_id
  AND p.lifecycle_status = 'ACTIVE'
  
  UNION ALL
  
  -- Properties accessible through property_users
  SELECT 
    pu.property_id,
    p.name as property_name,
    pu.role::TEXT as user_role,
    CASE 
      WHEN pu.role = 'OWNER' THEN 'FULL'
      WHEN pu.role = 'PROPERTY_MANAGER' THEN 'MANAGE'
      ELSE 'VIEW'
    END as access_level
  FROM property_users pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.user_id = get_user_accessible_properties.user_id
  AND pu.status = 'ACCEPTED'
  AND p.lifecycle_status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rental dashboard statistics
CREATE OR REPLACE FUNCTION get_rental_dashboard_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  accessible_properties UUID[];
BEGIN
  -- Get user's accessible properties
  SELECT ARRAY(
    SELECT property_id FROM get_user_accessible_properties(user_id)
  ) INTO accessible_properties;
  
  -- Calculate statistics
  SELECT json_build_object(
    'total_properties', (
      SELECT COUNT(*)
      FROM properties
      WHERE id = ANY(accessible_properties)
    ),
    'total_units', (
      SELECT COUNT(*)
      FROM units
      WHERE property_id = ANY(accessible_properties)
      AND is_active = true
    ),
    'occupied_units', (
      SELECT COUNT(DISTINCT u.id)
      FROM units u
      JOIN tenancy_agreements ta ON ta.unit_id = u.id
      WHERE u.property_id = ANY(accessible_properties)
      AND u.is_active = true
      AND ta.status = 'ACTIVE'
    ),
    'monthly_income', (
      SELECT COALESCE(SUM(u.monthly_rent_kes), 0)
      FROM units u
      JOIN tenancy_agreements ta ON ta.unit_id = u.id
      WHERE u.property_id = ANY(accessible_properties)
      AND u.is_active = true
      AND ta.status = 'ACTIVE'
    ),
    'maintenance_requests', (
      SELECT COUNT(*)
      FROM maintenance_requests
      WHERE property_id = ANY(accessible_properties)
      AND status NOT IN ('COMPLETED', 'CANCELLED')
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent activity for dashboard
CREATE OR REPLACE FUNCTION get_recent_activity(user_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  activity_type TEXT,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  property_name TEXT,
  icon TEXT
) AS $$
DECLARE
  accessible_properties UUID[];
BEGIN
  -- Get user's accessible properties
  SELECT ARRAY(
    SELECT property_id FROM get_user_accessible_properties(user_id)
  ) INTO accessible_properties;
  
  RETURN QUERY
  (
    -- Recent tenant additions
    SELECT 
      'tenant_added'::TEXT as activity_type,
      'New Tenant Added'::TEXT as title,
      ('Tenant ' || t.full_name || ' was added to the system')::TEXT as description,
      t.created_at,
      ''::TEXT as property_name,
      '👤'::TEXT as icon
    FROM tenants t
    WHERE t.created_at >= now() - INTERVAL '30 days'
    ORDER BY t.created_at DESC
    LIMIT 5
  )
  
  UNION ALL
  
  (
    -- Recent maintenance requests
    SELECT 
      'maintenance_request'::TEXT as activity_type,
      'Maintenance Request'::TEXT as title,
      mr.title as description,
      mr.created_at,
      p.name as property_name,
      '🔧'::TEXT as icon
    FROM maintenance_requests mr
    JOIN properties p ON p.id = mr.property_id
    WHERE mr.property_id = ANY(accessible_properties)
    AND mr.created_at >= now() - INTERVAL '30 days'
    ORDER BY mr.created_at DESC
    LIMIT 5
  )
  
  UNION ALL
  
  (
    -- Recent lease agreements
    SELECT 
      'lease_created'::TEXT as activity_type,
      'New Lease Agreement'::TEXT as title,
      ('Lease agreement created for ' || t.full_name)::TEXT as description,
      ta.created_at,
      p.name as property_name,
      '📋'::TEXT as icon
    FROM tenancy_agreements ta
    JOIN tenants t ON t.id = ta.tenant_id
    JOIN units u ON u.id = ta.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE u.property_id = ANY(accessible_properties)
    AND ta.created_at >= now() - INTERVAL '30 days'
    ORDER BY ta.created_at DESC
    LIMIT 5
  )
  
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get property rental statistics
CREATE OR REPLACE FUNCTION get_property_rental_stats(property_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_units', (
      SELECT COUNT(*)
      FROM units
      WHERE property_id = get_property_rental_stats.property_id
      AND is_active = true
    ),
    'occupied_units', (
      SELECT COUNT(DISTINCT u.id)
      FROM units u
      JOIN tenancy_agreements ta ON ta.unit_id = u.id
      WHERE u.property_id = get_property_rental_stats.property_id
      AND u.is_active = true
      AND ta.status = 'ACTIVE'
    ),
    'monthly_income', (
      SELECT COALESCE(SUM(u.monthly_rent_kes), 0)
      FROM units u
      JOIN tenancy_agreements ta ON ta.unit_id = u.id
      WHERE u.property_id = get_property_rental_stats.property_id
      AND u.is_active = true
      AND ta.status = 'ACTIVE'
    ),
    'average_rent', (
      SELECT COALESCE(AVG(monthly_rent_kes), 0)
      FROM units
      WHERE property_id = get_property_rental_stats.property_id
      AND is_active = true
      AND monthly_rent_kes > 0
    ),
    'maintenance_requests_open', (
      SELECT COUNT(*)
      FROM maintenance_requests
      WHERE property_id = get_property_rental_stats.property_id
      AND status NOT IN ('COMPLETED', 'CANCELLED')
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant rental history
CREATE OR REPLACE FUNCTION get_tenant_rental_history(tenant_id UUID)
RETURNS TABLE (
  property_name TEXT,
  unit_label TEXT,
  start_date DATE,
  end_date DATE,
  monthly_rent DECIMAL(12,2),
  status TEXT,
  duration_months INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.name as property_name,
    u.unit_label,
    ta.start_date,
    ta.end_date,
    ta.monthly_rent_kes as monthly_rent,
    ta.status,
    CASE 
      WHEN ta.end_date IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (ta.end_date - ta.start_date)) / (30.44 * 24 * 3600)
      ELSE 
        EXTRACT(EPOCH FROM (CURRENT_DATE - ta.start_date)) / (30.44 * 24 * 3600)
    END::INTEGER as duration_months
  FROM tenancy_agreements ta
  JOIN units u ON u.id = ta.unit_id
  JOIN properties p ON p.id = u.property_id
  WHERE ta.tenant_id = get_tenant_rental_history.tenant_id
  ORDER BY ta.start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_total_outstanding_rent() TO authenticated;
GRANT EXECUTE ON FUNCTION check_property_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_properties(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rental_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_rental_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_rental_history(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_total_outstanding_rent() IS 'Get total outstanding rent amount';
COMMENT ON FUNCTION check_property_access(UUID, UUID) IS 'Check if user has access to a specific property';
COMMENT ON FUNCTION get_user_accessible_properties(UUID) IS 'Get all properties accessible to a user';
COMMENT ON FUNCTION get_rental_dashboard_stats(UUID) IS 'Get rental management dashboard statistics for a user';
COMMENT ON FUNCTION get_recent_activity(UUID, INTEGER) IS 'Get recent activity for dashboard display';
COMMENT ON FUNCTION get_property_rental_stats(UUID) IS 'Get rental statistics for a specific property';
COMMENT ON FUNCTION get_tenant_rental_history(UUID) IS 'Get rental history for a specific tenant';
