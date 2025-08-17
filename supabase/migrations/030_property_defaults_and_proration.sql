-- 030: Property billing defaults and first-month proration

-- 1) Property-level defaults for billing
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS default_billing_day SMALLINT CHECK (default_billing_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS default_align_billing_to_start BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN properties.default_billing_day IS 'Default due day (1-31) for new tenancies in this property.';
COMMENT ON COLUMN properties.default_align_billing_to_start IS 'If true, new tenancies align due date to start date day by default.';

-- 2) Function: Create first-month prorated invoice for a tenancy
CREATE OR REPLACE FUNCTION create_first_month_prorated_invoice(
  p_tenancy_agreement_id UUID
) RETURNS UUID AS $$
DECLARE
  v_agreement RECORD;
  v_month_start DATE;
  v_month_end DATE;
  v_total_days INT;
  v_days_covered INT;
  v_amount NUMERIC(12,2);
  v_due_date DATE;
  v_invoice_id UUID;
  v_target_day INT;
BEGIN
  SELECT ta.id, ta.tenant_id, ta.unit_id, ta.start_date, ta.monthly_rent_kes, ta.billing_day
  INTO v_agreement
  FROM tenancy_agreements ta
  WHERE ta.id = p_tenancy_agreement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenancy agreement not found';
  END IF;

  v_month_start := DATE_TRUNC('month', v_agreement.start_date)::date;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::date;

  -- Only create if start_date is after the first day (mid-month start)
  IF v_agreement.start_date <= v_month_start THEN
    RETURN NULL; -- No proration needed
  END IF;

  -- Avoid duplicate for this partial period
  IF EXISTS (
    SELECT 1 FROM rent_invoices ri
    WHERE ri.tenancy_agreement_id = v_agreement.id
      AND ri.period_start = v_month_start
  ) THEN
    RETURN NULL;
  END IF;

  v_total_days := EXTRACT(DAY FROM v_month_end);
  v_days_covered := (v_month_end - v_agreement.start_date + 1);
  v_amount := ROUND(COALESCE(v_agreement.monthly_rent_kes, 0) * v_days_covered::numeric / v_total_days::numeric, 2);

  -- Due date based on billing_day or start_date day, clamped to month-end
  v_target_day := COALESCE(v_agreement.billing_day, EXTRACT(DAY FROM v_agreement.start_date)::int, 1);
  IF v_target_day >= EXTRACT(DAY FROM v_month_end) THEN
    v_due_date := v_month_end;
  ELSE
    v_due_date := (v_month_start + (v_target_day - 1) * INTERVAL '1 day')::date;
  END IF;

  INSERT INTO rent_invoices (
    tenant_id, unit_id, tenancy_agreement_id,
    period_start, period_end, due_date,
    amount_due_kes, amount_paid_kes, status
  ) VALUES (
    v_agreement.tenant_id,
    v_agreement.unit_id,
    v_agreement.id,
    v_month_start,
    v_agreement.start_date - INTERVAL '1 day',
    v_due_date,
    v_amount,
    0,
    'PENDING'
  ) RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

