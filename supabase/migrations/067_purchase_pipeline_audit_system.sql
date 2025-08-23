-- 067: Purchase Pipeline Audit and Security System
-- Implements comprehensive audit trails and change tracking

-- 1. Create audit log table for all purchase pipeline changes
CREATE TABLE purchase_pipeline_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchase_pipeline(id) ON DELETE CASCADE,
  
  -- Change tracking
  operation_type TEXT NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'STAGE_UPDATE')),
  changed_fields JSONB NOT NULL, -- Array of field names that changed
  old_values JSONB, -- Previous values (null for INSERT)
  new_values JSONB, -- New values (null for DELETE)
  
  -- Context and authorization
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_reason TEXT, -- Required for sensitive changes
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create sensitive fields configuration
CREATE TABLE purchase_pipeline_field_security (
  field_name TEXT PRIMARY KEY,
  security_level TEXT NOT NULL CHECK (security_level IN ('PUBLIC', 'RESTRICTED', 'CONFIDENTIAL', 'LOCKED')),
  requires_reason BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT FALSE,
  allowed_roles TEXT[] DEFAULT '{}',
  max_changes_per_day INTEGER DEFAULT NULL,
  lock_after_stage INTEGER DEFAULT NULL -- Lock field after reaching this stage
);

-- Insert field security configurations
INSERT INTO purchase_pipeline_field_security (field_name, security_level, requires_reason, requires_approval, allowed_roles, max_changes_per_day, lock_after_stage) VALUES
-- Financial fields - highly sensitive
('asking_price_kes', 'CONFIDENTIAL', TRUE, TRUE, ARRAY['admin', 'finance_manager'], 3, 6),
('negotiated_price_kes', 'CONFIDENTIAL', TRUE, TRUE, ARRAY['admin', 'finance_manager'], 3, 6),
('deposit_paid_kes', 'CONFIDENTIAL', TRUE, TRUE, ARRAY['admin', 'finance_manager'], 5, 7),

-- Legal and contract fields
('contract_reference', 'RESTRICTED', TRUE, FALSE, ARRAY['admin', 'legal', 'property_manager'], 2, 7),
('title_deed_status', 'RESTRICTED', TRUE, FALSE, ARRAY['admin', 'legal'], 3, NULL),
('legal_representative', 'RESTRICTED', FALSE, FALSE, ARRAY['admin', 'legal', 'property_manager'], 5, NULL),

-- Property details
('property_name', 'RESTRICTED', TRUE, FALSE, ARRAY['admin', 'property_manager'], 2, 5),
('property_address', 'RESTRICTED', TRUE, FALSE, ARRAY['admin', 'property_manager'], 2, 5),
('property_type', 'RESTRICTED', TRUE, FALSE, ARRAY['admin', 'property_manager'], 1, 4),

-- Seller information
('seller_name', 'RESTRICTED', FALSE, FALSE, ARRAY['admin', 'property_manager'], 3, 6),
('seller_contact', 'RESTRICTED', FALSE, FALSE, ARRAY['admin', 'property_manager'], 5, NULL),
('seller_email', 'RESTRICTED', FALSE, FALSE, ARRAY['admin', 'property_manager'], 5, NULL),

-- Status and progress - critical for workflow
('purchase_status', 'LOCKED', TRUE, TRUE, ARRAY['admin', 'workflow_manager'], 10, NULL),
('current_stage', 'LOCKED', TRUE, FALSE, ARRAY['admin', 'workflow_manager'], 20, NULL),

-- Assessment and notes
('risk_assessment', 'RESTRICTED', FALSE, FALSE, ARRAY['admin', 'risk_manager', 'property_manager'], 10, NULL),
('property_condition_notes', 'PUBLIC', FALSE, FALSE, ARRAY['admin', 'property_manager', 'inspector'], 10, NULL);

