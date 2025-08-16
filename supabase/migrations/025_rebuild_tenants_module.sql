-- Rebuild Tenants Module
-- This migration safely drops the old tenants module and creates a fresh schema

-- 1) Drop dependent foreign keys that reference tenants or tenancy_agreements
DO $$
DECLARE r RECORD;
BEGIN
  -- Drop FKs referencing tenants table
  FOR r IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'public.tenants'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
  END LOOP;

  -- Drop FKs referencing tenancy_agreements table
  IF to_regclass('public.tenancy_agreements') IS NOT NULL THEN
    FOR r IN
      SELECT conrelid::regclass AS table_name, conname
      FROM pg_constraint
      WHERE contype = 'f'
        AND confrelid = 'public.tenancy_agreements'::regclass
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
    END LOOP;
  END IF;
END $$;

-- 2) Drop RLS policies on tenants/tenancy_agreements if they exist
DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL THEN
    -- Attempt to drop all policies
    EXECUTE 'DROP POLICY IF EXISTS "Landlords can view their tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Landlords can insert their tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Landlords can update their tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Landlords can delete their tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view tenants in their accessible properties" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Leasing agents can insert tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Leasing agents can update tenants" ON tenants';
    EXECUTE 'DROP POLICY IF EXISTS "Property managers can delete tenants" ON tenants';
  END IF;

  IF to_regclass('public.tenancy_agreements') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view tenancy agreements in their accessible properties" ON tenancy_agreements';
    EXECUTE 'DROP POLICY IF EXISTS "Leasing agents can insert tenancy agreements" ON tenancy_agreements';
    EXECUTE 'DROP POLICY IF EXISTS "Leasing agents can update tenancy agreements" ON tenancy_agreements';
    EXECUTE 'DROP POLICY IF EXISTS "Property managers can delete tenancy agreements" ON tenancy_agreements';
    EXECUTE 'DROP POLICY IF EXISTS "Landlords can view their tenancy agreements" ON tenancy_agreements';
    EXECUTE 'DROP POLICY IF EXISTS "Landlords can insert their tenancy agreements" ON tenancy_agreements';
    EXECUTE 'DROP POLICY IF EXISTS "Landlords can update their tenancy agreements" ON tenancy_agreements';
    EXECUTE 'DROP POLICY IF EXISTS "Landlords can delete their tenancy agreements" ON tenancy_agreements';
  END IF;
END $$;

-- 3) Drop tenant-related RPC functions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_tenant_balance'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS get_tenant_balance(UUID) CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_tenant_payment_history'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS get_tenant_payment_history(UUID, INTEGER) CASCADE';
  END IF;
END $$;

-- 4) Drop old tables
DROP TABLE IF EXISTS tenancy_agreements CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 5) Create new tenants table (clean design)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  employer TEXT,
  notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_email TEXT,
  current_unit_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Create new tenancy_agreements table (link tenants to units)
CREATE TABLE tenancy_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  monthly_rent_kes NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) Add FK for tenants.current_unit_id to units (optional, nullable)
ALTER TABLE tenants
  ADD CONSTRAINT tenants_current_unit_fk
  FOREIGN KEY (current_unit_id) REFERENCES units(id) ON DELETE SET NULL;

-- 8) Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_current_unit_id ON tenants(current_unit_id);
CREATE INDEX IF NOT EXISTS idx_ta_tenant_id ON tenancy_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ta_unit_id ON tenancy_agreements(unit_id);
CREATE INDEX IF NOT EXISTS idx_ta_status ON tenancy_agreements(status);
-- Only expose non-deleted tenants
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);


-- 9) Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy_agreements ENABLE ROW LEVEL SECURITY;

-- 10) RLS Policies respecting property_users and roles
-- NOTE: We implement read via RLS, and write via API + service_role. However, for clarity,
-- we also include role-aware RLS policies that can be enabled later if needed.

-- View tenants if you have access to the related unit property via property_users
CREATE POLICY tenants_select
  ON tenants FOR SELECT USING (
    -- If linked via current_unit_id
    current_unit_id IN (
      SELECT u.id
      FROM units u
      JOIN property_users pu ON pu.property_id = u.property_id
      WHERE pu.user_id = auth.uid() AND pu.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1
      FROM tenancy_agreements ta
      JOIN units u ON u.id = ta.unit_id
      JOIN property_users pu ON pu.property_id = u.property_id
      WHERE ta.tenant_id = tenants.id
        AND pu.user_id = auth.uid()
        AND pu.status = 'ACTIVE'
    )
  );

-- For now, restrict writes for authenticated users; writes go through API with service_role + role checks
CREATE POLICY tenants_insert_none ON tenants FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY tenants_update_none ON tenants FOR UPDATE TO authenticated USING (false);
CREATE POLICY tenants_delete_none ON tenants FOR DELETE TO authenticated USING (false);

-- Tenancy agreements select policy (view agreements if you have access to the property's units)
CREATE POLICY ta_select
  ON tenancy_agreements FOR SELECT USING (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN property_users pu ON pu.property_id = u.property_id
      WHERE pu.user_id = auth.uid() AND pu.status = 'ACTIVE'
    )
  );

-- Restrict INSERT/UPDATE/DELETE similarly; handled via API with service role
CREATE POLICY ta_insert_none ON tenancy_agreements FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY ta_update_none ON tenancy_agreements FOR UPDATE TO authenticated USING (false);
CREATE POLICY ta_delete_none ON tenancy_agreements FOR DELETE TO authenticated USING (false);

-- 11) Comment and ready
COMMENT ON TABLE tenants IS 'Tenant master records. Writes via API with server-side auth checks.';
COMMENT ON TABLE tenancy_agreements IS 'Links tenants to units with validity period. Writes via API with server-side checks.';

