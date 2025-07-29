-- Complete Multi-User Property Management System SQL
-- Run this script in Supabase SQL Editor to create the multi-user system

-- Step 1: Create user role enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'OWNER',                    -- Full access to everything
    'PROPERTY_MANAGER',         -- Operational management (tenants, units, maintenance, reports)
    'LEASING_AGENT',           -- Tenant management only (create/edit tenants, tenancy agreements)
    'MAINTENANCE_COORDINATOR',  -- Maintenance requests only (view/manage maintenance)
    'VIEWER'                   -- Read-only access (view all data, no modifications)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create invitation status enum
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM (
    'PENDING',    -- Invitation sent, not yet accepted
    'ACTIVE',     -- User has accepted and is active
    'INACTIVE',   -- User access temporarily disabled
    'REVOKED'     -- User access permanently revoked
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create property_users junction table
CREATE TABLE IF NOT EXISTS property_users (
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

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_users_property_id ON property_users(property_id);
CREATE INDEX IF NOT EXISTS idx_property_users_user_id ON property_users(user_id);
CREATE INDEX IF NOT EXISTS idx_property_users_status ON property_users(status);
CREATE INDEX IF NOT EXISTS idx_property_users_role ON property_users(role);
CREATE INDEX IF NOT EXISTS idx_property_users_property_user ON property_users(property_id, user_id);

-- Step 5: Create user invitations table for managing pending invitations
CREATE TABLE IF NOT EXISTS user_invitations (
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes for invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_property_id ON user_invitations(property_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Step 7: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create triggers for updated_at
DROP TRIGGER IF EXISTS update_property_users_updated_at ON property_users;
CREATE TRIGGER update_property_users_updated_at
  BEFORE UPDATE ON property_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON user_invitations;
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Create function to check if user has access to property
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

-- Step 10: Create function to get user role for property
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

-- Step 11: Create function to get all properties accessible by user
CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(
  property_id UUID, 
  property_name TEXT,
  user_role user_role, 
  permissions JSONB,
  can_manage_users BOOLEAN,
  can_edit_property BOOLEAN,
  can_manage_tenants BOOLEAN,
  can_manage_maintenance BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as property_id,
    p.name as property_name,
    pu.role as user_role,
    pu.permissions,
    (pu.role = 'OWNER') as can_manage_users,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants,
    (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) as can_manage_maintenance
  FROM properties p
  JOIN property_users pu ON p.id = pu.property_id
  WHERE pu.user_id = user_uuid
  AND pu.status = 'ACTIVE'
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Enable RLS on new tables
ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Step 13: Create RLS policies for property_users
DROP POLICY IF EXISTS "Users can view their own property access" ON property_users;
CREATE POLICY "Users can view their own property access" ON property_users
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Property owners can view all users for their properties" ON property_users;
CREATE POLICY "Property owners can view all users for their properties" ON property_users
FOR SELECT USING (
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

DROP POLICY IF EXISTS "Property owners can manage users for their properties" ON property_users;
CREATE POLICY "Property owners can manage users for their properties" ON property_users
FOR ALL USING (
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

-- Step 14: Create RLS policies for user_invitations
DROP POLICY IF EXISTS "Property owners can manage invitations for their properties" ON user_invitations;
CREATE POLICY "Property owners can manage invitations for their properties" ON user_invitations
FOR ALL USING (
  property_id IN (
    SELECT property_id FROM property_users 
    WHERE user_id = auth.uid() 
    AND role = 'OWNER' 
    AND status = 'ACTIVE'
  )
);

DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON user_invitations;
CREATE POLICY "Users can view invitations sent to their email" ON user_invitations
FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Step 15: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON property_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;

-- Step 16: Migrate existing landlord relationships to property_users
INSERT INTO property_users (property_id, user_id, role, status, accepted_at, invited_by, invited_at)
SELECT 
  p.id as property_id,
  p.landlord_id as user_id,
  'OWNER' as role,
  'ACTIVE' as status,
  NOW() as accepted_at,
  p.landlord_id as invited_by,
  NOW() as invited_at
FROM properties p
WHERE p.landlord_id IS NOT NULL
ON CONFLICT (property_id, user_id) DO NOTHING;

-- Step 17: Add comments for documentation
COMMENT ON TABLE property_users IS 'Junction table managing user access to properties with role-based permissions';
COMMENT ON TABLE user_invitations IS 'Manages pending invitations for users to join property management teams';
COMMENT ON TYPE user_role IS 'Defines the different roles users can have for property management';
COMMENT ON TYPE invitation_status IS 'Tracks the status of user invitations and access';

-- Step 18: Create view for easy property access checking
CREATE OR REPLACE VIEW user_property_access AS
SELECT 
  pu.user_id,
  pu.property_id,
  p.name as property_name,
  pu.role,
  pu.status,
  pu.permissions,
  pu.accepted_at,
  (pu.role = 'OWNER') as is_owner,
  (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
  (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants,
  (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) as can_manage_maintenance,
  (pu.role != 'VIEWER') as can_create_data
FROM property_users pu
JOIN properties p ON pu.property_id = p.id
WHERE pu.status = 'ACTIVE';

-- Grant access to the view
GRANT SELECT ON user_property_access TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Multi-user property management system created successfully!';
  RAISE NOTICE 'Tables created: property_users, user_invitations';
  RAISE NOTICE 'Functions created: user_has_property_access, get_user_property_role, get_user_accessible_properties';
  RAISE NOTICE 'View created: user_property_access';
  RAISE NOTICE 'Existing landlord relationships migrated to OWNER users';
  RAISE NOTICE 'System is ready for multi-user property management';
END $$;
