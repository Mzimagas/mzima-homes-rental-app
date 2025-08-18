-- 060: Property Lifecycle Management - Three Pathways Implementation
-- This migration adds support for tracking property sources and lifecycle states

-- Create property source enum to track how properties enter the system
CREATE TYPE IF NOT EXISTS property_source AS ENUM (
  'DIRECT_ADDITION',      -- Manually added through property form
  'PURCHASE_PIPELINE',    -- Transferred from completed purchase
  'SUBDIVISION_PROCESS'   -- Created from subdivision of existing property
);

-- Create property lifecycle status enum
CREATE TYPE IF NOT EXISTS property_lifecycle_status AS ENUM (
  'ACTIVE',              -- Normal active property
  'SUBDIVIDED',          -- Original property that has been subdivided
  'PENDING_PURCHASE',    -- In purchase pipeline
  'PURCHASED',           -- Recently purchased, ready for management
  'UNDER_DEVELOPMENT',   -- Being developed/improved
  'INACTIVE'             -- Temporarily inactive
);

-- Add property lifecycle tracking columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_source property_source DEFAULT 'DIRECT_ADDITION';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lifecycle_status property_lifecycle_status DEFAULT 'ACTIVE';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS source_reference_id UUID; -- Reference to purchase/subdivision record
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parent_property_id UUID REFERENCES properties(id); -- For subdivision tracking
ALTER TABLE properties ADD COLUMN IF NOT EXISTS subdivision_date DATE; -- When property was subdivided
ALTER TABLE properties ADD COLUMN IF NOT EXISTS purchase_completion_date DATE; -- When purchase was completed
ALTER TABLE properties ADD COLUMN IF NOT EXISTS acquisition_notes TEXT; -- Notes about how property was acquired

-- Create purchase pipeline table for tracking property acquisitions
CREATE TABLE IF NOT EXISTS purchase_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_type property_type_enum NOT NULL DEFAULT 'HOME',
  seller_name TEXT,
  seller_contact TEXT,
  asking_price_kes DECIMAL(15,2),
  negotiated_price_kes DECIMAL(15,2),
  deposit_paid_kes DECIMAL(15,2),
  balance_due_kes DECIMAL(15,2),
  purchase_status TEXT NOT NULL DEFAULT 'IDENTIFIED' CHECK (
    purchase_status IN ('IDENTIFIED', 'NEGOTIATING', 'UNDER_CONTRACT', 'DUE_DILIGENCE', 'FINANCING', 'CLOSING', 'COMPLETED', 'CANCELLED')
  ),
  target_completion_date DATE,
  actual_completion_date DATE,
  legal_representative TEXT,
  financing_source TEXT,
  inspection_notes TEXT,
  due_diligence_notes TEXT,
  contract_reference TEXT,
  title_deed_status TEXT,
  survey_status TEXT,
  valuation_amount_kes DECIMAL(15,2),
  loan_amount_kes DECIMAL(15,2),
  cash_amount_kes DECIMAL(15,2),
  closing_costs_kes DECIMAL(15,2),
  total_investment_kes DECIMAL(15,2),
  expected_rental_income_kes DECIMAL(12,2),
  expected_roi_percentage DECIMAL(5,2),
  risk_assessment TEXT,
  property_condition_notes TEXT,
  required_improvements TEXT,
  improvement_cost_estimate_kes DECIMAL(12,2),
  documents_checklist JSONB DEFAULT '{}',
  milestone_dates JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_property_id UUID REFERENCES properties(id) -- Set when transferred to properties
);

