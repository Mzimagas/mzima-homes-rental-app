-- Quick Database Fixes for Missing Tables and Functions
-- Run this in Supabase SQL Editor to resolve the console errors

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS public.get_tenant_balance_summary(uuid);
DROP FUNCTION IF EXISTS public.get_rent_balance_summary(uuid);

-- 2. Create tables FIRST (before functions that reference them)
CREATE TABLE IF NOT EXISTS public.rent_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  unit_id UUID,
  tenancy_agreement_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_due_kes DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid_kes DECIMAL(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  amount_kes DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'CASH',
  tx_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Now create functions that reference the tables
CREATE OR REPLACE FUNCTION public.get_tenant_balance_summary(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_invoiced numeric := 0;
  total_paid numeric := 0;
  overdue_amount numeric := 0;
  last_payment_date date := null;
BEGIN
  -- Get invoice data
  SELECT
    COALESCE(SUM(amount_due_kes), 0),
    COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN (amount_due_kes - amount_paid_kes) ELSE 0 END), 0)
  INTO total_invoiced, overdue_amount
  FROM rent_invoices
  WHERE tenant_id = p_tenant_id;

  -- Get payment data
  SELECT
    COALESCE(SUM(amount_kes), 0),
    MAX(payment_date)
  INTO total_paid, last_payment_date
  FROM payments
  WHERE tenant_id = p_tenant_id;

  -- Return structured result
  result := jsonb_build_object(
    'tenant_id', p_tenant_id,
    'total_invoiced', total_invoiced,
    'total_paid', total_paid,
    'balance', total_invoiced - total_paid,
    'overdue_amount', overdue_amount,
    'last_payment_date', last_payment_date
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rent_balance_summary(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary jsonb;
BEGIN
  SELECT get_tenant_balance_summary(p_tenant_id) INTO summary;

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'balance', (summary->>'balance')::numeric,
    'total_charges', (summary->>'total_invoiced')::numeric,
    'total_payments', (summary->>'total_paid')::numeric,
    'overdue_amount', (summary->>'overdue_amount')::numeric
  );
END;
$$;

-- 4. Add foreign key constraints (drop first to avoid conflicts)
DO $$
BEGIN
  -- Drop existing constraints first
  BEGIN
    ALTER TABLE public.rent_invoices DROP CONSTRAINT IF EXISTS fk_rent_invoices_tenant;
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS fk_payments_tenant;
    ALTER TABLE public.rent_invoices DROP CONSTRAINT IF EXISTS fk_rent_invoices_unit;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors if constraints don't exist
  END;

  -- Add FK to tenants if both tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') THEN
    ALTER TABLE public.rent_invoices
    ADD CONSTRAINT fk_rent_invoices_tenant
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

    ALTER TABLE public.payments
    ADD CONSTRAINT fk_payments_tenant
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  -- Add FK to units if both tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units' AND table_schema = 'public') THEN
    ALTER TABLE public.rent_invoices
    ADD CONSTRAINT fk_rent_invoices_unit
    FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Grant permissions to API roles
GRANT SELECT ON public.rent_invoices TO anon, authenticated, service_role;
GRANT SELECT ON public.payments TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_balance_summary(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_rent_balance_summary(uuid) TO anon, authenticated, service_role;

-- 6. Enable RLS with permissive policies for development
ALTER TABLE public.rent_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow read access to rent_invoices" ON public.rent_invoices;
DROP POLICY IF EXISTS "Allow read access to payments" ON public.payments;

-- Permissive read policies for development (adjust for production)
CREATE POLICY "Allow read access to rent_invoices"
ON public.rent_invoices FOR SELECT
USING (true);

CREATE POLICY "Allow read access to payments"
ON public.payments FOR SELECT
USING (true);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rent_invoices_tenant_id ON public.rent_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_invoices_status ON public.rent_invoices(status);
CREATE INDEX IF NOT EXISTS idx_rent_invoices_due_date ON public.rent_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- 8. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Database fixes applied successfully! Functions and tables are now available.' as result;
