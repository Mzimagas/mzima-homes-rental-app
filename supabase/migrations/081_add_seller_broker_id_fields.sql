-- 081: Add seller National ID and broker ID fields to purchase_pipeline table
-- This migration adds mandatory seller National ID and optional broker ID fields

-- Add seller National ID field (mandatory)
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS seller_id_number TEXT;

-- Add broker ID number field (optional, replaces broker_license_number if it exists)
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS broker_id_number TEXT;

-- Drop broker_license_number column if it exists (replaced by broker_id_number)
ALTER TABLE purchase_pipeline 
DROP COLUMN IF EXISTS broker_license_number;

-- Add buyer information fields that may be missing
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS buyer_name TEXT,
ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
ADD COLUMN IF NOT EXISTS buyer_email TEXT,
ADD COLUMN IF NOT EXISTS buyer_address TEXT,
ADD COLUMN IF NOT EXISTS buyer_id_number TEXT;

-- Add enhanced seller information fields that may be missing
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS seller_email TEXT,
ADD COLUMN IF NOT EXISTS seller_address TEXT;

-- Add broker/witness information fields that may be missing
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS broker_name TEXT,
ADD COLUMN IF NOT EXISTS broker_phone TEXT,
ADD COLUMN IF NOT EXISTS broker_email TEXT,
ADD COLUMN IF NOT EXISTS broker_company TEXT,
ADD COLUMN IF NOT EXISTS is_broker_involved BOOLEAN DEFAULT FALSE;

-- Add investment analysis fields that may be missing
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS expected_rental_income DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS expected_roi DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS risk_assessment TEXT,
ADD COLUMN IF NOT EXISTS property_condition_notes TEXT;

-- Add legal and administrative fields that may be missing
ALTER TABLE purchase_pipeline 
ADD COLUMN IF NOT EXISTS legal_representative TEXT,
ADD COLUMN IF NOT EXISTS financing_source TEXT,
ADD COLUMN IF NOT EXISTS contract_reference TEXT,
ADD COLUMN IF NOT EXISTS title_deed_status TEXT,
ADD COLUMN IF NOT EXISTS survey_status TEXT;

-- Add comments for documentation
COMMENT ON COLUMN purchase_pipeline.seller_id_number IS 'Mandatory National ID or Passport number of the property seller';
COMMENT ON COLUMN purchase_pipeline.broker_id_number IS 'Optional ID number for broker/agent/witness (replaces license number)';
COMMENT ON COLUMN purchase_pipeline.buyer_name IS 'Name of the property buyer (will transfer to registered title owner)';
COMMENT ON COLUMN purchase_pipeline.buyer_phone IS 'Phone number of the property buyer';
COMMENT ON COLUMN purchase_pipeline.buyer_email IS 'Email address of the property buyer';
COMMENT ON COLUMN purchase_pipeline.buyer_address IS 'Address of the property buyer';
COMMENT ON COLUMN purchase_pipeline.buyer_id_number IS 'ID number of the property buyer';
COMMENT ON COLUMN purchase_pipeline.seller_email IS 'Email address of the property seller';
COMMENT ON COLUMN purchase_pipeline.seller_address IS 'Address of the property seller';
COMMENT ON COLUMN purchase_pipeline.broker_name IS 'Name of the broker/agent/witness';
COMMENT ON COLUMN purchase_pipeline.broker_phone IS 'Phone number of the broker/agent/witness';
COMMENT ON COLUMN purchase_pipeline.broker_email IS 'Email address of the broker/agent/witness';
COMMENT ON COLUMN purchase_pipeline.broker_company IS 'Company name of the broker/agent';
COMMENT ON COLUMN purchase_pipeline.is_broker_involved IS 'Whether a broker/agent/witness is involved in the transaction';
COMMENT ON COLUMN purchase_pipeline.expected_rental_income IS 'Expected monthly rental income from the property';
COMMENT ON COLUMN purchase_pipeline.expected_roi IS 'Expected return on investment percentage';
COMMENT ON COLUMN purchase_pipeline.risk_assessment IS 'Risk level assessment for the investment';
COMMENT ON COLUMN purchase_pipeline.property_condition_notes IS 'Notes about property condition and additional observations';
COMMENT ON COLUMN purchase_pipeline.legal_representative IS 'Legal representative or law firm handling the transaction';
COMMENT ON COLUMN purchase_pipeline.financing_source IS 'Source of financing for the purchase';
COMMENT ON COLUMN purchase_pipeline.contract_reference IS 'Reference number for the purchase contract';
COMMENT ON COLUMN purchase_pipeline.title_deed_status IS 'Status of the title deed verification';
COMMENT ON COLUMN purchase_pipeline.survey_status IS 'Status of the property survey';

-- Create indexes for efficient querying on new fields
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_seller_id ON purchase_pipeline(seller_id_number);
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_buyer_name ON purchase_pipeline(buyer_name);
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_broker_involved ON purchase_pipeline(is_broker_involved);
CREATE INDEX IF NOT EXISTS idx_purchase_pipeline_risk_assessment ON purchase_pipeline(risk_assessment);

-- Update RLS policies to ensure proper access control for new fields
-- (Existing RLS policies should automatically cover new columns)

-- Add validation constraints
ALTER TABLE purchase_pipeline 
ADD CONSTRAINT chk_purchase_pipeline_expected_roi 
CHECK (expected_roi IS NULL OR (expected_roi >= 0 AND expected_roi <= 100));

ALTER TABLE purchase_pipeline 
ADD CONSTRAINT chk_purchase_pipeline_expected_rental_income 
CHECK (expected_rental_income IS NULL OR expected_rental_income >= 0);
