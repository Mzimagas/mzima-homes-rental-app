-- Create maintenance_requests table and related enums
-- This fixes the missing table error in the dashboard stats function

-- Create maintenance request status enum (if not exists)
DO $$ BEGIN
    CREATE TYPE maintenance_status AS ENUM (
      'SUBMITTED',
      'ACKNOWLEDGED', 
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create maintenance request priority enum (if not exists)
DO $$ BEGIN
    CREATE TYPE maintenance_priority AS ENUM (
      'LOW',
      'MEDIUM',
      'HIGH',
      'URGENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create maintenance request category enum (if not exists)
DO $$ BEGIN
    CREATE TYPE maintenance_category AS ENUM (
      'PLUMBING',
      'ELECTRICAL',
      'HVAC',
      'APPLIANCE',
      'STRUCTURAL',
      'COSMETIC',
      'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- Enable RLS
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for maintenance_requests
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_requests TO authenticated;

-- Add comments
COMMENT ON TABLE maintenance_requests IS 'Maintenance requests for rental properties';

-- Log completion
SELECT 'Maintenance requests table created successfully' as result;
