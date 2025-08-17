-- Extend get_user_accessible_properties to include property_type and add audit table

-- 1) Create durable audit table for property events
CREATE TABLE IF NOT EXISTS property_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('property_type_changed')),
  old_type property_type_enum,
  new_type property_type_enum,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_audit_log_property ON property_audit_log(property_id, created_at DESC);

-- 2) Extend get_user_accessible_properties to include property name, type and permissions
CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
  property_id UUID,
  property_name TEXT,
  property_type property_type_enum,
  user_role user_role,
  permissions JSONB,
  can_manage_users BOOLEAN,
  can_edit_property BOOLEAN,
  can_manage_tenants BOOLEAN,
  can_manage_maintenance BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS property_id,
    p.name AS property_name,
    p.property_type AS property_type,
    pu.role AS user_role,
    pu.permissions,
    (pu.role = 'OWNER') AS can_manage_users,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) AS can_edit_property,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) AS can_manage_tenants,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) AS can_manage_maintenance
  FROM property_users pu
  JOIN properties p ON p.id = pu.property_id
  WHERE pu.user_id = user_uuid AND pu.status = 'ACTIVE'

  UNION

  SELECT 
    p.id AS property_id,
    p.name AS property_name,
    p.property_type AS property_type,
    'OWNER'::user_role AS user_role,
    '{}'::jsonb AS permissions,
    TRUE AS can_manage_users,
    TRUE AS can_edit_property,
    TRUE AS can_manage_tenants,
    TRUE AS can_manage_maintenance
  FROM properties p
  WHERE p.landlord_id = user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_accessible_properties(UUID) TO authenticated;

