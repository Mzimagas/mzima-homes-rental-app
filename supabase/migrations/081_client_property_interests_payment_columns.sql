-- Migration: Add Payment Tracking Columns to Client Property Interests
-- Description: Add missing payment-related columns to support client portal deposit payment functionality

-- Add missing payment tracking columns to client_property_interests table
ALTER TABLE client_property_interests 
ADD COLUMN IF NOT EXISTS deposit_amount_kes DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_data JSONB,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS agreement_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN client_property_interests.deposit_amount_kes IS 'Deposit amount paid by client in KES';
COMMENT ON COLUMN client_property_interests.deposit_paid_at IS 'Timestamp when deposit payment was completed';
COMMENT ON COLUMN client_property_interests.payment_method IS 'Payment method used (mpesa, bank_transfer, etc.)';
COMMENT ON COLUMN client_property_interests.payment_reference IS 'Payment reference/transaction ID';
COMMENT ON COLUMN client_property_interests.payment_data IS 'Additional payment data in JSON format';
COMMENT ON COLUMN client_property_interests.payment_verified_at IS 'Timestamp when payment was verified by admin';
COMMENT ON COLUMN client_property_interests.agreement_generated_at IS 'Timestamp when purchase agreement was generated';
COMMENT ON COLUMN client_property_interests.agreement_signed_at IS 'Timestamp when purchase agreement was signed';

-- Add constraint for payment method validation
ALTER TABLE client_property_interests 
ADD CONSTRAINT valid_payment_method CHECK (
  payment_method IS NULL OR payment_method IN ('mpesa', 'bank_transfer', 'cash', 'cheque', 'mobile_money', 'other')
);

-- Add constraint for status validation to include new payment-related statuses
ALTER TABLE client_property_interests 
DROP CONSTRAINT IF EXISTS client_property_interests_status_check;

ALTER TABLE client_property_interests 
ADD CONSTRAINT client_property_interests_status_check CHECK (
  status IN ('ACTIVE', 'COMMITTED', 'IN_HANDOVER', 'COMPLETED', 'EXPIRED', 'INACTIVE', 'CONVERTED')
);

-- Create index for efficient payment queries
CREATE INDEX IF NOT EXISTS idx_client_property_interests_payment_status 
ON client_property_interests(property_id, status) 
WHERE deposit_paid_at IS NOT NULL;

-- Create index for payment reference lookups
CREATE INDEX IF NOT EXISTS idx_client_property_interests_payment_reference 
ON client_property_interests(payment_reference) 
WHERE payment_reference IS NOT NULL;
