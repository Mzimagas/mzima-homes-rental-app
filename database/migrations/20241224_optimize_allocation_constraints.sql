-- Migration: Optimize Tenant-Unit Allocation System with Database Constraints
-- Date: 2024-12-24
-- Description: Add enum types, unique constraints, and data integrity rules for tenancy status and unit allocation

-- 1. Create enum types for better data integrity
CREATE TYPE tenancy_status AS ENUM ('ACTIVE', 'TERMINATED', 'EXPIRED', 'PENDING', 'CANCELLED');
CREATE TYPE unit_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE');
CREATE TYPE lease_type AS ENUM ('FIXED_TERM', 'MONTH_TO_MONTH', 'PERIODIC', 'TEMPORARY');

-- 2. Add new columns and update existing ones
ALTER TABLE tenancy_agreements 
  ALTER COLUMN status TYPE tenancy_status USING status::tenancy_status,
  ADD COLUMN IF NOT EXISTS lease_type lease_type DEFAULT 'FIXED_TERM',
  ADD COLUMN IF NOT EXISTS security_deposit_kes DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS pet_deposit_kes DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add unit status tracking
ALTER TABLE units 
  ADD COLUMN IF NOT EXISTS status unit_status DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS last_inspection_date DATE,
  ADD COLUMN IF NOT EXISTS next_inspection_date DATE,
  ADD COLUMN IF NOT EXISTS maintenance_notes TEXT;

-- 4. Remove redundant current_unit_id from tenants table (will be calculated from active tenancy_agreements)
-- Note: This is commented out to prevent data loss. Uncomment after verifying data migration
-- ALTER TABLE tenants DROP COLUMN IF EXISTS current_unit_id;

-- 5. Create unique constraint to prevent multiple active leases per unit
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_active_unit_lease 
ON tenancy_agreements (unit_id) 
WHERE status = 'ACTIVE';

-- 6. Create unique constraint to prevent multiple active leases per tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_active_tenant_lease 
ON tenancy_agreements (tenant_id) 
WHERE status = 'ACTIVE';

-- 7. Add check constraints for data validation
ALTER TABLE tenancy_agreements 
  ADD CONSTRAINT check_start_before_end 
    CHECK (end_date IS NULL OR start_date < end_date),
  ADD CONSTRAINT check_positive_rent 
    CHECK (monthly_rent_kes > 0),
  ADD CONSTRAINT check_positive_deposits 
    CHECK (security_deposit_kes >= 0 AND pet_deposit_kes >= 0);

-- 8. Add check constraint for unit rent
ALTER TABLE units 
  ADD CONSTRAINT check_positive_unit_rent 
    CHECK (monthly_rent_kes > 0);

