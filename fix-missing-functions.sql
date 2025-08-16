-- Fix missing business functions
-- Run this in Supabase SQL Editor

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
  p_method TEXT DEFAULT 'MPESA',
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
    p_method::payment_method,
    p_tx_ref,
    p_posted_by_user_id
  ) RETURNING id INTO v_payment_id;

  -- Allocate payment to invoices FIFO
  FOR v_invoice IN 
    SELECT id, amount_due_kes, amount_paid_kes
    FROM rent_invoices 
    WHERE tenant_id = p_tenant_id 
      AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
    ORDER BY due_date ASC
  LOOP
    EXIT WHEN v_remaining_amount <= 0;
    
    v_allocation_amount := LEAST(
      v_remaining_amount, 
      v_invoice.amount_due_kes - v_invoice.amount_paid_kes
    );
    
    -- Skip if no amount to allocate
    IF v_allocation_amount <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Update invoice
    UPDATE rent_invoices 
    SET 
      amount_paid_kes = amount_paid_kes + v_allocation_amount,
      status = CASE 
        WHEN amount_paid_kes + v_allocation_amount >= amount_due_kes THEN 'PAID'
        ELSE 'PARTIAL'
      END
    WHERE id = v_invoice.id;
    
    v_remaining_amount := v_remaining_amount - v_allocation_amount;
  END LOOP;
  
  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT 'Functions created successfully' as status;
