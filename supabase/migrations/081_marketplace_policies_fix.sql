-- Fix marketplace policies - add missing INSERT policy for clients
-- This fixes the registration flow so clients can be created

-- Add missing INSERT policy for clients (needed for registration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'Clients can insert own data'
  ) THEN
    EXECUTE 'CREATE POLICY "Clients can insert own data" ON clients
             FOR INSERT WITH CHECK (auth.uid() = auth_user_id)';
    RAISE NOTICE 'Created INSERT policy for clients table';
  ELSE
    RAISE NOTICE 'INSERT policy for clients already exists';
  END IF;
END $$;

-- Fix handover_requests policies to match the table schema
-- The table uses client_id REFERENCES auth.users(id), so policies should compare against auth.uid() directly

DROP POLICY IF EXISTS "Clients can view own handover requests" ON handover_requests;
DROP POLICY IF EXISTS "Clients can insert own handover requests" ON handover_requests;

CREATE POLICY "Clients can view own handover requests" ON handover_requests
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients can insert own handover requests" ON handover_requests
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('clients', 'client_property_interests', 'handover_requests')
ORDER BY tablename, policyname;
