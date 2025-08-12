-- Migration 020: Fix user_invitations RLS policy
-- This migration fixes the permission denied error by correcting the RLS policy
-- that was trying to access auth.users table directly

-- Drop the problematic policy that references auth.users
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON user_invitations;

-- Create a corrected policy that uses auth.email() instead of accessing auth.users table
CREATE POLICY "Users can view invitations sent to their email" ON user_invitations
FOR SELECT USING (
  email = auth.email()
);

-- Ensure the property owners policy is correct and doesn't have recursion issues
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

-- Ensure proper permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;

-- Log the migration
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
  '020_fix_user_invitations_rls', 
  NOW(), 
  'Fixed RLS policy for user_invitations table that was causing permission denied errors by replacing auth.users reference with auth.email() function'
) ON CONFLICT (migration_name) DO UPDATE SET 
  applied_at = NOW(),
  description = EXCLUDED.description;
