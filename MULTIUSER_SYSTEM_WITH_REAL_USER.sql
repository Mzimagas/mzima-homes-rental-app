
      -- Create user role enum
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM (
          'OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT', 'MAINTENANCE_COORDINATOR', 'VIEWER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Create invitation status enum
      DO $$ BEGIN
        CREATE TYPE invitation_status AS ENUM (
          'PENDING', 'ACTIVE', 'INACTIVE', 'REVOKED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Create property_users table
      CREATE TABLE IF NOT EXISTS property_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role user_role NOT NULL DEFAULT 'VIEWER',
        permissions JSONB DEFAULT '{}',
        invited_by UUID REFERENCES auth.users(id),
        invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        accepted_at TIMESTAMP WITH TIME ZONE,
        status invitation_status NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(property_id, user_id)
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_property_users_property_id ON property_users(property_id);
      CREATE INDEX IF NOT EXISTS idx_property_users_user_id ON property_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_property_users_status ON property_users(status);
      
      -- Create user_invitations table
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
      
      -- Create essential functions
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
      
      CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID DEFAULT auth.uid())
      RETURNS TABLE(
        property_id UUID,
        property_name TEXT,
        user_role user_role,
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
      
      -- Enable RLS
      ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies
      CREATE POLICY "Users can view their own property access" ON property_users
      FOR SELECT USING (user_id = auth.uid());
      
      CREATE POLICY "Property owners can manage users" ON property_users
      FOR ALL USING (
        property_id IN (
          SELECT property_id FROM property_users 
          WHERE user_id = auth.uid() 
          AND role = 'OWNER' 
          AND status = 'ACTIVE'
        )
      );
      
      -- Grant permissions
      GRANT SELECT, INSERT, UPDATE, DELETE ON property_users TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;
    