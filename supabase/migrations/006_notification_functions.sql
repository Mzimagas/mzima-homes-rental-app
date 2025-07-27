-- Migration 006: Notification Processing Functions
-- Create functions to support automated notification processing

-- Function to get pending notifications based on rules
CREATE OR REPLACE FUNCTION get_pending_notifications()
RETURNS TABLE (
  rule_id UUID,
  rule_type TEXT,
  rule_name TEXT,
  trigger_days INTEGER,
  channels TEXT[],
  landlord_id UUID,
  target_date DATE,
  notification_data JSONB
) AS $$
BEGIN
  -- Return rent due notifications
  RETURN QUERY
  SELECT 
    nr.id as rule_id,
    nr.type as rule_type,
    nr.name as rule_name,
    nr.trigger_days,
    nr.channels,
    nr.landlord_id,
    (CURRENT_DATE + INTERVAL '1 day' * nr.trigger_days)::DATE as target_date,
    jsonb_build_object(
      'invoice_id', ri.id,
      'tenant_id', ri.tenant_id,
      'tenant_name', t.name,
      'tenant_email', t.email,
      'tenant_phone', t.phone,
      'property_name', p.name,
      'unit_label', u.label,
      'amount_due', ri.amount_due_kes,
      'due_date', ri.due_date,
      'outstanding_amount', (ri.amount_due_kes - ri.amount_paid_kes)
    ) as notification_data
  FROM notification_rules nr
  JOIN rent_invoices ri ON ri.due_date = (CURRENT_DATE + INTERVAL '1 day' * nr.trigger_days)::DATE
  JOIN tenants t ON ri.tenant_id = t.id
  JOIN units u ON ri.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE nr.enabled = true
    AND nr.type = 'rent_due'
    AND ri.status IN ('PENDING', 'PARTIAL')
    AND t.landlord_id = nr.landlord_id

  UNION ALL

  -- Return overdue payment notifications
  SELECT 
    nr.id as rule_id,
    nr.type as rule_type,
    nr.name as rule_name,
    nr.trigger_days,
    nr.channels,
    nr.landlord_id,
    (CURRENT_DATE - INTERVAL '1 day' * nr.trigger_days)::DATE as target_date,
    jsonb_build_object(
      'invoice_id', ri.id,
      'tenant_id', ri.tenant_id,
      'tenant_name', t.name,
      'tenant_email', t.email,
      'tenant_phone', t.phone,
      'property_name', p.name,
      'unit_label', u.label,
      'amount_due', ri.amount_due_kes,
      'due_date', ri.due_date,
      'outstanding_amount', (ri.amount_due_kes - ri.amount_paid_kes),
      'days_overdue', nr.trigger_days
    ) as notification_data
  FROM notification_rules nr
  JOIN rent_invoices ri ON ri.due_date = (CURRENT_DATE - INTERVAL '1 day' * nr.trigger_days)::DATE
  JOIN tenants t ON ri.tenant_id = t.id
  JOIN units u ON ri.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE nr.enabled = true
    AND nr.type = 'payment_overdue'
    AND ri.status IN ('OVERDUE', 'PARTIAL')
    AND t.landlord_id = nr.landlord_id

  UNION ALL

  -- Return lease expiry notifications
  SELECT 
    nr.id as rule_id,
    nr.type as rule_type,
    nr.name as rule_name,
    nr.trigger_days,
    nr.channels,
    nr.landlord_id,
    (CURRENT_DATE + INTERVAL '1 day' * nr.trigger_days)::DATE as target_date,
    jsonb_build_object(
      'agreement_id', ta.id,
      'tenant_id', ta.tenant_id,
      'tenant_name', t.name,
      'tenant_email', t.email,
      'tenant_phone', t.phone,
      'property_name', p.name,
      'unit_label', u.label,
      'start_date', ta.start_date,
      'end_date', ta.end_date,
      'rent_amount', ta.rent_kes,
      'days_until_expiry', nr.trigger_days
    ) as notification_data
  FROM notification_rules nr
  JOIN tenancy_agreements ta ON ta.end_date = (CURRENT_DATE + INTERVAL '1 day' * nr.trigger_days)::DATE
  JOIN tenants t ON ta.tenant_id = t.id
  JOIN units u ON ta.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE nr.enabled = true
    AND nr.type = 'lease_expiring'
    AND ta.status = 'ACTIVE'
    AND t.landlord_id = nr.landlord_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if notification was already sent recently
