-- Sample script to add land financial data for testing
-- This script adds sample financial data to existing land properties

-- Update a sample land property with comprehensive financial data
UPDATE properties 
SET 
  land_purchase_price_kes = 2500000.00,
  land_legal_fees_kes = 150000.00,
  land_survey_mapping_costs_kes = 75000.00,
  land_documentation_costs_kes = 50000.00,
  land_development_costs_kes = 800000.00,
  land_infrastructure_costs_kes = 1200000.00,
  land_zoning_compliance_costs_kes = 100000.00,
  land_environmental_assessment_costs_kes = 200000.00,
  land_permits_licensing_fees_kes = 125000.00,
  land_property_taxes_annual_kes = 45000.00,
  land_maintenance_security_costs_kes = 60000.00,
  land_insurance_costs_annual_kes = 25000.00,
  land_holding_costs_annual_kes = 30000.00,
  land_current_market_value_kes = 6500000.00,
  land_subdivision_potential_value_kes = 8500000.00,
  land_appreciation_rate_annual_percent = 12.5,
  land_roi_percentage = 15.8
WHERE property_type LIKE '%LAND%' 
  AND name ILIKE '%nyika%'
LIMIT 1;

-- Add financial data to another land property if it exists
UPDATE properties 
SET 
  land_purchase_price_kes = 1800000.00,
  land_legal_fees_kes = 120000.00,
  land_survey_mapping_costs_kes = 60000.00,
  land_documentation_costs_kes = 40000.00,
  land_development_costs_kes = 600000.00,
  land_infrastructure_costs_kes = 900000.00,
  land_zoning_compliance_costs_kes = 80000.00,
  land_environmental_assessment_costs_kes = 150000.00,
  land_permits_licensing_fees_kes = 100000.00,
  land_property_taxes_annual_kes = 35000.00,
  land_maintenance_security_costs_kes = 45000.00,
  land_insurance_costs_annual_kes = 20000.00,
  land_holding_costs_annual_kes = 25000.00,
  land_current_market_value_kes = 4800000.00,
  land_subdivision_potential_value_kes = 6200000.00,
  land_appreciation_rate_annual_percent = 10.2,
  land_roi_percentage = 13.4
WHERE property_type LIKE '%LAND%' 
  AND id != (
    SELECT id FROM properties 
    WHERE property_type LIKE '%LAND%' 
      AND name ILIKE '%nyika%' 
    LIMIT 1
  )
LIMIT 1;

-- Create a sample land property if none exist
INSERT INTO properties (
  name,
  physical_address,
  property_type,
  property_source,
  lifecycle_status,
  total_area_acres,
  land_purchase_price_kes,
  land_legal_fees_kes,
  land_survey_mapping_costs_kes,
  land_documentation_costs_kes,
  land_development_costs_kes,
  land_infrastructure_costs_kes,
  land_zoning_compliance_costs_kes,
  land_environmental_assessment_costs_kes,
  land_permits_licensing_fees_kes,
  land_property_taxes_annual_kes,
  land_maintenance_security_costs_kes,
  land_insurance_costs_annual_kes,
  land_holding_costs_annual_kes,
  land_current_market_value_kes,
  land_subdivision_potential_value_kes,
  land_appreciation_rate_annual_percent,
  land_roi_percentage,
  landlord_id
)
SELECT 
  'Sample Commercial Land (5.2 Ha)',
  'Kiambu Road, Kiambu County',
  'COMMERCIAL_LAND',
  'DIRECT_ADDITION',
  'ACTIVE',
  12.85, -- 5.2 hectares = ~12.85 acres
  3200000.00,
  180000.00,
  90000.00,
  65000.00,
  1000000.00,
  1500000.00,
  120000.00,
  250000.00,
  150000.00,
  55000.00,
  75000.00,
  30000.00,
  40000.00,
  8200000.00,
  10500000.00,
  14.2,
  18.5,
  (SELECT id FROM auth.users LIMIT 1) -- Use first available user
WHERE NOT EXISTS (
  SELECT 1 FROM properties 
  WHERE name = 'Sample Commercial Land (5.2 Ha)'
);

-- Verify the data was inserted/updated
SELECT 
  name,
  property_type,
  total_area_acres,
  land_purchase_price_kes,
  land_current_market_value_kes,
  land_roi_percentage
FROM properties 
WHERE property_type LIKE '%LAND%'
  AND land_purchase_price_kes IS NOT NULL
ORDER BY created_at DESC;
