-- 027: Utility balance management (accounts, ledger, alerts, and reporting)
-- This migration adds tables and functions to manage utility balances for electricity and water,
-- complementing existing rent invoices and payments. It supports prepaid/postpaid electricity
-- and direct Tavevo/internal submeter water, including shared meters via existing shared_meters.

-- 1) Types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'utility_account_type') THEN
    CREATE TYPE utility_account_type AS ENUM (
      'ELECTRICITY_PREPAID',
      'ELECTRICITY_POSTPAID',
      'WATER_DIRECT_TAVEVO',
      'WATER_INTERNAL_SUBMETER'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'utility_txn_type') THEN
    CREATE TYPE utility_txn_type AS ENUM (
      'TOPUP',       -- Credit for prepaid; payment for postpaid
      'PAYMENT',     -- Alias of TOPUP for semantics
      'BILL',        -- Bill added to postpaid account
      'CONSUMPTION', -- Usage-based charge for submeter
      'ADJUSTMENT',  -- Manual correction
      'ALLOCATION'   -- Allocation from shared meter
    );
  END IF;
END $$;

-- 2) Accounts table
CREATE TABLE IF NOT EXISTS utility_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  shared_meter_id UUID REFERENCES shared_meters(id) ON DELETE SET NULL,
  type utility_account_type NOT NULL,
  display_name TEXT,
  currency TEXT NOT NULL DEFAULT 'KES',
  -- Balances are maintained as: positive = prepayment/credit, negative = amount owed
  balance_kes NUMERIC(14,2) NOT NULL DEFAULT 0,
  low_balance_threshold_kes NUMERIC(14,2), -- for prepaid alerts
  credit_limit_kes NUMERIC(14,2),          -- for postpaid limit/alerts
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unit_id, type)
);

-- 3) Ledger table
CREATE TABLE IF NOT EXISTS utility_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES utility_accounts(id) ON DELETE CASCADE,
  txn_type utility_txn_type NOT NULL,
  -- direction implied by txn_type; store signed amount for flexibility
  amount_kes NUMERIC(14,2) NOT NULL,
  balance_after_kes NUMERIC(14,2),
  description TEXT,
  -- Cross-references
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES rent_invoices(id) ON DELETE SET NULL, -- optional link
  meter_reading_id UUID, -- placeholder if a meter_readings table exists
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_utility_accounts_tenant ON utility_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_utility_accounts_unit ON utility_accounts(unit_id);
CREATE INDEX IF NOT EXISTS idx_utility_accounts_type ON utility_accounts(type);
CREATE INDEX IF NOT EXISTS idx_utility_ledger_account ON utility_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_utility_ledger_created_at ON utility_ledger(created_at);

-- 5) Triggers to maintain updated_at and rolling balance
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS utility_accounts_set_updated_at ON utility_accounts;
CREATE TRIGGER utility_accounts_set_updated_at
BEFORE UPDATE ON utility_accounts
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE OR REPLACE FUNCTION apply_utility_ledger_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_current_balance NUMERIC(14,2);
  v_delta NUMERIC(14,2);
BEGIN
  -- Determine signed delta by txn_type
  -- Convention: CREDIT increases balance (positive), DEBIT decreases (negative)
  -- For prepaid: TOPUP/PAYMENT => +amount; CONSUMPTION/ALLOCATION/BILL => -amount
  -- For postpaid: BILL/CONSUMPTION/ALLOCATION => -amount; PAYMENT/TOPUP => +amount
  v_current_balance := (SELECT balance_kes FROM utility_accounts WHERE id = NEW.account_id FOR UPDATE);

  IF NEW.txn_type IN ('TOPUP','PAYMENT') THEN
    v_delta := ABS(NEW.amount_kes);
  ELSIF NEW.txn_type IN ('BILL','CONSUMPTION','ALLOCATION') THEN
    v_delta := -ABS(NEW.amount_kes);
  ELSE
    -- ADJUSTMENT uses signed amount as provided
    v_delta := NEW.amount_kes;
  END IF;

  NEW.balance_after_kes := v_current_balance + v_delta;

  UPDATE utility_accounts
     SET balance_kes = NEW.balance_after_kes,
         updated_at = now()
   WHERE id = NEW.account_id;

  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS utility_ledger_apply_balance ON utility_ledger;
CREATE TRIGGER utility_ledger_apply_balance
BEFORE INSERT ON utility_ledger
FOR EACH ROW EXECUTE PROCEDURE apply_utility_ledger_balance();

-- 6) Alert trigger for low balance (prepaid) and overdue (postpaid)
CREATE OR REPLACE FUNCTION utility_balance_alerts()
RETURNS TRIGGER AS $$
DECLARE
  v_acct utility_accounts;
  v_type TEXT;
  v_message TEXT;
  v_user_id UUID;
