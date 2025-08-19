-- 064: Create handover pipeline table for tracking property handovers
-- This mirrors the purchase_pipeline structure but for handover processes

-- Create handover pipeline table for tracking property handovers
CREATE TABLE IF NOT EXISTS handover_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'HOME',
  
  -- Buyer Information (instead of seller)
  buyer_name TEXT,
  buyer_contact TEXT,
  buyer_email TEXT,
  buyer_address TEXT,
  
  -- Financial Details
  asking_price_kes DECIMAL(15,2),
  negotiated_price_kes DECIMAL(15,2),
  deposit_received_kes DECIMAL(15,2),
  balance_due_kes DECIMAL(15,2),
  
  -- Status and Progress
  handover_status TEXT NOT NULL DEFAULT 'IDENTIFIED' CHECK (
    handover_status IN ('IDENTIFIED', 'NEGOTIATING', 'UNDER_CONTRACT', 'DUE_DILIGENCE', 'FINANCING', 'CLOSING', 'COMPLETED', 'CANCELLED')
  ),
  current_stage INTEGER DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 8),
  overall_progress INTEGER DEFAULT 0 CHECK (overall_progress BETWEEN 0 AND 100),
  
  -- Pipeline Stages Data (JSON)
  pipeline_stages JSONB DEFAULT '[]',
  
  -- Dates
  target_completion_date DATE,
  actual_completion_date DATE,
  
  -- Additional Details
  legal_representative TEXT,
  financing_source TEXT,
  inspection_notes TEXT,
  due_diligence_notes TEXT,
  contract_reference TEXT,
  title_deed_status TEXT,
  survey_status TEXT,
  valuation_amount_kes DECIMAL(15,2),
  loan_amount_kes DECIMAL(15,2),
  
  -- Expected Returns (for organization)
  expected_profit_kes DECIMAL(15,2),
  expected_profit_percentage DECIMAL(5,2),
  
  -- Risk Assessment
  risk_assessment TEXT,
  property_condition_notes TEXT,
  
  -- Assignment and Tracking
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_property ON handover_pipeline(property_id);
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_status ON handover_pipeline(handover_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_assigned ON handover_pipeline(assigned_to, handover_status);
CREATE INDEX IF NOT EXISTS idx_handover_pipeline_stage ON handover_pipeline(current_stage, handover_status);

-- Add comments for documentation
COMMENT ON TABLE handover_pipeline IS 'Tracks properties being handed over through sale/transfer process';
COMMENT ON COLUMN handover_pipeline.property_id IS 'Reference to the property being handed over';
COMMENT ON COLUMN handover_pipeline.buyer_name IS 'Name of the buyer/recipient';
COMMENT ON COLUMN handover_pipeline.handover_status IS 'Current handover status (PENDING → COMPLETED)';
COMMENT ON COLUMN handover_pipeline.pipeline_stages IS 'JSON array of pipeline stage data with status and notes';
COMMENT ON COLUMN handover_pipeline.current_stage IS 'Current active stage (1-8)';
COMMENT ON COLUMN handover_pipeline.overall_progress IS 'Overall completion percentage (0-100)';

-- Create trigger to update updated_at timestamps (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_handover_pipeline_updated_at') THEN
        CREATE TRIGGER update_handover_pipeline_updated_at
            BEFORE UPDATE ON handover_pipeline
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 064: Created handover_pipeline table successfully';
  RAISE NOTICE 'Handover pipeline functionality ready for implementation';
END $$;