CREATE OR REPLACE FUNCTION notification_already_sent(
  p_rule_id UUID,
  p_recipient_id UUID,
  p_type TEXT,
  p_hours_threshold INTEGER DEFAULT 24
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM notification_history
  WHERE rule_id = p_rule_id
    AND recipient_id = p_recipient_id
    AND type = p_type
    AND status IN ('sent', 'delivered')
    AND created_at > (NOW() - INTERVAL '1 hour' * p_hours_threshold);
    
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification history entry
CREATE OR REPLACE FUNCTION create_notification_history(
  p_rule_id UUID,
  p_landlord_id UUID,
  p_type TEXT,
  p_recipient_id UUID,
  p_recipient_contact TEXT,
  p_channel TEXT,
  p_subject TEXT,
  p_message TEXT,
  p_status TEXT DEFAULT 'pending',
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notification_history (
    rule_id,
    landlord_id,
    type,
    recipient_type,
    recipient_id,
    recipient_contact,
    channel,
    subject,
    message,
    status,
    metadata,
    created_at
  ) VALUES (
    p_rule_id,
    p_landlord_id,
    p_type,
    'tenant',
    p_recipient_id,
    p_recipient_contact,
    p_channel,
    p_subject,
    p_message,
    p_status,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update notification status
CREATE OR REPLACE FUNCTION update_notification_status(
  p_notification_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notification_history
  SET 
    status = p_status,
    error_message = p_error_message,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END
  WHERE id = p_notification_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get notification templates
CREATE OR REPLACE FUNCTION get_notification_template(
  p_landlord_id UUID,
  p_type TEXT,
  p_channel TEXT
) RETURNS TABLE (
  template_id UUID,
  subject TEXT,
  message TEXT,
  variables TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nt.id as template_id,
    nt.subject,
    nt.message,
    nt.variables
  FROM notification_templates nt
  WHERE nt.landlord_id = p_landlord_id
    AND nt.type = p_type
    AND nt.channel = p_channel
    AND nt.is_default = true
  LIMIT 1;
  
  -- If no custom template found, return default template
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID as template_id,
      CASE 
        WHEN p_type = 'rent_due' THEN 'Rent Payment Reminder'
        WHEN p_type = 'payment_overdue' THEN 'OVERDUE: Payment Required'
        WHEN p_type = 'lease_expiring' THEN 'Lease Expiry Notice'
        ELSE 'Notification'
      END as subject,
      CASE 
        WHEN p_type = 'rent_due' THEN 'Dear {{tenant_name}}, your rent payment is due soon.'
        WHEN p_type = 'payment_overdue' THEN 'Dear {{tenant_name}}, your payment is overdue.'
        WHEN p_type = 'lease_expiring' THEN 'Dear {{tenant_name}}, your lease is expiring soon.'
        ELSE 'Notification message'
      END as message,
      ARRAY['tenant_name', 'property_name', 'unit_label']::TEXT[] as variables;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to replace template variables
CREATE OR REPLACE FUNCTION replace_template_variables(
  p_template TEXT,
  p_variables JSONB
) RETURNS TEXT AS $$
DECLARE
  v_result TEXT := p_template;
  v_key TEXT;
  v_value TEXT;
BEGIN
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_result := REPLACE(v_result, '{{' || v_key || '}}', v_value);
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_history_rule_recipient 
ON notification_history(rule_id, recipient_id, type, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_history_status 
ON notification_history(status, created_at);

CREATE INDEX IF NOT EXISTS idx_rent_invoices_due_date_status 
ON rent_invoices(due_date, status);

CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_end_date_status 
ON tenancy_agreements(end_date, status);
