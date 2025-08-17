-- 029: Flexible rent due dates and overdue handling

-- 1) Add flexible billing fields to tenancy_agreements
ALTER TABLE tenancy_agreements
  ADD COLUMN IF NOT EXISTS billing_day SMALLINT CHECK (billing_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS align_billing_to_start BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill billing_day from start_date where missing
UPDATE tenancy_agreements
SET billing_day = EXTRACT(DAY FROM start_date)
WHERE billing_day IS NULL;

-- 2) Update monthly rent invoicing to compute per-tenant due dates
CREATE OR REPLACE FUNCTION run_monthly_rent(
  p_period_start DATE,
  p_due_date DATE DEFAULT NULL
) RETURNS TABLE (
  invoices_created INTEGER,
  total_amount_kes DECIMAL
) AS $$
DECLARE
  v_invoices_created INTEGER := 0;
  v_total_amount DECIMAL := 0;
  v_agreement RECORD;
  v_invoice_id UUID;
  v_month_start DATE;
  v_month_end DATE;
  v_target_day INT;
  v_due_date_local DATE;
  v_amount NUMERIC;
BEGIN
  v_month_start := DATE_TRUNC('month', p_period_start)::date;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::date;

  FOR v_agreement IN
    SELECT 
      ta.id AS agreement_id,
      ta.tenant_id,
      ta.unit_id,
      ta.monthly_rent_kes AS amount_kes,
      ta.billing_day,
      ta.start_date
    FROM tenancy_agreements ta
    WHERE ta.status = 'ACTIVE'
      AND ta.start_date <= p_period_start
      AND (ta.end_date IS NULL OR ta.end_date >= p_period_start)
  LOOP
    -- Skip if invoice already exists for this period
    IF NOT EXISTS (
      SELECT 1 FROM rent_invoices ri
      WHERE ri.tenancy_agreement_id = v_agreement.agreement_id
        AND ri.period_start = p_period_start
    ) THEN
      -- Determine target due day: billing_day, else start_date day, else 1
      v_target_day := COALESCE(v_agreement.billing_day, EXTRACT(DAY FROM v_agreement.start_date)::int, 1);

      -- Compute due date (override wins; otherwise clamp to month end for missing day)
      IF p_due_date IS NOT NULL THEN
        v_due_date_local := p_due_date;
      ELSIF v_target_day >= EXTRACT(DAY FROM v_month_end) THEN
        v_due_date_local := v_month_end;
      ELSE
        v_due_date_local := (v_month_start + (v_target_day - 1) * INTERVAL '1 day')::date;
      END IF;

      v_amount := COALESCE(v_agreement.amount_kes, 0);

      -- Create invoice
      INSERT INTO rent_invoices (
        tenant_id,
        unit_id,
        tenancy_agreement_id,
        period_start,
        period_end,
        due_date,
        amount_due_kes,
        amount_paid_kes,
        status
      ) VALUES (
        v_agreement.tenant_id,
        v_agreement.unit_id,
        v_agreement.agreement_id,
        p_period_start,
        v_month_end,
        v_due_date_local,
        v_amount,
        0,
        'PENDING'
      ) RETURNING id INTO v_invoice_id;

      v_invoices_created := v_invoices_created + 1;
      v_total_amount := v_total_amount + v_amount;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_invoices_created, COALESCE(v_total_amount, 0);
END;
$$ LANGUAGE plpgsql;

-- 3) Helper to mark overdue invoices based on due_date
CREATE OR REPLACE FUNCTION mark_overdue_invoices(p_today DATE DEFAULT NOW())
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE rent_invoices
  SET status = 'OVERDUE'
  WHERE status IN ('PENDING','PARTIAL')
    AND due_date < p_today
    AND amount_paid_kes < amount_due_kes;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