BEGIN
  SELECT * INTO v_acct FROM utility_accounts WHERE id = NEW.account_id;

  -- Determine if alert condition met
  IF v_acct.type = 'ELECTRICITY_PREPAID' AND v_acct.low_balance_threshold_kes IS NOT NULL THEN
    IF NEW.balance_after_kes <= v_acct.low_balance_threshold_kes THEN
      v_type := 'low_balance';
      v_message := 'Your electricity prepaid balance is low. Please top up.';
    END IF;
  ELSIF v_acct.type IN ('ELECTRICITY_POSTPAID','WATER_DIRECT_TAVEVO','WATER_INTERNAL_SUBMETER') THEN
    IF NEW.balance_after_kes < 0 THEN
      v_type := 'overdue';
      v_message := 'You have outstanding utility charges. Please make a payment.';
    END IF;
  END IF;

  IF v_type IS NOT NULL THEN
    -- Notify via in-app and notification_history as custom type
    -- Try to map tenant to auth user if available via tenants table (not always 1:1)
    v_user_id := NULL; -- left null; app can map in UI

    INSERT INTO in_app_notifications (user_id, title, message, type, metadata)
    VALUES (COALESCE(v_user_id, gen_random_uuid()),
            'Utility balance alert', v_message, 'warning',
            jsonb_build_object(
              'category', 'utility_' || v_type,
              'account_id', v_acct.id,
              'unit_id', v_acct.unit_id,
              'tenant_id', v_acct.tenant_id,
              'balance_after_kes', NEW.balance_after_kes,
              'threshold_kes', v_acct.low_balance_threshold_kes
            ));

    INSERT INTO notification_history (
      rule_id, template_id, landlord_id, type, recipient_type, recipient_id,
      recipient_contact, channel, subject, message, status, sent_at, metadata
    )
    SELECT NULL, NULL, p.landlord_id, 'custom', 'tenant', v_acct.tenant_id,
           COALESCE(t.email, t.phone, 'n/a'), 'in_app',
           'Utility balance alert', v_message, 'sent', now(),
           jsonb_build_object('category', 'utility_' || v_type, 'account_id', v_acct.id)
    FROM units u
    JOIN properties p ON p.id = u.property_id
    LEFT JOIN tenants t ON t.id = v_acct.tenant_id
    WHERE u.id = v_acct.unit_id;
  END IF;

  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS utility_ledger_alerts ON utility_ledger;
CREATE TRIGGER utility_ledger_alerts
AFTER INSERT ON utility_ledger
FOR EACH ROW EXECUTE PROCEDURE utility_balance_alerts();

-- 7) RPCs: create or get accounts, record topups/charges, get summaries
CREATE OR REPLACE FUNCTION ensure_utility_account(
  p_tenant_id UUID,
  p_unit_id UUID,
  p_type utility_account_type,
  p_low_threshold NUMERIC DEFAULT NULL,
  p_credit_limit NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_id UUID; BEGIN
  SELECT id INTO v_id FROM utility_accounts WHERE unit_id = p_unit_id AND type = p_type;
  IF v_id IS NULL THEN
    INSERT INTO utility_accounts(tenant_id, unit_id, type, low_balance_threshold_kes, credit_limit_kes)
    VALUES(p_tenant_id, p_unit_id, p_type, p_low_threshold, p_credit_limit)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_utility_topup(
  p_account_id UUID,
  p_amount_kes NUMERIC,
  p_payment_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_id UUID; BEGIN
  INSERT INTO utility_ledger(account_id, txn_type, amount_kes, description, payment_id)
  VALUES(p_account_id, 'TOPUP', p_amount_kes, COALESCE(p_description, 'Top-up'), p_payment_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_utility_charge(
  p_account_id UUID,
  p_amount_kes NUMERIC,
  p_txn_type utility_txn_type DEFAULT 'BILL',
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE v_id UUID; BEGIN
  IF p_txn_type NOT IN ('BILL','CONSUMPTION','ALLOCATION','ADJUSTMENT') THEN
    RAISE EXCEPTION 'Invalid txn_type for charge: %', p_txn_type;
  END IF;
  INSERT INTO utility_ledger(account_id, txn_type, amount_kes, description, metadata)
  VALUES(p_account_id, p_txn_type, p_amount_kes, COALESCE(p_description, 'Charge'), p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Summary per tenant combining rent invoices and utility accounts
CREATE OR REPLACE FUNCTION get_tenant_balance_summary(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_rent_outstanding NUMERIC := 0;
  v_utils JSONB := '[]'::jsonb;
BEGIN
  SELECT COALESCE(SUM(amount_due_kes - amount_paid_kes),0)
    INTO v_rent_outstanding
  FROM rent_invoices
  WHERE tenant_id = p_tenant_id
    AND status IN ('PENDING','PARTIAL','OVERDUE');

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'account_id', ua.id,
      'unit_id', ua.unit_id,
      'type', ua.type,
      'balance_kes', ua.balance_kes,
      'low_balance_threshold_kes', ua.low_balance_threshold_kes,
      'credit_limit_kes', ua.credit_limit_kes
    ) ORDER BY ua.type
  ), '[]'::jsonb) INTO v_utils
  FROM utility_accounts ua
  WHERE ua.tenant_id = p_tenant_id AND ua.is_active = true;

  RETURN jsonb_build_object(
    'rent_outstanding_kes', v_rent_outstanding,
    'utility_accounts', v_utils
  );
END; $$ LANGUAGE plpgsql;

-- 8) RLS
ALTER TABLE utility_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_ledger ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view accounts/ledger they have access to via property_users
CREATE POLICY ua_select ON utility_accounts FOR SELECT TO authenticated USING (
  unit_id IN (
    SELECT u.id FROM units u
    JOIN property_users pu ON pu.property_id = u.property_id
    WHERE pu.user_id = auth.uid() AND pu.status = 'ACTIVE'
  )
);

CREATE POLICY ul_select ON utility_ledger FOR SELECT TO authenticated USING (
  account_id IN (
    SELECT id FROM utility_accounts WHERE unit_id IN (
      SELECT u.id FROM units u
      JOIN property_users pu ON pu.property_id = u.property_id
      WHERE pu.user_id = auth.uid() AND pu.status = 'ACTIVE'
    )
  )
);

-- Insert policies are restricted; typically done via service role or backend API
CREATE POLICY ua_insert_none ON utility_accounts FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY ul_insert_none ON utility_ledger FOR INSERT TO authenticated WITH CHECK (false);

-- Comments
COMMENT ON TABLE utility_accounts IS 'Per-unit utility balance accounts for electricity/water';
COMMENT ON TABLE utility_ledger IS 'Ledger of utility balance transactions linked to accounts';

