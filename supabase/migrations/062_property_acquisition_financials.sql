-- Migration: Property Acquisition Financial Tracking System
-- Description: Complete database schema for tracking property acquisition costs and payment installments

-- Add purchase price field to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS purchase_price_agreement_kes DECIMAL(15,2);

-- Add comment for documentation
COMMENT ON COLUMN properties.purchase_price_agreement_kes IS 'Purchase price as specified in the sales agreement';

-- Create acquisition cost entries table
CREATE TABLE IF NOT EXISTS property_acquisition_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cost_type_id VARCHAR(100) NOT NULL,
  cost_category VARCHAR(50) NOT NULL,
  amount_kes DECIMAL(12,2) NOT NULL CHECK (amount_kes >= 0),
  payment_reference VARCHAR(255),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_cost_category CHECK (
    cost_category IN ('PRE_PURCHASE', 'AGREEMENT_LEGAL', 'LCB_PROCESS', 'TRANSFER_REGISTRATION', 'OTHER')
  ),
  CONSTRAINT valid_cost_type_id CHECK (
    cost_type_id IN (
      'site_visit_costs', 'broker_meeting_costs', 'due_diligence_costs', 'legal_consultation',
      'paperwork_preparation', 'contract_review_fees', 'initial_deposit', 'broker_commission',
      'lcb_application_fees', 'lcb_transport_costs', 'lcb_meeting_costs',
      'transfer_forms_prep', 'property_valuation', 'stamp_duty', 'lra_33_forms',
      'registration_legal_fees', 'registry_submission', 'registry_facilitation', 'title_deed_collection',
      'other_cost'
    )
  )
);

-- Create payment installments table
CREATE TABLE IF NOT EXISTS property_payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount_kes DECIMAL(12,2) NOT NULL CHECK (amount_kes > 0),
  payment_date DATE,
  payment_reference VARCHAR(255),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_payment_method CHECK (
    payment_method IS NULL OR payment_method IN ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'OTHER')
  ),
  CONSTRAINT positive_installment_number CHECK (installment_number > 0),
  
  -- Unique constraint to prevent duplicate installment numbers per property
  UNIQUE(property_id, installment_number)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_acquisition_costs_property_id ON property_acquisition_costs(property_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_costs_category ON property_acquisition_costs(cost_category);
CREATE INDEX IF NOT EXISTS idx_acquisition_costs_type ON property_acquisition_costs(cost_type_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_costs_created_at ON property_acquisition_costs(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_installments_property_id ON property_payment_installments(property_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_number ON property_payment_installments(property_id, installment_number);
CREATE INDEX IF NOT EXISTS idx_payment_installments_created_at ON property_payment_installments(created_at);

-- Add updated_at trigger for acquisition costs
CREATE OR REPLACE FUNCTION update_acquisition_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_acquisition_costs_updated_at
  BEFORE UPDATE ON property_acquisition_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_acquisition_costs_updated_at();

-- Add updated_at trigger for payment installments
CREATE OR REPLACE FUNCTION update_payment_installments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_installments_updated_at
  BEFORE UPDATE ON property_payment_installments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_installments_updated_at();

-- Function to calculate acquisition financial summary
CREATE OR REPLACE FUNCTION get_property_acquisition_summary(property_uuid UUID)
RETURNS TABLE (
  property_id UUID,
  purchase_price_agreement_kes DECIMAL(15,2),
  total_acquisition_costs_kes DECIMAL(15,2),
  total_payments_kes DECIMAL(15,2),
  remaining_balance_kes DECIMAL(15,2),
  total_investment_kes DECIMAL(15,2),
  cost_breakdown JSONB
) AS $$
DECLARE
  purchase_price DECIMAL(15,2);
  total_costs DECIMAL(15,2);
  total_payments DECIMAL(15,2);
  cost_breakdown_json JSONB;
BEGIN
  -- Get purchase price
  SELECT p.purchase_price_agreement_kes INTO purchase_price
  FROM properties p WHERE p.id = property_uuid;
  
  -- Calculate total acquisition costs
  SELECT COALESCE(SUM(amount_kes), 0) INTO total_costs
  FROM property_acquisition_costs WHERE property_id = property_uuid;
  
  -- Calculate total payments
  SELECT COALESCE(SUM(amount_kes), 0) INTO total_payments
  FROM property_payment_installments WHERE property_id = property_uuid;
  
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
    FROM property_acquisition_costs 
    WHERE property_id = property_uuid
    GROUP BY cost_category
  ) breakdown;
  
  RETURN QUERY SELECT 
    property_uuid,
    COALESCE(purchase_price, 0),
    COALESCE(total_costs, 0),
    COALESCE(total_payments, 0),
    COALESCE(purchase_price, 0) - COALESCE(total_payments, 0),
    COALESCE(purchase_price, 0) + COALESCE(total_costs, 0),
    cost_breakdown_json;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy querying of acquisition financial data
CREATE OR REPLACE VIEW property_acquisition_financials_view AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  p.purchase_price_agreement_kes,
  COALESCE(costs.total_costs, 0) as total_acquisition_costs_kes,
  COALESCE(payments.total_payments, 0) as total_payments_kes,
  COALESCE(p.purchase_price_agreement_kes, 0) - COALESCE(payments.total_payments, 0) as remaining_balance_kes,
  COALESCE(p.purchase_price_agreement_kes, 0) + COALESCE(costs.total_costs, 0) as total_investment_kes,
  costs.cost_count,
  payments.payment_count
FROM properties p
LEFT JOIN (
  SELECT 
    property_id,
    SUM(amount_kes) as total_costs,
    COUNT(*) as cost_count
  FROM property_acquisition_costs
  GROUP BY property_id
) costs ON p.id = costs.property_id
LEFT JOIN (
  SELECT 
    property_id,
    SUM(amount_kes) as total_payments,
    COUNT(*) as payment_count
  FROM property_payment_installments
  GROUP BY property_id
) payments ON p.id = payments.property_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON property_acquisition_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON property_payment_installments TO authenticated;
GRANT SELECT ON property_acquisition_financials_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_acquisition_summary(UUID) TO authenticated;

-- Add RLS policies
ALTER TABLE property_acquisition_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_payment_installments ENABLE ROW LEVEL SECURITY;

-- RLS policy for acquisition costs - users can only access costs for properties they own or manage
CREATE POLICY acquisition_costs_access_policy ON property_acquisition_costs
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- RLS policy for payment installments - users can only access payments for properties they own or manage
CREATE POLICY payment_installments_access_policy ON property_payment_installments
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE property_acquisition_costs IS 'Stores individual acquisition cost entries for properties';
COMMENT ON TABLE property_payment_installments IS 'Stores payment installments toward property purchase price';
COMMENT ON FUNCTION get_property_acquisition_summary(UUID) IS 'Calculates comprehensive financial summary for property acquisition';
COMMENT ON VIEW property_acquisition_financials_view IS 'Consolidated view of property acquisition financial data';
