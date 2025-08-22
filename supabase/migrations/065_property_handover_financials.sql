-- Migration: Property Handover Financial Tracking System
-- Description: Complete database schema for tracking property handover costs and payment receipts

-- Add handover price field to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS handover_price_agreement_kes DECIMAL(15,2);

-- Add comment for documentation
COMMENT ON COLUMN properties.handover_price_agreement_kes IS 'Handover price as specified in the sales agreement';

-- Create handover cost entries table
CREATE TABLE IF NOT EXISTS property_handover_costs (
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
  CONSTRAINT valid_handover_cost_category CHECK (
    cost_category IN ('PRE_HANDOVER', 'AGREEMENT_LEGAL', 'LCB_PROCESS', 'PAYMENT_TRACKING', 'TRANSFER_REGISTRATION', 'OTHER')
  ),
  CONSTRAINT valid_handover_cost_type_id CHECK (
    cost_type_id IN (
      'property_valuation', 'market_research', 'property_inspection', 'marketing_preparation',
      'legal_fees', 'contract_preparation', 'due_diligence', 'title_verification',
      'lcb_application_fee', 'lcb_processing_fee', 'consent_fee',
      'deposit_handling', 'installment_processing', 'payment_verification',
      'transfer_fee', 'registration_fee', 'stamp_duty', 'mutation_fee',
      'other_cost'
    )
  )
);

-- Create payment receipts table (equivalent to payment installments for handover)
CREATE TABLE IF NOT EXISTS property_payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  receipt_number INTEGER NOT NULL,
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
  CONSTRAINT positive_receipt_number CHECK (receipt_number > 0),
  
  -- Unique constraint to prevent duplicate receipt numbers per property
  UNIQUE(property_id, receipt_number)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_handover_costs_property_id ON property_handover_costs(property_id);
CREATE INDEX IF NOT EXISTS idx_handover_costs_category ON property_handover_costs(cost_category);
CREATE INDEX IF NOT EXISTS idx_handover_costs_type ON property_handover_costs(cost_type_id);
CREATE INDEX IF NOT EXISTS idx_handover_costs_created_at ON property_handover_costs(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_property_id ON property_payment_receipts(property_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_number ON property_payment_receipts(property_id, receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_created_at ON property_payment_receipts(created_at);

-- Add updated_at trigger for handover costs
CREATE OR REPLACE FUNCTION update_handover_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_handover_costs_updated_at
  BEFORE UPDATE ON property_handover_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_handover_costs_updated_at();

-- Add updated_at trigger for payment receipts
CREATE OR REPLACE FUNCTION update_payment_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_receipts_updated_at
  BEFORE UPDATE ON property_payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_receipts_updated_at();

-- Function to calculate handover financial summary
CREATE OR REPLACE FUNCTION get_property_handover_summary(property_uuid UUID)
RETURNS TABLE (
  property_id UUID,
  handover_price_agreement_kes DECIMAL(15,2),
  total_handover_costs_kes DECIMAL(15,2),
  total_receipts_kes DECIMAL(15,2),
  remaining_balance_kes DECIMAL(15,2),
  total_income_kes DECIMAL(15,2),
  cost_breakdown JSONB
) AS $$
DECLARE
  handover_price DECIMAL(15,2);
  total_costs DECIMAL(15,2);
  total_receipts DECIMAL(15,2);
  cost_breakdown_json JSONB;
BEGIN
  -- Get handover price
  SELECT p.handover_price_agreement_kes INTO handover_price
  FROM properties p WHERE p.id = property_uuid;
  
  -- Calculate total handover costs
  SELECT COALESCE(SUM(amount_kes), 0) INTO total_costs
  FROM property_handover_costs WHERE property_id = property_uuid;
  
  -- Calculate total receipts
  SELECT COALESCE(SUM(amount_kes), 0) INTO total_receipts
  FROM property_payment_receipts WHERE property_id = property_uuid;
  
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
    FROM property_handover_costs 
    WHERE property_id = property_uuid
    GROUP BY cost_category
  ) breakdown;
  
  RETURN QUERY SELECT 
    property_uuid,
    COALESCE(handover_price, 0),
    COALESCE(total_costs, 0),
    COALESCE(total_receipts, 0),
    COALESCE(handover_price, 0) - COALESCE(total_receipts, 0),
    COALESCE(handover_price, 0) - COALESCE(total_costs, 0),
    cost_breakdown_json;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy querying of handover financial data
CREATE OR REPLACE VIEW property_handover_financials_view AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  p.handover_price_agreement_kes,
  COALESCE(costs.total_costs, 0) as total_handover_costs_kes,
  COALESCE(receipts.total_receipts, 0) as total_receipts_kes,
  COALESCE(p.handover_price_agreement_kes, 0) - COALESCE(receipts.total_receipts, 0) as remaining_balance_kes,
  COALESCE(p.handover_price_agreement_kes, 0) - COALESCE(costs.total_costs, 0) as total_income_kes,
  costs.cost_count,
  receipts.receipt_count
FROM properties p
LEFT JOIN (
  SELECT 
    property_id,
    SUM(amount_kes) as total_costs,
    COUNT(*) as cost_count
  FROM property_handover_costs
  GROUP BY property_id
) costs ON p.id = costs.property_id
LEFT JOIN (
  SELECT 
    property_id,
    SUM(amount_kes) as total_receipts,
    COUNT(*) as receipt_count
  FROM property_payment_receipts
  GROUP BY property_id
) receipts ON p.id = receipts.property_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON property_handover_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON property_payment_receipts TO authenticated;
GRANT SELECT ON property_handover_financials_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_handover_summary(UUID) TO authenticated;

-- Add RLS policies
ALTER TABLE property_handover_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_payment_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policy for handover costs - users can only access costs for properties they own or manage
CREATE POLICY handover_costs_access_policy ON property_handover_costs
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- RLS policy for payment receipts - users can only access receipts for properties they own or manage
CREATE POLICY payment_receipts_access_policy ON property_payment_receipts
  FOR ALL USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE landlord_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE property_handover_costs IS 'Stores individual handover cost entries for properties';
COMMENT ON TABLE property_payment_receipts IS 'Stores payment receipts from property handover sales';
COMMENT ON FUNCTION get_property_handover_summary(UUID) IS 'Calculates comprehensive financial summary for property handover';
COMMENT ON VIEW property_handover_financials_view IS 'Consolidated view of property handover financial data';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 065: Property handover financial tracking system created successfully';
  RAISE NOTICE 'Created tables: property_handover_costs, property_payment_receipts';
  RAISE NOTICE 'Created function: get_property_handover_summary';
  RAISE NOTICE 'Created view: property_handover_financials_view';
  RAISE NOTICE 'Property handover financial tracking ready for implementation';
END $$;
