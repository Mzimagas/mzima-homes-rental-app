-- 029: Ensure payments -> tenants relationship exists for PostgREST embedding

-- 1) Ensure payments.tenant_id has a proper foreign key to tenants(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'payments' AND c.conname = 'payments_tenant_id_fkey'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_tenant_id_fkey
      FOREIGN KEY (tenant_id)
      REFERENCES tenants(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2) Helpful index for queries
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);

-- 3) Optional: ensure units -> properties FK exists for nested embedding (usually present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'units' AND c.conname = 'units_property_id_fkey'
  ) THEN
    -- Only add if missing (property_id should already exist on units)
    ALTER TABLE units
      ADD CONSTRAINT units_property_id_fkey
      FOREIGN KEY (property_id)
      REFERENCES properties(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 4) Optional: confirm tenants.current_unit_id FK exists (added in migration 025)
-- This should already exist as tenants_current_unit_fk

