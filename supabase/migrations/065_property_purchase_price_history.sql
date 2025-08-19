-- Create property purchase price history table for audit trail
CREATE TABLE IF NOT EXISTS property_purchase_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  previous_price_kes DECIMAL(15,2),
  new_price_kes DECIMAL(15,2) NOT NULL,
  change_reason TEXT NOT NULL CHECK (length(change_reason) >= 10),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_price_history_property ON property_purchase_price_history(property_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_price_history_user ON property_purchase_price_history(changed_by);

-- Enable RLS
ALTER TABLE property_purchase_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see history for properties they have access to
CREATE POLICY "Users can view purchase price history for accessible properties" ON property_purchase_price_history
  FOR SELECT USING (
    property_id IN (
      SELECT property_id 
      FROM get_user_accessible_properties(auth.uid())
    )
  );

-- RLS Policy: Users can insert history records for properties they can edit
CREATE POLICY "Users can insert purchase price history for editable properties" ON property_purchase_price_history
  FOR INSERT WITH CHECK (
    property_id IN (
      SELECT property_id 
      FROM get_user_accessible_properties(auth.uid())
      WHERE can_edit_property = true
    )
    AND changed_by = auth.uid()
  );

-- Function to get purchase price change history with user names
CREATE OR REPLACE FUNCTION get_purchase_price_history(property_uuid UUID)
RETURNS TABLE(
  id UUID,
  previous_price_kes DECIMAL(15,2),
  new_price_kes DECIMAL(15,2),
  change_reason TEXT,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ
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
    h.previous_price_kes,
    h.new_price_kes,
    h.change_reason,
    COALESCE(p.full_name, p.email, 'Unknown User') as changed_by_name,
    h.changed_at
  FROM property_purchase_price_history h
  LEFT JOIN profiles p ON h.changed_by = p.id
  WHERE h.property_id = property_uuid
  ORDER BY h.changed_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_purchase_price_history(UUID) TO authenticated;

-- Function to record purchase price change
CREATE OR REPLACE FUNCTION record_purchase_price_change(
  property_uuid UUID,
  old_price DECIMAL(15,2),
  new_price DECIMAL(15,2),
  reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  history_id UUID;
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

  -- Insert history record
  INSERT INTO property_purchase_price_history (
    property_id,
    previous_price_kes,
    new_price_kes,
    change_reason,
    changed_by
  ) VALUES (
    property_uuid,
    old_price,
    new_price,
    reason,
    auth.uid()
  ) RETURNING id INTO history_id;

  RETURN history_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_purchase_price_change(UUID, DECIMAL, DECIMAL, TEXT) TO authenticated;

-- Add last_updated_at and last_updated_by to properties table for purchase price tracking
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS purchase_price_last_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS purchase_price_last_updated_by UUID REFERENCES auth.users(id);

-- Create index for last updated tracking
CREATE INDEX IF NOT EXISTS idx_properties_purchase_price_updated ON properties(purchase_price_last_updated_at DESC);
