-- Migration: Add land-specific financial data to properties table
-- Description: Extends properties table with comprehensive land financial tracking

-- Add land-specific financial columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS land_purchase_price_kes DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS land_legal_fees_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_survey_mapping_costs_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_documentation_costs_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_development_costs_kes DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS land_infrastructure_costs_kes DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS land_zoning_compliance_costs_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_environmental_assessment_costs_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_permits_licensing_fees_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_property_taxes_annual_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_maintenance_security_costs_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_insurance_costs_annual_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_holding_costs_annual_kes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS land_current_market_value_kes DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS land_subdivision_potential_value_kes DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS land_appreciation_rate_annual_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS land_roi_percentage DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN properties.land_purchase_price_kes IS 'Purchase price of the land property';
COMMENT ON COLUMN properties.land_legal_fees_kes IS 'Legal fees and documentation costs for land purchase';
COMMENT ON COLUMN properties.land_survey_mapping_costs_kes IS 'Survey and mapping costs for land';
COMMENT ON COLUMN properties.land_documentation_costs_kes IS 'Documentation and registration costs';
COMMENT ON COLUMN properties.land_development_costs_kes IS 'Land development and preparation costs';
COMMENT ON COLUMN properties.land_infrastructure_costs_kes IS 'Infrastructure development costs (roads, utilities)';
COMMENT ON COLUMN properties.land_zoning_compliance_costs_kes IS 'Zoning compliance and approval costs';
COMMENT ON COLUMN properties.land_environmental_assessment_costs_kes IS 'Environmental impact assessment costs';
COMMENT ON COLUMN properties.land_permits_licensing_fees_kes IS 'Land use permits and licensing fees';
COMMENT ON COLUMN properties.land_property_taxes_annual_kes IS 'Annual property taxes for land';
COMMENT ON COLUMN properties.land_maintenance_security_costs_kes IS 'Annual maintenance and security costs';
COMMENT ON COLUMN properties.land_insurance_costs_annual_kes IS 'Annual insurance costs for land';
COMMENT ON COLUMN properties.land_holding_costs_annual_kes IS 'Other annual holding costs';
COMMENT ON COLUMN properties.land_current_market_value_kes IS 'Current estimated market value of land';
COMMENT ON COLUMN properties.land_subdivision_potential_value_kes IS 'Potential value if subdivided';
COMMENT ON COLUMN properties.land_appreciation_rate_annual_percent IS 'Annual appreciation rate percentage';
COMMENT ON COLUMN properties.land_roi_percentage IS 'Return on investment percentage';

