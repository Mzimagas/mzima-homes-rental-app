-- Add missing columns to client_property_interests table
ALTER TABLE client_property_interests 
ADD COLUMN IF NOT EXISTS reservation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS deposit_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add missing columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS reservation_status TEXT,
ADD COLUMN IF NOT EXISTS reserved_by UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS reserved_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS deposit_date TIMESTAMPTZ;

-- Create client_deposits table if it doesn't exist
CREATE TABLE IF NOT EXISTS client_deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    deposit_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    payment_method TEXT,
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for client_deposits
ALTER TABLE client_deposits ENABLE ROW LEVEL SECURITY;

-- Policy for clients to see their own deposits
CREATE POLICY "Clients can view their own deposits" ON client_deposits
    FOR SELECT USING (
        client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
        )
    );

-- Policy for clients to insert their own deposits
CREATE POLICY "Clients can create their own deposits" ON client_deposits
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_property_interests_reservation_date ON client_property_interests(reservation_date);
CREATE INDEX IF NOT EXISTS idx_client_property_interests_deposit_date ON client_property_interests(deposit_date);
CREATE INDEX IF NOT EXISTS idx_properties_reservation_status ON properties(reservation_status);
CREATE INDEX IF NOT EXISTS idx_properties_reserved_by ON properties(reserved_by);
CREATE INDEX IF NOT EXISTS idx_client_deposits_client_id ON client_deposits(client_id);
CREATE INDEX IF NOT EXISTS idx_client_deposits_property_id ON client_deposits(property_id);
CREATE INDEX IF NOT EXISTS idx_client_deposits_deposit_date ON client_deposits(deposit_date);

-- Update existing RESERVED interests to have reservation_date
UPDATE client_property_interests 
SET reservation_date = updated_at 
WHERE status = 'RESERVED' AND reservation_date IS NULL;

-- Update existing properties with committed_client_id to have reservation info
UPDATE properties 
SET reserved_by = committed_client_id, reserved_date = commitment_date, reservation_status = 'COMMITTED'
WHERE committed_client_id IS NOT NULL AND reserved_by IS NULL;
