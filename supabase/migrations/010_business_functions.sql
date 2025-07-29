-- Migration 010: Business Logic Functions
-- Create essential business functions for property management

-- Function to get property occupancy stats
CREATE OR REPLACE FUNCTION get_property_stats(p_property_id UUID)
RETURNS TABLE (
  total_units INTEGER,
  occupied_units INTEGER,
  vacant_units INTEGER,
  occupancy_rate DECIMAL,
  monthly_rent_potential DECIMAL,
  monthly_rent_actual DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(u.id)::INTEGER as total_units,
    COUNT(t.id)::INTEGER as occupied_units,
    (COUNT(u.id) - COUNT(t.id))::INTEGER as vacant_units,
    CASE
      WHEN COUNT(u.id) > 0 THEN ROUND((COUNT(t.id)::DECIMAL / COUNT(u.id)) * 100, 2)
      ELSE 0::DECIMAL
    END as occupancy_rate,
    COALESCE(SUM(u.monthly_rent_kes), 0) as monthly_rent_potential,
    COALESCE(SUM(CASE WHEN t.id IS NOT NULL THEN u.monthly_rent_kes ELSE 0 END), 0) as monthly_rent_actual
  FROM units u
  LEFT JOIN tenants t ON u.id = t.current_unit_id AND t.status = 'ACTIVE'
  WHERE u.property_id = p_property_id AND u.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant balance
CREATE OR REPLACE FUNCTION get_tenant_balance(p_tenant_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_balance DECIMAL := 0;
BEGIN
  -- Calculate balance as total invoiced amount minus total payments
  SELECT 
    COALESCE(SUM(ri.amount_due_kes), 0) - COALESCE(SUM(ri.amount_paid_kes), 0)
  INTO v_balance
  FROM rent_invoices ri
  WHERE ri.tenant_id = p_tenant_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to apply payment to tenant invoices
CREATE OR REPLACE FUNCTION apply_payment(
  p_tenant_id UUID,
  p_amount_kes DECIMAL,
  p_payment_date DATE,
  p_method payment_method DEFAULT 'CASH',
  p_tx_ref TEXT DEFAULT NULL,
  p_posted_by_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_remaining_amount DECIMAL := p_amount_kes;
  v_invoice RECORD;
  v_allocation_amount DECIMAL;
BEGIN
  -- Create payment record
  INSERT INTO payments (
    tenant_id,
    amount_kes,
    payment_date,
    method,
    tx_ref,
    posted_by_user_id
  ) VALUES (
    p_tenant_id,
    p_amount_kes,
    p_payment_date,
    p_method,
    p_tx_ref,
    p_posted_by_user_id
  ) RETURNING id INTO v_payment_id;

  -- Allocate payment to outstanding invoices (oldest first)
  FOR v_invoice IN
    SELECT id, amount_due_kes, amount_paid_kes
    FROM rent_invoices
    WHERE tenant_id = p_tenant_id 
      AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
      AND amount_due_kes > amount_paid_kes
    ORDER BY due_date ASC
  LOOP
    EXIT WHEN v_remaining_amount <= 0;
    
    -- Calculate how much to allocate to this invoice
    v_allocation_amount := LEAST(
      v_remaining_amount,
      v_invoice.amount_due_kes - v_invoice.amount_paid_kes
    );
    
    -- Create payment allocation
    INSERT INTO payment_allocations (
      payment_id,
      invoice_id,
      amount_kes
    ) VALUES (
      v_payment_id,
      v_invoice.id,
      v_allocation_amount
    );
    
    -- Update invoice paid amount
    UPDATE rent_invoices
    SET 
      amount_paid_kes = amount_paid_kes + v_allocation_amount,
      status = CASE
        WHEN amount_paid_kes + v_allocation_amount >= amount_due_kes THEN 'PAID'
        WHEN amount_paid_kes + v_allocation_amount > 0 THEN 'PARTIAL'
        ELSE status
      END
    WHERE id = v_invoice.id;
    
    v_remaining_amount := v_remaining_amount - v_allocation_amount;
  END LOOP;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to run monthly rent invoicing
CREATE OR REPLACE FUNCTION run_monthly_rent(
  p_period_start DATE,
  p_due_date DATE DEFAULT NULL
) RETURNS TABLE (
  invoices_created INTEGER,
  total_amount_kes DECIMAL
) AS $$
DECLARE
  v_due_date DATE;
  v_invoices_created INTEGER := 0;
  v_total_amount DECIMAL := 0;
  v_agreement RECORD;
  v_invoice_id UUID;
BEGIN
  -- Set default due date if not provided (15th of the month)
  v_due_date := COALESCE(p_due_date, p_period_start + INTERVAL '15 days');
  
  -- Create invoices for all active tenancy agreements
  FOR v_agreement IN
    SELECT 
      ta.id as agreement_id,
      ta.tenant_id,
      ta.unit_id,
      ta.rent_kes,
      ta.billing_day,
      u.property_id
    FROM tenancy_agreements ta
    JOIN units u ON ta.unit_id = u.id
    WHERE ta.status = 'ACTIVE'
      AND ta.start_date <= p_period_start
      AND (ta.end_date IS NULL OR ta.end_date >= p_period_start)
  LOOP
    -- Check if invoice already exists for this period
    IF NOT EXISTS (
      SELECT 1 FROM rent_invoices
      WHERE tenant_id = v_agreement.tenant_id
        AND unit_id = v_agreement.unit_id
        AND period_start = p_period_start
    ) THEN
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
        p_period_start + INTERVAL '1 month' - INTERVAL '1 day',
        v_due_date,
        v_agreement.rent_kes,
        0,
        'PENDING'
      ) RETURNING id INTO v_invoice_id;
      
      v_invoices_created := v_invoices_created + 1;
      v_total_amount := v_total_amount + v_agreement.rent_kes;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_invoices_created, v_total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to terminate tenancy
CREATE OR REPLACE FUNCTION terminate_tenancy(
  p_tenancy_agreement_id UUID,
  p_termination_date DATE,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_agreement RECORD;
  v_final_invoice_id UUID;
BEGIN
  -- Get tenancy agreement details
  SELECT * INTO v_agreement
  FROM tenancy_agreements
  WHERE id = p_tenancy_agreement_id AND status = 'ACTIVE';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active tenancy agreement not found';
  END IF;
  
  -- Update tenancy agreement status
  UPDATE tenancy_agreements
  SET 
    status = 'TERMINATED',
    end_date = p_termination_date,
    notes = COALESCE(notes || ' | ', '') || 'Terminated: ' || COALESCE(p_reason, 'No reason provided')
  WHERE id = p_tenancy_agreement_id;
  
  -- Update tenant status
  UPDATE tenants
  SET 
    status = 'INACTIVE',
    current_unit_id = NULL,
    end_date = p_termination_date
  WHERE id = v_agreement.tenant_id;
  
  -- Create final invoice if termination is mid-month
  IF EXTRACT(DAY FROM p_termination_date) > 1 THEN
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
      v_agreement.id,
      DATE_TRUNC('month', p_termination_date),
      p_termination_date,
      p_termination_date,
      ROUND(v_agreement.rent_kes * EXTRACT(DAY FROM p_termination_date) / EXTRACT(DAY FROM DATE_TRUNC('month', p_termination_date) + INTERVAL '1 month' - INTERVAL '1 day'), 2),
      0,
      'PENDING'
    ) RETURNING id INTO v_final_invoice_id;
  END IF;
  
  RETURN v_final_invoice_id;
END;
$$ LANGUAGE plpgsql;