-- 9. Create indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenancy_agreements_status_dates 
ON tenancy_agreements (status, start_date, end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenancy_agreements_unit_active 
ON tenancy_agreements (unit_id, status) 
WHERE status = 'ACTIVE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenancy_agreements_tenant_active 
ON tenancy_agreements (tenant_id, status) 
WHERE status = 'ACTIVE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_property_status 
ON units (property_id, status);

-- 10. Create function to automatically update unit status based on tenancy
CREATE OR REPLACE FUNCTION update_unit_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update unit status based on active tenancy agreements
  IF TG_OP = 'INSERT' AND NEW.status = 'ACTIVE' THEN
    UPDATE units SET status = 'OCCUPIED' WHERE id = NEW.unit_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'ACTIVE' AND NEW.status != 'ACTIVE' THEN
    -- Check if there are other active leases for this unit
    IF NOT EXISTS (
      SELECT 1 FROM tenancy_agreements 
      WHERE unit_id = OLD.unit_id AND status = 'ACTIVE' AND id != OLD.id
    ) THEN
      UPDATE units SET status = 'AVAILABLE' WHERE id = OLD.unit_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'ACTIVE' THEN
    -- Check if there are other active leases for this unit
    IF NOT EXISTS (
      SELECT 1 FROM tenancy_agreements 
      WHERE unit_id = OLD.unit_id AND status = 'ACTIVE'
    ) THEN
      UPDATE units SET status = 'AVAILABLE' WHERE id = OLD.unit_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to automatically update unit status
DROP TRIGGER IF EXISTS trigger_update_unit_status ON tenancy_agreements;
CREATE TRIGGER trigger_update_unit_status
  AFTER INSERT OR UPDATE OR DELETE ON tenancy_agreements
  FOR EACH ROW EXECUTE FUNCTION update_unit_status();

-- 12. Create function to get current tenant for a unit
CREATE OR REPLACE FUNCTION get_current_tenant(unit_id_param UUID)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  lease_start DATE,
  lease_end DATE,
  monthly_rent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.tenant_id,
    t.full_name,
    ta.start_date,
    ta.end_date,
    ta.monthly_rent_kes
  FROM tenancy_agreements ta
  JOIN tenants t ON ta.tenant_id = t.id
  WHERE ta.unit_id = unit_id_param 
    AND ta.status = 'ACTIVE'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to check unit availability
CREATE OR REPLACE FUNCTION check_unit_availability(
  unit_id_param UUID,
  start_date_param DATE,
  end_date_param DATE DEFAULT NULL
)
RETURNS TABLE (
  available BOOLEAN,
  conflicting_lease_id UUID,
  conflicting_tenant TEXT,
  conflict_start DATE,
  conflict_end DATE,
  available_from DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (COUNT(*) = 0)::BOOLEAN as available,
    ta.id as conflicting_lease_id,
    t.full_name as conflicting_tenant,
    ta.start_date as conflict_start,
    ta.end_date as conflict_end,
    ta.end_date as available_from
  FROM tenancy_agreements ta
  JOIN tenants t ON ta.tenant_id = t.id
  WHERE ta.unit_id = unit_id_param
    AND ta.status = 'ACTIVE'
    AND (
      ta.end_date IS NULL OR 
      ta.end_date >= start_date_param
    )
    AND (
      end_date_param IS NULL OR 
      ta.start_date <= COALESCE(end_date_param, ta.start_date)
    )
  GROUP BY ta.id, t.full_name, ta.start_date, ta.end_date
  ORDER BY ta.start_date
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 14. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15. Add updated_at triggers
CREATE TRIGGER trigger_tenancy_agreements_updated_at
  BEFORE UPDATE ON tenancy_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. Create view for active leases with tenant and unit details
CREATE OR REPLACE VIEW active_leases AS
SELECT 
  ta.id,
  ta.tenant_id,
  ta.unit_id,
  ta.start_date,
  ta.end_date,
  ta.monthly_rent_kes,
  ta.security_deposit_kes,
  ta.lease_type,
  ta.notes,
  ta.created_at,
  ta.updated_at,
  t.full_name as tenant_name,
  t.phone as tenant_phone,
  t.email as tenant_email,
  u.unit_label,
  u.property_id,
  p.name as property_name,
  p.physical_address as property_address
FROM tenancy_agreements ta
JOIN tenants t ON ta.tenant_id = t.id
JOIN units u ON ta.unit_id = u.id
JOIN properties p ON u.property_id = p.id
WHERE ta.status = 'ACTIVE';

-- 17. Create view for unit occupancy summary
CREATE OR REPLACE VIEW unit_occupancy_summary AS
SELECT 
  u.id as unit_id,
  u.unit_label,
  u.property_id,
  p.name as property_name,
  u.monthly_rent_kes,
  u.status as unit_status,
  CASE 
    WHEN ta.id IS NOT NULL THEN 'OCCUPIED'
    ELSE 'VACANT'
  END as occupancy_status,
  ta.tenant_id,
  t.full_name as tenant_name,
  ta.start_date as lease_start,
  ta.end_date as lease_end,
  ta.monthly_rent_kes as actual_rent
FROM units u
JOIN properties p ON u.property_id = p.id
LEFT JOIN tenancy_agreements ta ON u.id = ta.unit_id AND ta.status = 'ACTIVE'
LEFT JOIN tenants t ON ta.tenant_id = t.id
WHERE u.is_active = true
ORDER BY p.name, u.unit_label;

-- 18. Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT ON active_leases TO authenticated;
-- GRANT SELECT ON unit_occupancy_summary TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_current_tenant(UUID) TO authenticated;
-- GRANT EXECUTE ON FUNCTION check_unit_availability(UUID, DATE, DATE) TO authenticated;

-- 19. Create atomic reallocation function
CREATE OR REPLACE FUNCTION reallocate_tenant_atomic(
  p_tenant_id UUID,
  p_current_lease_id UUID,
  p_new_unit_id UUID,
  p_effective_date DATE,
  p_new_rent DECIMAL,
  p_notes TEXT DEFAULT NULL,
  p_terminate_current BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
DECLARE
  v_current_unit_id UUID;
BEGIN
  -- Get current unit ID for validation
  SELECT unit_id INTO v_current_unit_id
  FROM tenancy_agreements
  WHERE id = p_current_lease_id AND tenant_id = p_tenant_id AND status = 'ACTIVE';

  IF v_current_unit_id IS NULL THEN
    RAISE EXCEPTION 'No active lease found for tenant';
  END IF;

  -- Check if new unit is available
  IF EXISTS (
    SELECT 1 FROM tenancy_agreements
    WHERE unit_id = p_new_unit_id
    AND status = 'ACTIVE'
    AND (end_date IS NULL OR end_date >= p_effective_date)
  ) THEN
    RAISE EXCEPTION 'New unit is not available for the specified date';
  END IF;

  -- Start transaction
  BEGIN
    -- Terminate current lease if requested
    IF p_terminate_current THEN
      UPDATE tenancy_agreements
      SET
        status = 'TERMINATED',
        end_date = p_effective_date - INTERVAL '1 day',
        notes = COALESCE(notes, '') || E'\n' || 'Terminated for reallocation: ' || COALESCE(p_notes, ''),
        updated_at = NOW()
      WHERE id = p_current_lease_id;
    END IF;

    -- Create new lease agreement
    INSERT INTO tenancy_agreements (
      tenant_id,
      unit_id,
      start_date,
      monthly_rent_kes,
      status,
      lease_type,
      notes,
      created_at,
      updated_at
    ) VALUES (
      p_tenant_id,
      p_new_unit_id,
      p_effective_date,
      p_new_rent,
      'ACTIVE',
      'FIXED_TERM',
      'Reallocation: ' || COALESCE(p_notes, ''),
      NOW(),
      NOW()
    );

    -- Unit status will be updated automatically by triggers

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- 20. Add comments for documentation
COMMENT ON TYPE tenancy_status IS 'Status of tenancy agreements';
COMMENT ON TYPE unit_status IS 'Current status of rental units';
COMMENT ON TYPE lease_type IS 'Type of lease agreement';
COMMENT ON FUNCTION get_current_tenant(UUID) IS 'Returns current tenant information for a unit';
COMMENT ON FUNCTION check_unit_availability(UUID, DATE, DATE) IS 'Checks if a unit is available for given date range';
COMMENT ON FUNCTION reallocate_tenant_atomic IS 'Atomically reallocates tenant to new unit with proper transaction handling';
COMMENT ON VIEW active_leases IS 'View of all active lease agreements with tenant and unit details';
COMMENT ON VIEW unit_occupancy_summary IS 'Summary view of unit occupancy status across all properties';
