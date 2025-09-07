-- Dashboard Performance Optimization Migration
-- Adds indexes and optimizations for faster dashboard loading

-- Properties table optimizations
CREATE INDEX IF NOT EXISTS idx_properties_created_by_deleted 
ON properties(created_by, deleted) 
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_properties_created_by_type 
ON properties(created_by, property_type) 
WHERE deleted = false;

-- Units table optimizations
CREATE INDEX IF NOT EXISTS idx_units_property_id_status 
ON units(property_id, status);

CREATE INDEX IF NOT EXISTS idx_units_property_id 
ON units(property_id);

-- Tenants table optimizations
CREATE INDEX IF NOT EXISTS idx_tenants_created_by_status_deleted 
ON tenants(created_by, status, deleted) 
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_tenants_status_monthly_rent 
ON tenants(status, monthly_rent) 
WHERE status = 'ACTIVE' AND deleted = false;

CREATE INDEX IF NOT EXISTS idx_tenants_created_at_status 
ON tenants(created_at DESC, status) 
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_tenants_current_unit_id 
ON tenants(current_unit_id) 
WHERE current_unit_id IS NOT NULL;

-- Property users table optimizations (for access control)
CREATE INDEX IF NOT EXISTS idx_property_users_user_property 
ON property_users(user_id, property_id, status);

-- Payments table optimizations (for financial calculations)
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id_date 
ON payments(tenant_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_property_id_date 
ON payments(property_id, payment_date DESC);

-- Invoices table optimizations
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id_status 
ON invoices(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date_status 
ON invoices(due_date, status) 
WHERE status IN ('PENDING', 'OVERDUE');

-- Create optimized view for dashboard stats
CREATE OR REPLACE VIEW dashboard_stats_view AS
SELECT 
  p.created_by as user_id,
  COUNT(DISTINCT p.id) as total_properties,
  COUNT(DISTINCT u.id) as total_units,
  COUNT(DISTINCT CASE WHEN t.status = 'ACTIVE' THEN t.id END) as active_tenants,
  COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.monthly_rent ELSE 0 END), 0) as monthly_revenue,
  CASE 
    WHEN COUNT(DISTINCT u.id) > 0 
    THEN (COUNT(DISTINCT CASE WHEN t.status = 'ACTIVE' THEN t.id END)::float / COUNT(DISTINCT u.id)::float) * 100 
    ELSE 0 
  END as occupancy_rate
FROM properties p
LEFT JOIN units u ON u.property_id = p.id
LEFT JOIN tenants t ON t.current_unit_id = u.id AND t.deleted = false
WHERE p.deleted = false
GROUP BY p.created_by;

-- Create function for fast dashboard stats retrieval
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id_param UUID)
RETURNS TABLE (
  total_properties BIGINT,
  total_units BIGINT,
  active_tenants BIGINT,
  monthly_revenue NUMERIC,
  occupancy_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dsv.total_properties,
    dsv.total_units,
    dsv.active_tenants,
    dsv.monthly_revenue,
    ROUND(dsv.occupancy_rate, 1) as occupancy_rate
  FROM dashboard_stats_view dsv
  WHERE dsv.user_id = user_id_param;
  
  -- If no data found, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::NUMERIC, 0::NUMERIC;
  END IF;
END;
$$;

-- Create function for recent activity
CREATE OR REPLACE FUNCTION get_recent_activity(user_id_param UUID, limit_param INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  type TEXT,
  description TEXT,
  timestamp TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  (
    -- Recent tenants
    SELECT 
      t.id,
      'tenant'::TEXT as type,
      ('Active tenant - Monthly rent: KES ' || COALESCE(t.monthly_rent, 0))::TEXT as description,
      t.created_at as timestamp
    FROM tenants t
    WHERE t.created_by = user_id_param 
      AND t.deleted = false 
      AND t.status = 'ACTIVE'
    ORDER BY t.created_at DESC
    LIMIT 3
  )
  UNION ALL
  (
    -- Recent properties
    SELECT 
      p.id,
      'property'::TEXT as type,
      ('Property: ' || COALESCE(p.name, 'Unnamed Property'))::TEXT as description,
      p.created_at as timestamp
    FROM properties p
    WHERE p.created_by = user_id_param 
      AND p.deleted = false
    ORDER BY p.created_at DESC
    LIMIT 2
  )
  ORDER BY timestamp DESC
  LIMIT limit_param;
END;
$$;

-- Add comments for documentation
COMMENT ON INDEX idx_properties_created_by_deleted IS 'Optimizes property queries by user with deletion filter';
COMMENT ON INDEX idx_tenants_created_by_status_deleted IS 'Optimizes tenant queries by user, status, and deletion filter';
COMMENT ON VIEW dashboard_stats_view IS 'Materialized view for fast dashboard statistics calculation';
COMMENT ON FUNCTION get_dashboard_stats IS 'Fast function to retrieve dashboard statistics for a user';
COMMENT ON FUNCTION get_recent_activity IS 'Fast function to retrieve recent activity for dashboard';

-- Grant necessary permissions
GRANT SELECT ON dashboard_stats_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity TO authenticated;
