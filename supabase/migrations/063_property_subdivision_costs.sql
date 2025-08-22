-- Migration: Property Subdivision Costs Tracking System
-- Description: Database schema for tracking subdivision-related expenses for properties

-- Create subdivision cost entries table
CREATE TABLE IF NOT EXISTS property_subdivision_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cost_type_id VARCHAR(100) NOT NULL,
  cost_category VARCHAR(50) NOT NULL,
  amount_kes DECIMAL(12,2) NOT NULL CHECK (amount_kes >= 0),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  payment_reference VARCHAR(255),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_subdivision_cost_category CHECK (
    cost_category IN (
      'STATUTORY_BOARD_FEES', 
      'SURVEY_PLANNING_FEES', 
      'REGISTRATION_TITLE_FEES', 
      'LEGAL_COMPLIANCE', 
      'OTHER_CHARGES'
    )
  ),
  CONSTRAINT valid_payment_status CHECK (
    payment_status IN ('PENDING', 'PAID', 'PARTIALLY_PAID')
  ),
  CONSTRAINT valid_subdivision_cost_type_id CHECK (
    cost_type_id IN (
      -- Statutory & Board Fees
      'lcb_normal_fee', 'lcb_special_fee', 'board_application_fee',
      
      -- Survey & Planning Fees
      'scheme_plan_preparation', 'mutation_drawing', 'mutation_checking',
      'surveyor_professional_fees', 'map_amendment', 'rim_update',
      'new_parcel_numbers',
      
      -- Registration & Title Fees
      'new_title_registration', 'registrar_fees', 'title_printing',
      
      -- Legal & Compliance
      'compliance_certificate', 'development_fee', 'admin_costs',
      'search_fee', 'land_rates_clearance', 'stamp_duty',
      
      -- Other Charges
      'county_planning_fees', 'professional_legal_fees', 'miscellaneous_disbursements'
    )
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subdivision_costs_property_id ON property_subdivision_costs(property_id);
CREATE INDEX IF NOT EXISTS idx_subdivision_costs_category ON property_subdivision_costs(cost_category);
CREATE INDEX IF NOT EXISTS idx_subdivision_costs_payment_status ON property_subdivision_costs(payment_status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_subdivision_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subdivision_costs_updated_at_trigger
  BEFORE UPDATE ON property_subdivision_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_subdivision_costs_updated_at();

-- Create function to calculate subdivision cost summary
CREATE OR REPLACE FUNCTION get_property_subdivision_summary(property_uuid UUID)
RETURNS TABLE (
  property_id UUID,
  total_subdivision_costs_kes DECIMAL(15,2),
  total_paid_kes DECIMAL(15,2),
  total_pending_kes DECIMAL(15,2),
  cost_breakdown_by_category JSONB,
  payment_status_breakdown JSONB
) AS $$
DECLARE
  total_costs DECIMAL(15,2) := 0;
  total_paid DECIMAL(15,2) := 0;
  total_pending DECIMAL(15,2) := 0;
  cost_breakdown_json JSONB;
  payment_breakdown_json JSONB;
BEGIN
  -- Calculate total subdivision costs
  SELECT COALESCE(SUM(amount_kes), 0) INTO total_costs
  FROM property_subdivision_costs WHERE property_id = property_uuid;
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount_kes), 0) INTO total_paid
  FROM property_subdivision_costs 
  WHERE property_id = property_uuid AND payment_status = 'PAID';
  
  -- Calculate total pending
  SELECT COALESCE(SUM(amount_kes), 0) INTO total_pending
  FROM property_subdivision_costs 
  WHERE property_id = property_uuid AND payment_status IN ('PENDING', 'PARTIALLY_PAID');
  
  -- Calculate cost breakdown by category
  SELECT COALESCE(
    jsonb_object_agg(
      cost_category, 
      category_total
    ), 
    '{}'::jsonb
  ) INTO cost_breakdown_json
  FROM (
    SELECT 
      cost_category,
      SUM(amount_kes) as category_total
    FROM property_subdivision_costs 
    WHERE property_id = property_uuid
    GROUP BY cost_category
  ) breakdown;
  
  -- Calculate payment status breakdown
  SELECT COALESCE(
    jsonb_object_agg(
      payment_status, 
      status_total
    ), 
    '{}'::jsonb
  ) INTO payment_breakdown_json
  FROM (
    SELECT 
      payment_status,
      SUM(amount_kes) as status_total
    FROM property_subdivision_costs 
    WHERE property_id = property_uuid
    GROUP BY payment_status
  ) status_breakdown;
  
  RETURN QUERY SELECT 
    property_uuid,
    total_costs,
    total_paid,
    total_pending,
    cost_breakdown_json,
    payment_breakdown_json;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy querying of subdivision cost data
CREATE OR REPLACE VIEW property_subdivision_costs_view AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  COALESCE(costs.total_costs, 0) as total_subdivision_costs_kes,
  COALESCE(costs.total_paid, 0) as total_paid_kes,
  COALESCE(costs.total_pending, 0) as total_pending_kes,
  costs.cost_count,
  costs.paid_count,
  costs.pending_count
FROM properties p
LEFT JOIN (
  SELECT 
    property_id,
    SUM(amount_kes) as total_costs,
    SUM(CASE WHEN payment_status = 'PAID' THEN amount_kes ELSE 0 END) as total_paid,
    SUM(CASE WHEN payment_status IN ('PENDING', 'PARTIALLY_PAID') THEN amount_kes ELSE 0 END) as total_pending,
    COUNT(*) as cost_count,
    COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as paid_count,
    COUNT(CASE WHEN payment_status IN ('PENDING', 'PARTIALLY_PAID') THEN 1 END) as pending_count
  FROM property_subdivision_costs
  GROUP BY property_id
) costs ON p.id = costs.property_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON property_subdivision_costs TO authenticated;
GRANT SELECT ON property_subdivision_costs_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_subdivision_summary(UUID) TO authenticated;

-- Add RLS policies
ALTER TABLE property_subdivision_costs ENABLE ROW LEVEL SECURITY;

-- RLS policy for subdivision costs - users can only access costs for properties they own or manage
CREATE POLICY subdivision_costs_access_policy ON property_subdivision_costs
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE property_subdivision_costs IS 'Stores subdivision-related cost entries for properties';
COMMENT ON FUNCTION get_property_subdivision_summary(UUID) IS 'Calculates comprehensive subdivision cost summary for a property';
COMMENT ON VIEW property_subdivision_costs_view IS 'Consolidated view of property subdivision cost data';
