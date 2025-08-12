-- Fix user_invitations RLS policy that's causing permission denied error
-- The issue is that the policy tries to access auth.users table directly
-- which is not allowed in RLS policies. We need to use auth.email() instead.

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON user_invitations;

-- Create a corrected policy that uses auth.email() instead of accessing auth.users
CREATE POLICY "Users can view invitations sent to their email" ON user_invitations
FOR SELECT USING (
  email = auth.email()
);

-- Also ensure the property owners policy is correct
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;