-- Create function to calculate land financial metrics
CREATE OR REPLACE FUNCTION calculate_land_financial_metrics(property_id UUID)
RETURNS TABLE (
  total_purchase_costs DECIMAL(15,2),
  total_development_costs DECIMAL(15,2),
  total_ongoing_costs_annual DECIMAL(12,2),
  price_per_acre DECIMAL(12,2),
  total_investment DECIMAL(15,2),
  calculated_roi DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.land_purchase_price_kes, 0) + 
    COALESCE(p.land_legal_fees_kes, 0) + 
    COALESCE(p.land_survey_mapping_costs_kes, 0) + 
    COALESCE(p.land_documentation_costs_kes, 0) as total_purchase_costs,
    
    COALESCE(p.land_development_costs_kes, 0) + 
    COALESCE(p.land_infrastructure_costs_kes, 0) + 
    COALESCE(p.land_zoning_compliance_costs_kes, 0) + 
    COALESCE(p.land_environmental_assessment_costs_kes, 0) + 
    COALESCE(p.land_permits_licensing_fees_kes, 0) as total_development_costs,
    
    COALESCE(p.land_property_taxes_annual_kes, 0) + 
    COALESCE(p.land_maintenance_security_costs_kes, 0) + 
    COALESCE(p.land_insurance_costs_annual_kes, 0) + 
    COALESCE(p.land_holding_costs_annual_kes, 0) as total_ongoing_costs_annual,
    
    CASE 
      WHEN p.total_area_acres > 0 AND p.land_purchase_price_kes > 0 
      THEN p.land_purchase_price_kes / p.total_area_acres 
      ELSE 0 
    END as price_per_acre,
    
    COALESCE(p.land_purchase_price_kes, 0) + 
    COALESCE(p.land_legal_fees_kes, 0) + 
    COALESCE(p.land_survey_mapping_costs_kes, 0) + 
    COALESCE(p.land_documentation_costs_kes, 0) +
    COALESCE(p.land_development_costs_kes, 0) + 
    COALESCE(p.land_infrastructure_costs_kes, 0) + 
    COALESCE(p.land_zoning_compliance_costs_kes, 0) + 
    COALESCE(p.land_environmental_assessment_costs_kes, 0) + 
    COALESCE(p.land_permits_licensing_fees_kes, 0) as total_investment,
    
    CASE 
      WHEN (COALESCE(p.land_purchase_price_kes, 0) + 
            COALESCE(p.land_legal_fees_kes, 0) + 
            COALESCE(p.land_survey_mapping_costs_kes, 0) + 
            COALESCE(p.land_documentation_costs_kes, 0) +
            COALESCE(p.land_development_costs_kes, 0) + 
            COALESCE(p.land_infrastructure_costs_kes, 0) + 
            COALESCE(p.land_zoning_compliance_costs_kes, 0) + 
            COALESCE(p.land_environmental_assessment_costs_kes, 0) + 
            COALESCE(p.land_permits_licensing_fees_kes, 0)) > 0 
           AND p.land_current_market_value_kes > 0
      THEN ((p.land_current_market_value_kes - 
             (COALESCE(p.land_purchase_price_kes, 0) + 
              COALESCE(p.land_legal_fees_kes, 0) + 
              COALESCE(p.land_survey_mapping_costs_kes, 0) + 
              COALESCE(p.land_documentation_costs_kes, 0) +
              COALESCE(p.land_development_costs_kes, 0) + 
              COALESCE(p.land_infrastructure_costs_kes, 0) + 
              COALESCE(p.land_zoning_compliance_costs_kes, 0) + 
              COALESCE(p.land_environmental_assessment_costs_kes, 0) + 
              COALESCE(p.land_permits_licensing_fees_kes, 0))) / 
             (COALESCE(p.land_purchase_price_kes, 0) + 
              COALESCE(p.land_legal_fees_kes, 0) + 
              COALESCE(p.land_survey_mapping_costs_kes, 0) + 
              COALESCE(p.land_documentation_costs_kes, 0) +
              COALESCE(p.land_development_costs_kes, 0) + 
              COALESCE(p.land_infrastructure_costs_kes, 0) + 
              COALESCE(p.land_zoning_compliance_costs_kes, 0) + 
              COALESCE(p.land_environmental_assessment_costs_kes, 0) + 
              COALESCE(p.land_permits_licensing_fees_kes, 0))) * 100
      ELSE 0 
    END as calculated_roi
  FROM properties p
  WHERE p.id = property_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for land properties with calculated financial metrics
CREATE OR REPLACE VIEW land_properties_financial AS
SELECT 
  p.*,
  lf.total_purchase_costs,
  lf.total_development_costs,
  lf.total_ongoing_costs_annual,
  lf.price_per_acre,
  lf.total_investment,
  lf.calculated_roi
FROM properties p
CROSS JOIN LATERAL calculate_land_financial_metrics(p.id) lf
WHERE p.property_type LIKE '%LAND%';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_land_type ON properties(property_type) 
WHERE property_type LIKE '%LAND%';

CREATE INDEX IF NOT EXISTS idx_properties_land_purchase_price ON properties(land_purchase_price_kes) 
WHERE land_purchase_price_kes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_land_market_value ON properties(land_current_market_value_kes) 
WHERE land_current_market_value_kes IS NOT NULL;

-- Grant permissions
GRANT SELECT ON land_properties_financial TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_land_financial_metrics(UUID) TO authenticated;