-- Create subdivision tracking table for managing property subdivisions
CREATE TABLE IF NOT EXISTS property_subdivisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_property_id UUID NOT NULL REFERENCES properties(id),
  subdivision_name TEXT NOT NULL,
  subdivision_plan_reference TEXT,
  surveyor_name TEXT,
  surveyor_contact TEXT,
  total_plots_planned INTEGER NOT NULL CHECK (total_plots_planned > 0),
  total_plots_created INTEGER DEFAULT 0 CHECK (total_plots_created >= 0),
  subdivision_status TEXT NOT NULL DEFAULT 'PLANNING' CHECK (
    subdivision_status IN ('PLANNING', 'SURVEY_ORDERED', 'SURVEY_COMPLETED', 'APPROVAL_PENDING', 'APPROVED', 'PLOTS_CREATED', 'COMPLETED')
  ),
  approval_authority TEXT,
  approval_reference TEXT,
  approval_date DATE,
  survey_cost_kes DECIMAL(12,2),
  approval_fees_kes DECIMAL(12,2),
  infrastructure_cost_kes DECIMAL(12,2),
  total_subdivision_cost_kes DECIMAL(12,2),
  expected_plot_value_kes DECIMAL(15,2),
  expected_total_value_kes DECIMAL(15,2),
  expected_profit_kes DECIMAL(15,2),
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  subdivision_notes TEXT,
  legal_requirements JSONB DEFAULT '{}',
  infrastructure_requirements JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subdivision plots table to track individual plots created from subdivisions
CREATE TABLE IF NOT EXISTS subdivision_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdivision_id UUID NOT NULL REFERENCES property_subdivisions(id) ON DELETE CASCADE,
  plot_number TEXT NOT NULL,
  plot_size_sqm DECIMAL(10,2) NOT NULL CHECK (plot_size_sqm > 0),
  plot_size_acres DECIMAL(8,4) GENERATED ALWAYS AS (plot_size_sqm / 4047.0) STORED,
  plot_coordinates JSONB, -- Boundary coordinates
  plot_status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (
    plot_status IN ('PLANNED', 'SURVEYED', 'TITLED', 'PROPERTY_CREATED', 'SOLD')
  ),
  title_deed_number TEXT,
  estimated_value_kes DECIMAL(12,2),
  actual_sale_price_kes DECIMAL(12,2),
  buyer_name TEXT,
  sale_date DATE,
  property_id UUID REFERENCES properties(id), -- Set when converted to property
  plot_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(subdivision_id, plot_number)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(property_source);
CREATE INDEX IF NOT EXISTS idx_properties_lifecycle_status ON properties(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_properties_parent_property ON properties(parent_property_id);
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_status ON purchase_pipeline(purchase_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_assigned ON purchase_pipeline(assigned_to, purchase_status);
CREATE INDEX IF NOT EXISTS idx_property_subdivisions_original ON property_subdivisions(original_property_id);
CREATE INDEX IF NOT EXISTS idx_property_subdivisions_status ON property_subdivisions(subdivision_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subdivision_plots_subdivision ON subdivision_plots(subdivision_id, plot_status);
CREATE INDEX IF NOT EXISTS idx_subdivision_plots_property ON subdivision_plots(property_id);

-- Add comments for documentation
COMMENT ON TABLE purchase_pipeline IS 'Tracks properties being acquired through purchase process';
COMMENT ON TABLE property_subdivisions IS 'Tracks subdivision of existing properties into multiple plots';
COMMENT ON TABLE subdivision_plots IS 'Individual plots created from property subdivisions';
COMMENT ON COLUMN properties.property_source IS 'How this property entered the system';
COMMENT ON COLUMN properties.lifecycle_status IS 'Current lifecycle status of the property';
COMMENT ON COLUMN properties.source_reference_id IS 'Reference to purchase or subdivision record';
COMMENT ON COLUMN properties.parent_property_id IS 'Original property if this was created from subdivision';

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_purchase_pipeline_updated_at 
    BEFORE UPDATE ON purchase_pipeline 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_subdivisions_updated_at 
    BEFORE UPDATE ON property_subdivisions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subdivision_plots_updated_at 
    BEFORE UPDATE ON subdivision_plots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
