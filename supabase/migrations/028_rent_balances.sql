-- 028: Rent balance ledger, summaries, and overdue alerts

-- 1) View: rent_ledger_view (charges and credits per tenant)
CREATE OR REPLACE VIEW rent_ledger_view AS
  -- Charges: rent invoices (full amount; partial/paid handled in running sum)
  SELECT 
    ri.tenant_id,
    ri.unit_id,
    ri.id AS invoice_id,
    NULL::uuid AS payment_id,
    ri.due_date::date AS entry_date,
    'INVOICE'::text AS entry_type,
    ri.amount_due_kes::numeric(14,2) AS amount_kes,
    jsonb_build_object(
      'period_start', ri.period_start,
      'period_end', ri.period_end,
      'status', ri.status
    ) AS metadata
  FROM rent_invoices ri

  UNION ALL

  -- Credits: payment allocations (negative)
  SELECT 
    ri.tenant_id,
    ri.unit_id,
    pa.invoice_id,
    p.id AS payment_id,
    p.payment_date::date AS entry_date,
    'PAYMENT'::text AS entry_type,
    (-pa.amount_kes)::numeric(14,2) AS amount_kes,
    jsonb_build_object(
      'method', p.method,
      'tx_ref', p.tx_ref
    ) AS metadata
  FROM payment_allocations pa
  JOIN payments p ON p.id = pa.payment_id
  JOIN rent_invoices ri ON ri.id = pa.invoice_id;

COMMENT ON VIEW rent_ledger_view IS 'Combined ledger for rent invoices (charges) and payment allocations (credits) per tenant.';

