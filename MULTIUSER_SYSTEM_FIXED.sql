
-- MANUAL SQL SCRIPT TO FIX MULTI-USER SYSTEM
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing tables if they exist
DROP TABLE IF EXISTS property_users CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS invitation_status CASCADE;

-- Step 2: Create types
CREATE TYPE user_role AS ENUM (
  'OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT', 'MAINTENANCE_COORDINATOR', 'VIEWER'
);

CREATE TYPE invitation_status AS ENUM (
  'PENDING', 'ACTIVE', 'INACTIVE', 'REVOKED'
);

-- Step 3: Create property_users table (without foreign key to auth.users)
CREATE TABLE property_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- No foreign key constraint
  role user_role NOT NULL DEFAULT 'VIEWER',
  permissions JSONB DEFAULT '{}',
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status invitation_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

-- Step 4: Create indexes
CREATE INDEX idx_property_users_property_id ON property_users(property_id);
CREATE INDEX idx_property_users_user_id ON property_users(user_id);
CREATE INDEX idx_property_users_status ON property_users(status);

-- Step 5: Create functions
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

-- Step 6: Migrate existing landlord relationships
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

-- Step 7: Enable RLS
ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;

-- Step 8: Create basic RLS policy
CREATE POLICY "Users can view their own property access" ON property_users
FOR SELECT USING (user_id = auth.uid() OR user_id::text = auth.uid()::text);

-- Step 9: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON property_users TO authenticated;
    