-- Migration 014: Create Property Users System for Multi-User Property Management
-- This migration creates the foundation for collaborative property management

-- Create user role enum
CREATE TYPE user_role AS ENUM (
  'OWNER',                    -- Full access to everything
  'PROPERTY_MANAGER',         -- Operational management (tenants, units, maintenance, reports)
  'LEASING_AGENT',           -- Tenant management only (create/edit tenants, tenancy agreements)
  'MAINTENANCE_COORDINATOR',  -- Maintenance requests only (view/manage maintenance)
  'VIEWER'                   -- Read-only access (view all data, no modifications)
);

-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM (
  'PENDING',    -- Invitation sent, not yet accepted
  'ACTIVE',     -- User has accepted and is active
  'INACTIVE',   -- User access temporarily disabled
  'REVOKED'     -- User access permanently revoked
);

-- Create property_users junction table
CREATE TABLE property_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'VIEWER',
  permissions JSONB DEFAULT '{}', -- Custom permissions override for fine-grained control
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status invitation_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique user-property combinations
  UNIQUE(property_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_property_users_property_id ON property_users(property_id);
CREATE INDEX idx_property_users_user_id ON property_users(user_id);
CREATE INDEX idx_property_users_status ON property_users(status);
CREATE INDEX idx_property_users_role ON property_users(role);
CREATE INDEX idx_property_users_property_user ON property_users(property_id, user_id);

-- Create user invitations table for managing pending invitations
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'VIEWER',
  permissions JSONB DEFAULT '{}',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invitation_token UUID DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id),
  status invitation_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique email-property combinations for pending invitations
  UNIQUE(property_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for invitations
CREATE INDEX idx_user_invitations_property_id ON user_invitations(property_id);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_property_users_updated_at
  BEFORE UPDATE ON property_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to check if user has access to property
CREATE OR REPLACE FUNCTION user_has_property_access(user_uuid UUID, property_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM property_users 
    WHERE user_id = user_uuid 
    AND property_id = property_uuid 
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user role for property
CREATE OR REPLACE FUNCTION get_user_property_role(user_uuid UUID, property_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM property_users 
  WHERE user_id = user_uuid 
  AND property_id = property_uuid 
  AND status = 'ACTIVE';
  
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all properties accessible by user
CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID)
RETURNS TABLE(property_id UUID, role user_role, permissions JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT pu.property_id, pu.role, pu.permissions
  FROM property_users pu
  WHERE pu.user_id = user_uuid 
  AND pu.status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_uuid UUID, 
  property_uuid UUID, 
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
  user_permissions JSONB;
BEGIN
  -- Get user role and permissions
  SELECT role, permissions INTO user_role_val, user_permissions
  FROM property_users 
  WHERE user_id = user_uuid 
  AND property_id = property_uuid 
  AND status = 'ACTIVE';
  
  -- If no access, return false
  IF user_role_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check custom permissions first
  IF user_permissions ? permission_name THEN
    RETURN (user_permissions ->> permission_name)::BOOLEAN;
  END IF;
  
  -- Check role-based permissions
  CASE user_role_val
    WHEN 'OWNER' THEN
      RETURN TRUE; -- Owners have all permissions
    WHEN 'PROPERTY_MANAGER' THEN
      RETURN permission_name IN (
        'view_property', 'edit_property', 'view_units', 'edit_units',
        'view_tenants', 'edit_tenants', 'create_tenants', 'delete_tenants',
        'view_tenancy_agreements', 'edit_tenancy_agreements', 'create_tenancy_agreements',
        'view_maintenance', 'edit_maintenance', 'create_maintenance',
        'view_reports', 'view_payments', 'edit_payments'
      );
    WHEN 'LEASING_AGENT' THEN
      RETURN permission_name IN (
        'view_property', 'view_units', 'view_tenants', 'edit_tenants', 'create_tenants',
        'view_tenancy_agreements', 'edit_tenancy_agreements', 'create_tenancy_agreements'
      );
    WHEN 'MAINTENANCE_COORDINATOR' THEN
      RETURN permission_name IN (
        'view_property', 'view_units', 'view_tenants',
        'view_maintenance', 'edit_maintenance', 'create_maintenance'
      );
    WHEN 'VIEWER' THEN
      RETURN permission_name IN (
        'view_property', 'view_units', 'view_tenants', 'view_tenancy_agreements',
        'view_maintenance', 'view_reports', 'view_payments'
      );
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for property_users
CREATE POLICY "Users can view their own property access" ON property_users
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Property owners can view all users for their properties" ON property_users
FOR SELECT USING (
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Property owners can manage users for their properties" ON property_users
FOR ALL USING (
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

-- Create RLS policies for user_invitations
CREATE POLICY "Property owners can manage invitations for their properties" ON user_invitations
FOR ALL USING (
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

CREATE POLICY "Users can view invitations sent to their email" ON user_invitations
FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON property_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE property_users_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_invitations_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE property_users IS 'Junction table managing user access to properties with role-based permissions';
COMMENT ON TABLE user_invitations IS 'Manages pending invitations for users to join property management teams';
COMMENT ON TYPE user_role IS 'Defines the different roles users can have for property management';
COMMENT ON TYPE invitation_status IS 'Tracks the status of user invitations and access';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 014: Property users system created successfully';
  RAISE NOTICE 'Created tables: property_users, user_invitations';
  RAISE NOTICE 'Created types: user_role, invitation_status';
  RAISE NOTICE 'Created functions: user_has_property_access, get_user_property_role, get_user_accessible_properties, user_has_permission';
  RAISE NOTICE 'Created RLS policies for multi-user property access';
  RAISE NOTICE 'Ready for data migration from landlord-based to multi-user system';
END $$;