-- 2) Function: get_rent_ledger with running balance
CREATE OR REPLACE FUNCTION get_rent_ledger(p_tenant_id uuid, p_limit int DEFAULT 100)
RETURNS TABLE (
  entry_date date,
  entry_type text,
  invoice_id uuid,
  payment_id uuid,
  amount_kes numeric,
  running_balance_kes numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.entry_date,
    l.entry_type,
    l.invoice_id,
    l.payment_id,
    l.amount_kes,
    SUM(l.amount_kes) OVER (
      PARTITION BY l.tenant_id
      ORDER BY l.entry_date, COALESCE(l.payment_id, l.invoice_id)
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_balance_kes
  FROM rent_ledger_view l
  WHERE l.tenant_id = p_tenant_id
  ORDER BY l.entry_date DESC, COALESCE(l.payment_id, l.invoice_id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3) Function: get_rent_balance_summary
CREATE OR REPLACE FUNCTION get_rent_balance_summary(p_tenant_id uuid)
RETURNS JSONB AS $$
DECLARE
  v_outstanding numeric := 0;
  v_overdue numeric := 0;
  v_last_payment date := NULL;
  v_methods jsonb := '[]'::jsonb;
  v_open_invoices int := 0;
BEGIN
  -- Outstanding = sum of (due - paid) for pending/partial/overdue
  SELECT COALESCE(SUM(amount_due_kes - amount_paid_kes), 0)
    INTO v_outstanding
  FROM rent_invoices
  WHERE tenant_id = p_tenant_id
    AND status IN ('PENDING','PARTIAL','OVERDUE');

  -- Overdue subset
  SELECT COALESCE(SUM(amount_due_kes - amount_paid_kes), 0)
    INTO v_overdue
  FROM rent_invoices
  WHERE tenant_id = p_tenant_id
    AND status = 'OVERDUE';

  -- Last payment date
  SELECT MAX(payment_date)::date INTO v_last_payment
  FROM payments
  WHERE tenant_id = p_tenant_id;

  -- Payment method breakdown (last 180 days)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('method', method, 'count', cnt, 'amount', amt)), '[]'::jsonb)
    INTO v_methods
  FROM (
    SELECT method, COUNT(*) cnt, SUM(amount_kes) amt
    FROM payments
    WHERE tenant_id = p_tenant_id AND payment_date >= (CURRENT_DATE - INTERVAL '180 days')
    GROUP BY method
    ORDER BY amt DESC
  ) x;

  SELECT COUNT(*) INTO v_open_invoices
  FROM rent_invoices
  WHERE tenant_id = p_tenant_id AND status IN ('PENDING','PARTIAL','OVERDUE');

  RETURN jsonb_build_object(
    'outstanding_total_kes', v_outstanding,
    'overdue_total_kes', v_overdue,
    'last_payment_date', v_last_payment,
    'payment_methods', v_methods,
    'open_invoices_count', v_open_invoices
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4) Overdue alert trigger on rent invoices
CREATE OR REPLACE FUNCTION rent_overdue_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_message text;
BEGIN
  IF NEW.status = 'OVERDUE' AND (OLD.status IS DISTINCT FROM 'OVERDUE') THEN
    v_message := 'Your rent invoice is overdue. Please make a payment.';

    -- In-app notification (user mapping left to app)
    INSERT INTO in_app_notifications (user_id, title, message, type, metadata)
    VALUES (gen_random_uuid(), 'Rent overdue', v_message, 'warning',
            jsonb_build_object('invoice_id', NEW.id, 'tenant_id', NEW.tenant_id, 'unit_id', NEW.unit_id));

    -- History (for managers, in-app)
    INSERT INTO notification_history (
      rule_id, template_id, landlord_id, type, recipient_type, recipient_id,
      recipient_contact, channel, subject, message, status, sent_at, metadata
    )
    SELECT NULL, NULL, p.landlord_id, 'payment_overdue', 'tenant', NEW.tenant_id,
           'in_app', 'in_app', 'Rent overdue', v_message, 'sent', now(),
           jsonb_build_object('invoice_id', NEW.id)
    FROM units u JOIN properties p ON p.id = u.property_id
    WHERE u.id = NEW.unit_id;

    -- Enqueue email for automated workflow (pending)
    INSERT INTO notification_history (
      rule_id, template_id, landlord_id, type, recipient_type, recipient_id,
      recipient_contact, channel, subject, message, status, metadata
    )
    SELECT NULL, NULL, p.landlord_id, 'payment_overdue', 'tenant', NEW.tenant_id,
           COALESCE(t.email, ''), 'email', 'Rent overdue', v_message, 'pending',
           jsonb_build_object('invoice_id', NEW.id)
    FROM units u
    JOIN properties p ON p.id = u.property_id
    LEFT JOIN tenants t ON t.id = NEW.tenant_id
    WHERE u.id = NEW.unit_id AND COALESCE(t.email, '') <> '';

    -- Enqueue SMS (pending) if phone present
    INSERT INTO notification_history (
      rule_id, template_id, landlord_id, type, recipient_type, recipient_id,
      recipient_contact, channel, subject, message, status, metadata
    )
    SELECT NULL, NULL, p.landlord_id, 'payment_overdue', 'tenant', NEW.tenant_id,
           COALESCE(t.phone, ''), 'sms', 'Rent overdue', v_message, 'pending',
           jsonb_build_object('invoice_id', NEW.id)
    FROM units u
    JOIN properties p ON p.id = u.property_id
    LEFT JOIN tenants t ON t.id = NEW.tenant_id
    WHERE u.id = NEW.unit_id AND COALESCE(t.phone, '') <> '';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rent_overdue_alert ON rent_invoices;
CREATE TRIGGER trg_rent_overdue_alert
AFTER UPDATE OF status ON rent_invoices
FOR EACH ROW EXECUTE PROCEDURE rent_overdue_alert();

-- 5) RLS: expose view via existing table policies; PostgREST will handle

COMMENT ON FUNCTION get_rent_ledger(uuid,int) IS 'Returns rent ledger entries with running balance for a tenant';
COMMENT ON FUNCTION get_rent_balance_summary(uuid) IS 'Returns rent balance summary (outstanding, overdue, methods, counts)';

