-- 035: Maintenance requests system for rental management

-- Create maintenance request status enum
CREATE TYPE maintenance_status AS ENUM (
  'SUBMITTED',
  'ACKNOWLEDGED', 
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

-- Create maintenance request priority enum
CREATE TYPE maintenance_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Create maintenance request category enum
CREATE TYPE maintenance_category AS ENUM (
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'APPLIANCE',
  'STRUCTURAL',
  'COSMETIC',
  'OTHER'
);

-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category maintenance_category NOT NULL DEFAULT 'OTHER',
  priority maintenance_priority NOT NULL DEFAULT 'MEDIUM',
  status maintenance_status NOT NULL DEFAULT 'SUBMITTED',
  submitted_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  photos TEXT[], -- Array of photo URLs
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for maintenance_requests
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property ON maintenance_requests(property_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit ON maintenance_requests(unit_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant ON maintenance_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned ON maintenance_requests(assigned_to, status, created_at DESC);

-- Create updated_at trigger for maintenance_requests
CREATE OR REPLACE FUNCTION update_maintenance_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_requests_updated_at();

-- Create RLS policies for maintenance_requests
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view maintenance requests for properties they have access to
CREATE POLICY maintenance_requests_select_policy ON maintenance_requests
  FOR SELECT
  USING (
    property_id IN (
      SELECT property_id 
      FROM property_users 
      WHERE user_id = auth.uid() 
      AND status = 'ACCEPTED'
    )
    OR 
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- Policy: Users can insert maintenance requests for properties they have access to
CREATE POLICY maintenance_requests_insert_policy ON maintenance_requests
  FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id 
      FROM property_users 
      WHERE user_id = auth.uid() 
      AND status = 'ACCEPTED'
    )
    OR 
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- Policy: Users can update maintenance requests for properties they manage
CREATE POLICY maintenance_requests_update_policy ON maintenance_requests
  FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id 
      FROM property_users 
      WHERE user_id = auth.uid() 
      AND status = 'ACCEPTED'
      AND role IN ('OWNER', 'PROPERTY_MANAGER')
    )
    OR 
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- Policy: Users can delete maintenance requests for properties they own
CREATE POLICY maintenance_requests_delete_policy ON maintenance_requests
  FOR DELETE
  USING (
    property_id IN (
      SELECT property_id 
      FROM property_users 
      WHERE user_id = auth.uid() 
      AND status = 'ACCEPTED'
      AND role = 'OWNER'
    )
    OR 
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- Create function to get maintenance request statistics
CREATE OR REPLACE FUNCTION get_maintenance_stats(p_property_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_requests', COUNT(*),
    'submitted', COUNT(*) FILTER (WHERE status = 'SUBMITTED'),
    'acknowledged', COUNT(*) FILTER (WHERE status = 'ACKNOWLEDGED'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'IN_PROGRESS'),
    'completed', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'CANCELLED'),
    'urgent_priority', COUNT(*) FILTER (WHERE priority = 'URGENT' AND status NOT IN ('COMPLETED', 'CANCELLED')),
    'high_priority', COUNT(*) FILTER (WHERE priority = 'HIGH' AND status NOT IN ('COMPLETED', 'CANCELLED')),
    'avg_completion_days', AVG(
      CASE 
        WHEN completed_date IS NOT NULL AND submitted_date IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (completed_date - submitted_date)) / 86400 
        ELSE NULL 
      END
    )
  ) INTO result
  FROM maintenance_requests
  WHERE (p_property_id IS NULL OR property_id = p_property_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get overdue maintenance requests
CREATE OR REPLACE FUNCTION get_overdue_maintenance_requests()
RETURNS TABLE (
  id UUID,
  property_id UUID,
  property_name TEXT,
  unit_id UUID,
  unit_label TEXT,
  title TEXT,
  priority maintenance_priority,
  submitted_date TIMESTAMPTZ,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.id,
    mr.property_id,
    p.name as property_name,
    mr.unit_id,
    u.unit_label,
    mr.title,
    mr.priority,
    mr.submitted_date,
    CASE 
      WHEN mr.priority = 'URGENT' THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - mr.submitted_date)) / 86400 - 1)::INTEGER
      WHEN mr.priority = 'HIGH' THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - mr.submitted_date)) / 86400 - 3)::INTEGER
      WHEN mr.priority = 'MEDIUM' THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - mr.submitted_date)) / 86400 - 7)::INTEGER
      ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - mr.submitted_date)) / 86400 - 14)::INTEGER
    END as days_overdue
  FROM maintenance_requests mr
  JOIN properties p ON p.id = mr.property_id
  LEFT JOIN units u ON u.id = mr.unit_id
  WHERE mr.status NOT IN ('COMPLETED', 'CANCELLED')
  AND (
    (mr.priority = 'URGENT' AND mr.submitted_date < now() - INTERVAL '1 day') OR
    (mr.priority = 'HIGH' AND mr.submitted_date < now() - INTERVAL '3 days') OR
    (mr.priority = 'MEDIUM' AND mr.submitted_date < now() - INTERVAL '7 days') OR
    (mr.priority = 'LOW' AND mr.submitted_date < now() - INTERVAL '14 days')
  )
  ORDER BY days_overdue DESC, mr.priority DESC, mr.submitted_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_maintenance_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_maintenance_requests() TO authenticated;

-- Add comments
COMMENT ON TABLE maintenance_requests IS 'Maintenance requests for rental properties';
COMMENT ON FUNCTION get_maintenance_stats(UUID) IS 'Get maintenance request statistics for a property or all properties';
COMMENT ON FUNCTION get_overdue_maintenance_requests() IS 'Get maintenance requests that are overdue based on priority';
