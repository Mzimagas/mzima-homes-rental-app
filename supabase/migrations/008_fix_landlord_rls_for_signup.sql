-- Migration 008: Fix Landlord RLS for User Signup
-- Allow users to create their own landlord records during signup

-- Add a policy that allows users to create landlord records with their own email
CREATE POLICY "Users can create landlord records with their email" ON landlords
  FOR INSERT WITH CHECK (email = auth.email());

-- Add a policy that allows users to update landlord records they created
CREATE POLICY "Users can update their own landlord records" ON landlords
  FOR UPDATE USING (email = auth.email());

-- Also add a policy for user_roles to allow users to create their own role assignments
-- when they create a landlord record
CREATE POLICY "Users can create their own landlord role assignments" ON user_roles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    role = 'LANDLORD' AND
    landlord_id IN (
      SELECT id FROM landlords WHERE email = auth.email()
    )
  );

-- Add a policy to allow users to read their own role assignments
CREATE POLICY "Users can read their own role assignments" ON user_roles
  FOR SELECT USING (user_id = auth.uid());
