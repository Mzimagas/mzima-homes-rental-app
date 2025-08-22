-- Create property subdivision plan history table for audit trail
CREATE TABLE IF NOT EXISTS property_subdivision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  subdivision_id UUID REFERENCES property_subdivisions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('PLAN_CREATED', 'PLAN_MODIFIED', 'PLAN_CANCELLED', 'STATUS_CHANGED')),
  previous_status TEXT,
  new_status TEXT,
  subdivision_name TEXT,
  total_plots_planned INTEGER,
  change_reason TEXT NOT NULL CHECK (length(change_reason) >= 10),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_by_name TEXT, -- Cached for performance
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subdivision_history_property ON property_subdivision_history(property_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_subdivision_history_subdivision ON property_subdivision_history(subdivision_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_subdivision_history_user ON property_subdivision_history(changed_by);

-- Enable RLS
ALTER TABLE property_subdivision_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see history for properties they have access to
CREATE POLICY "Users can view subdivision history for accessible properties" ON property_subdivision_history
  FOR SELECT USING (
    property_id IN (
      SELECT property_id 
      FROM get_user_accessible_properties(auth.uid())
    )
  );

-- RLS Policy: Users can insert history records for properties they can edit
CREATE POLICY "Users can insert subdivision history for editable properties" ON property_subdivision_history
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT property_id 
      FROM get_user_accessible_properties(auth.uid())
      WHERE can_edit_property = true
    )
    AND changed_by = auth.uid()
  );

-- Function to get subdivision history with user names
CREATE OR REPLACE FUNCTION get_subdivision_history(property_uuid UUID)
RETURNS TABLE(
  id UUID,
  action_type TEXT,
  previous_status TEXT,
  new_status TEXT,
  subdivision_name TEXT,
  total_plots_planned INTEGER,
  change_reason TEXT,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if user has access to this property
  IF NOT EXISTS (
    SELECT 1 FROM get_user_accessible_properties(auth.uid()) 
    WHERE property_id = property_uuid
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    h.id,
    h.action_type,
    h.previous_status,
    h.new_status,
    h.subdivision_name,
    h.total_plots_planned,
    h.change_reason,
    COALESCE(h.changed_by_name, p.full_name, p.email, 'Unknown User') as changed_by_name,
    h.changed_at,
    h.details
  FROM property_subdivision_history h
  LEFT JOIN profiles p ON h.changed_by = p.id
  WHERE h.property_id = property_uuid
  ORDER BY h.changed_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_subdivision_history(UUID) TO authenticated;

-- Function to record subdivision history
CREATE OR REPLACE FUNCTION record_subdivision_history(
  property_uuid UUID,
  subdivision_uuid UUID,
  action_type_param TEXT,
  previous_status_param TEXT,
  new_status_param TEXT,
  subdivision_name_param TEXT,
  total_plots_param INTEGER,
  reason TEXT,
  details_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  history_id UUID;
  user_name TEXT;
BEGIN
  -- Validate reason length
  IF length(reason) < 10 THEN
    RAISE EXCEPTION 'Change reason must be at least 10 characters long';
  END IF;

  -- Check if user has edit access to this property
  IF NOT EXISTS (
    SELECT 1 FROM get_user_accessible_properties(auth.uid())
    WHERE property_id = property_uuid AND can_edit_property = true
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to modify this property';
  END IF;

  -- Get user name for caching
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_name
  FROM profiles
  WHERE id = auth.uid();

  -- Insert history record
  INSERT INTO property_subdivision_history (
    property_id,
    subdivision_id,
    action_type,
    previous_status,
    new_status,
    subdivision_name,
    total_plots_planned,
    change_reason,
    changed_by,
    changed_by_name,
    details
  ) VALUES (
    property_uuid,
    subdivision_uuid,
    action_type_param,
    previous_status_param,
    new_status_param,
    subdivision_name_param,
    total_plots_param,
    reason,
    auth.uid(),
    user_name,
    details_param
  ) RETURNING id INTO history_id;

  RETURN history_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_subdivision_history(UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE property_subdivision_history IS 'Audit trail for subdivision plan creation and modifications';
COMMENT ON FUNCTION get_subdivision_history(UUID) IS 'Retrieves subdivision history for a property with proper access control';
COMMENT ON FUNCTION record_subdivision_history(UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) IS 'Records subdivision plan changes with audit trail';
