-- 070: Handover Transition Improvements
-- Add fields to support auto-transition from marketplace to handover pipeline

-- Add new columns to handover_pipeline table for better tracking
ALTER TABLE handover_pipeline 
  ADD COLUMN IF NOT EXISTS client_interest_id UUID REFERENCES client_property_interests(id),
  ADD COLUMN IF NOT EXISTS transition_trigger TEXT CHECK (transition_trigger IN ('deposit_paid', 'agreement_signed', 'admin_manual')),
  ADD COLUMN IF NOT EXISTS marketplace_source BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservation_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE;

-- Add comments for new columns
COMMENT ON COLUMN handover_pipeline.client_interest_id IS 'Reference to the client interest record that triggered this handover';
COMMENT ON COLUMN handover_pipeline.transition_trigger IS 'Event that triggered the transition to handover pipeline';
COMMENT ON COLUMN handover_pipeline.marketplace_source IS 'Whether this handover originated from marketplace client portal';
COMMENT ON COLUMN handover_pipeline.reservation_date IS 'Date when client reserved the property';
COMMENT ON COLUMN handover_pipeline.deposit_paid_at IS 'Date when client paid the deposit';
COMMENT ON COLUMN handover_pipeline.agreement_signed_at IS 'Date when purchase agreement was signed';
COMMENT ON COLUMN handover_pipeline.payment_reference IS 'Payment reference from client portal';
COMMENT ON COLUMN handover_pipeline.payment_verified_at IS 'Date when payment was verified';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_client_interest ON handover_pipeline(client_interest_id);
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_transition_trigger ON handover_pipeline(transition_trigger);
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_marketplace_source ON handover_pipeline(marketplace_source) WHERE marketplace_source = true;
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_deposit_paid ON handover_pipeline(deposit_paid_at) WHERE deposit_paid_at IS NOT NULL;

