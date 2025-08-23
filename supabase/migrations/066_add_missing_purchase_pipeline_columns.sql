-- 066: Add missing columns to purchase_pipeline table
-- This migration adds columns that the application expects but are missing from the schema

-- Add missing columns to purchase_pipeline table
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS seller_email TEXT,
ADD COLUMN IF NOT EXISTS pipeline_stages JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS current_stage INTEGER DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 8),
ADD COLUMN IF NOT EXISTS overall_progress INTEGER DEFAULT 0 CHECK (overall_progress BETWEEN 0 AND 100);

-- Add comments for documentation
COMMENT ON COLUMN purchase_pipeline.seller_email IS 'Email address of the property seller';
COMMENT ON COLUMN purchase_pipeline.pipeline_stages IS 'JSON array of pipeline stage data with status and notes';
COMMENT ON COLUMN purchase_pipeline.current_stage IS 'Current active stage in the purchase pipeline (1-8)';
COMMENT ON COLUMN purchase_pipeline.overall_progress IS 'Overall completion percentage of the purchase process (0-100)';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_stage ON purchase_pipeline(current_stage, purchase_status);
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_progress ON purchase_pipeline(overall_progress DESC);

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 066: Added missing purchase_pipeline columns successfully';
  RAISE NOTICE 'Added columns: seller_email, pipeline_stages, current_stage, overall_progress';
END $$;