-- 3. Create change approval workflow table
CREATE TABLE purchase_pipeline_change_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID NOT NULL REFERENCES purchase_pipeline_audit_log(id),
  purchase_id UUID NOT NULL REFERENCES purchase_pipeline(id),
  
  -- Approval details
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Approval chain
  approver_role TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Details
  change_summary TEXT NOT NULL,
  business_justification TEXT NOT NULL,
  risk_assessment TEXT,
  approval_notes TEXT,
  
  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_purchase_audit_log_purchase_id ON purchase_pipeline_audit_log(purchase_id, created_at DESC);
CREATE INDEX idx_purchase_audit_log_user ON purchase_pipeline_audit_log(changed_by, created_at DESC);
CREATE INDEX idx_purchase_audit_log_operation ON purchase_pipeline_audit_log(operation_type, created_at DESC);
CREATE INDEX idx_purchase_change_approvals_status ON purchase_pipeline_change_approvals(status, requested_at DESC);
CREATE INDEX idx_purchase_change_approvals_approver ON purchase_pipeline_change_approvals(assigned_to, status);

-- 5. Enable RLS on audit tables
ALTER TABLE purchase_pipeline_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_pipeline_field_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_pipeline_change_approvals ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Audit log - users can see logs for purchases they have access to
CREATE POLICY "Users can view audit logs for accessible purchases" ON purchase_pipeline_audit_log
  FOR SELECT USING (
    purchase_id IN (
      SELECT id FROM purchase_pipeline 
      WHERE created_by = auth.uid() OR assigned_to = auth.uid()
    )
  );

-- Field security - readable by all authenticated users
CREATE POLICY "Field security is readable by authenticated users" ON purchase_pipeline_field_security
  FOR SELECT USING (auth.role() = 'authenticated');

-- Change approvals - users can see their own requests and assigned approvals
CREATE POLICY "Users can view relevant change approvals" ON purchase_pipeline_change_approvals
  FOR SELECT USING (
    requested_by = auth.uid() OR 
    assigned_to = auth.uid() OR 
    approved_by = auth.uid()
  );

-- 7. Create audit trigger function
CREATE OR REPLACE FUNCTION audit_purchase_pipeline_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
  old_vals JSONB;
  new_vals JSONB;
  field_name TEXT;
  field_security RECORD;
  requires_approval BOOLEAN := FALSE;
BEGIN
  -- Determine operation type
  IF TG_OP = 'INSERT' THEN
    new_vals := to_jsonb(NEW);
    old_vals := NULL;
    changed_fields := ARRAY(SELECT jsonb_object_keys(new_vals));
  ELSIF TG_OP = 'UPDATE' THEN
    old_vals := to_jsonb(OLD);
    new_vals := to_jsonb(NEW);
    changed_fields := ARRAY(
      SELECT key FROM jsonb_each(old_vals) 
      WHERE old_vals->key IS DISTINCT FROM new_vals->key
    );
  ELSIF TG_OP = 'DELETE' THEN
    old_vals := to_jsonb(OLD);
    new_vals := NULL;
    changed_fields := ARRAY(SELECT jsonb_object_keys(old_vals));
  END IF;

  -- Check if any changed fields require approval
  FOREACH field_name IN ARRAY changed_fields LOOP
    SELECT * INTO field_security 
    FROM purchase_pipeline_field_security 
    WHERE field_name = field_name;
    
    IF field_security.requires_approval THEN
      requires_approval := TRUE;
      EXIT;
    END IF;
  END LOOP;

  -- Insert audit log entry
  INSERT INTO purchase_pipeline_audit_log (
    purchase_id,
    operation_type,
    changed_fields,
    old_values,
    new_values,
    changed_by,
    requires_approval,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    changed_fields,
    old_vals,
    new_vals,
    auth.uid(),
    requires_approval,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create the audit trigger
CREATE TRIGGER purchase_pipeline_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_pipeline
  FOR EACH ROW EXECUTE FUNCTION audit_purchase_pipeline_changes();

-- 9. Add comments for documentation
COMMENT ON TABLE purchase_pipeline_audit_log IS 'Comprehensive audit trail for all purchase pipeline changes';
COMMENT ON TABLE purchase_pipeline_field_security IS 'Security configuration for individual fields';
COMMENT ON TABLE purchase_pipeline_change_approvals IS 'Approval workflow for sensitive changes';