-- Add a function to automatically transition properties based on client actions
CREATE OR REPLACE FUNCTION auto_transition_to_handover(
  p_property_id UUID,
  p_client_id UUID,
  p_trigger_event TEXT,
  p_interest_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property RECORD;
  v_client RECORD;
  v_interest RECORD;
  v_handover_id UUID;
  v_current_stage TEXT;
  v_progress INTEGER;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_trigger_event NOT IN ('deposit_paid', 'agreement_signed', 'admin_manual') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid trigger event');
  END IF;

  -- Get property details
  SELECT * INTO v_property FROM properties WHERE id = p_property_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Property not found');
  END IF;

  -- Get client details
  SELECT * INTO v_client FROM clients WHERE id = p_client_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Client not found');
  END IF;

  -- Get client interest (prefer CONVERTED status)
  IF p_interest_id IS NOT NULL THEN
    SELECT * INTO v_interest FROM client_property_interests 
    WHERE id = p_interest_id AND property_id = p_property_id AND client_id = p_client_id;
  ELSE
    SELECT * INTO v_interest FROM client_property_interests 
    WHERE property_id = p_property_id AND client_id = p_client_id 
    ORDER BY (CASE WHEN status = 'CONVERTED' THEN 1 ELSE 2 END), updated_at DESC 
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No client interest found');
  END IF;

  -- Check if handover already exists
  IF EXISTS (SELECT 1 FROM handover_pipeline WHERE property_id = p_property_id) THEN
    RETURN json_build_object('success', false, 'error', 'Handover pipeline already exists for this property');
  END IF;

  -- Determine stage and progress based on trigger and interest data
  CASE p_trigger_event
    WHEN 'deposit_paid' THEN
      IF v_interest.deposit_paid_at IS NOT NULL THEN
        v_current_stage := 'Deposit Collection';
        v_progress := 40;
      ELSE
        v_current_stage := 'Initial Handover Preparation';
        v_progress := 10;
      END IF;
    WHEN 'agreement_signed' THEN
      IF v_interest.agreement_signed_at IS NOT NULL THEN
        v_current_stage := 'Agreement Execution';
        v_progress := 60;
      ELSIF v_interest.deposit_paid_at IS NOT NULL THEN
        v_current_stage := 'Deposit Collection';
        v_progress := 40;
      ELSE
        v_current_stage := 'Initial Handover Preparation';
        v_progress := 10;
      END IF;
    WHEN 'admin_manual' THEN
      IF v_interest.agreement_signed_at IS NOT NULL THEN
        v_current_stage := 'Agreement Execution';
        v_progress := 60;
      ELSIF v_interest.deposit_paid_at IS NOT NULL THEN
        v_current_stage := 'Deposit Collection';
        v_progress := 40;
      ELSE
        v_current_stage := 'Initial Handover Preparation';
        v_progress := 10;
      END IF;
  END CASE;

  -- Update property status
  UPDATE properties 
  SET handover_status = 'IN_PROGRESS', updated_at = NOW()
  WHERE id = p_property_id AND handover_status != 'IN_PROGRESS';

  -- Create handover pipeline record
  INSERT INTO handover_pipeline (
    property_id,
    property_name,
    property_address,
    property_type,
    client_id,
    buyer_name,
    buyer_contact,
    buyer_email,
    handover_status,
    current_stage,
    overall_progress,
    asking_price_kes,
    negotiated_price_kes,
    deposit_received_kes,
    client_interest_id,
    transition_trigger,
    marketplace_source,
    reservation_date,
    deposit_paid_at,
    agreement_signed_at,
    payment_reference,
    payment_verified_at,
    legal_representative,
    created_at,
    updated_at
  ) VALUES (
    p_property_id,
    v_property.name,
    v_property.physical_address,
    v_property.property_type,
    p_client_id,
    v_client.full_name,
    v_client.phone,
    v_client.email,
    'IN_PROGRESS',
    v_current_stage,
    v_progress,
    COALESCE(v_property.asking_price_kes, v_property.sale_price_kes, 0),
    (v_interest.payment_data->>'propertyPrice')::DECIMAL,
    v_interest.deposit_amount_kes,
    v_interest.id,
    p_trigger_event,
    true,
    v_interest.reservation_date,
    v_interest.deposit_paid_at,
    v_interest.agreement_signed_at,
    v_interest.payment_reference,
    v_interest.payment_verified_at,
    'To be assigned',
    NOW(),
    NOW()
  ) RETURNING id INTO v_handover_id;

  -- Update client interest status
  UPDATE client_property_interests 
  SET status = 'IN_HANDOVER', updated_at = NOW()
  WHERE id = v_interest.id;

  -- Return success result
  v_result := json_build_object(
    'success', true,
    'handover_id', v_handover_id,
    'current_stage', v_current_stage,
    'progress', v_progress,
    'trigger_event', p_trigger_event
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Return error result
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

-- Add comment for the function
COMMENT ON FUNCTION auto_transition_to_handover IS 'Automatically transition a property from marketplace to handover pipeline based on client actions';

-- Create a view for handover pipeline with client details
CREATE OR REPLACE VIEW handover_pipeline_with_client AS
SELECT 
  hp.*,
  c.full_name as client_full_name,
  c.email as client_email,
  c.phone as client_phone,
  c.status as client_status,
  cpi.status as interest_status,
  cpi.contact_preference,
  cpi.message as interest_message,
  cpi.notes as interest_notes,
  p.name as property_name_current,
  p.physical_address as property_address_current,
  p.property_type as property_type_current,
  p.asking_price_kes as property_asking_price_current
FROM handover_pipeline hp
LEFT JOIN clients c ON hp.client_id = c.id
LEFT JOIN client_property_interests cpi ON hp.client_interest_id = cpi.id
LEFT JOIN properties p ON hp.property_id = p.id;

-- Add RLS policy for the new view (if RLS is enabled)
-- This will inherit from the base tables' policies

-- Grant necessary permissions
GRANT SELECT ON handover_pipeline_with_client TO authenticated;
GRANT EXECUTE ON FUNCTION auto_transition_to_handover TO authenticated;
