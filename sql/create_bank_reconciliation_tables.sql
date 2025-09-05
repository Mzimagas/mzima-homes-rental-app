-- Quick fix for Bank Reconciliation tables
-- Run this SQL directly in your Supabase SQL Editor

-- Create reconciliation status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reconciliation_status') THEN
        CREATE TYPE reconciliation_status AS ENUM (
            'UNMATCHED',
            'MATCHED',
            'PARTIALLY_MATCHED',
            'DISPUTED',
            'IGNORED',
            'MANUAL_MATCH'
        );
    END IF;
END $$;

-- Create transaction source enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
        CREATE TYPE transaction_source AS ENUM (
            'BANK_STATEMENT',
            'MPESA_STATEMENT',
            'MANUAL_ENTRY',
            'API_IMPORT'
        );
    END IF;
END $$;

-- Create matching confidence enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'matching_confidence') THEN
        CREATE TYPE matching_confidence AS ENUM (
            'HIGH',
            'MEDIUM',
            'LOW',
            'MANUAL'
        );
    END IF;
END $$;

-- Bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    bank_code VARCHAR(20),
    branch_name VARCHAR(100),
    branch_code VARCHAR(20),
    account_type VARCHAR(50) DEFAULT 'CURRENT',
    currency VARCHAR(3) DEFAULT 'KES',
    
    -- Balance tracking
    opening_balance_kes DECIMAL(15,2) DEFAULT 0,
    current_balance_kes DECIMAL(15,2) DEFAULT 0,
    last_reconciled_balance_kes DECIMAL(15,2) DEFAULT 0,
    last_reconciled_date DATE,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Integration settings
    auto_import_enabled BOOLEAN DEFAULT FALSE,
    import_format VARCHAR(50),
    last_import_date DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    UNIQUE(account_number, bank_name)
);

-- Bank transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    
    -- Transaction details
    transaction_date DATE NOT NULL,
    value_date DATE,
    transaction_ref VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount_kes DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
    
    -- Additional details
    payer_details VARCHAR(200),
    payee_details VARCHAR(200),
    channel VARCHAR(50),
    
    -- Source information
    source transaction_source NOT NULL,
    source_reference VARCHAR(100),
    
    -- Reconciliation status
    status reconciliation_status DEFAULT 'UNMATCHED',
    matched_date DATE,
    matched_by UUID,
    
    -- Variance tracking
    variance_amount_kes DECIMAL(15,2) DEFAULT 0,
    variance_reason TEXT,
    
    -- Raw data storage
    raw_data JSONB,
    import_batch_id UUID,
    
    -- Notes and flags
    notes TEXT,
    is_duplicate BOOLEAN DEFAULT FALSE,
    requires_attention BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(bank_account_id, transaction_ref, transaction_date),
    CHECK (amount_kes != 0)
);

-- Reconciliation analytics view
CREATE OR REPLACE VIEW reconciliation_analytics AS
SELECT 
    ba.id as bank_account_id,
    ba.account_name,
    ba.bank_name,
    
    -- Current period statistics
    COUNT(bt.id) as total_transactions,
    COUNT(CASE WHEN bt.status = 'MATCHED' THEN 1 END) as matched_transactions,
    COUNT(CASE WHEN bt.status = 'UNMATCHED' THEN 1 END) as unmatched_transactions,
    COUNT(CASE WHEN bt.status = 'DISPUTED' THEN 1 END) as disputed_transactions,
    
    -- Financial statistics
    SUM(CASE WHEN bt.transaction_type = 'CREDIT' THEN bt.amount_kes ELSE 0 END) as total_credits_kes,
    SUM(CASE WHEN bt.transaction_type = 'DEBIT' THEN bt.amount_kes ELSE 0 END) as total_debits_kes,
    SUM(bt.variance_amount_kes) as total_variance_kes,
    
    -- Matching statistics
    0 as auto_matched_count,
    0 as manual_matched_count,
    0 as average_matching_score,
    
    -- Exception statistics
    0 as total_exceptions,
    0 as open_exceptions,
    
    -- Last reconciliation
    ba.last_reconciled_date as last_reconciliation_date,
    ba.last_reconciled_balance_kes,
    ba.current_balance_kes,
    
    -- Import statistics
    0 as total_imports,
    ba.last_import_date

FROM bank_accounts ba
LEFT JOIN bank_transactions bt ON ba.id = bt.bank_account_id 
  AND bt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'

WHERE ba.is_active = true
GROUP BY ba.id, ba.account_name, ba.bank_name, ba.last_reconciled_balance_kes, ba.current_balance_kes, ba.last_reconciled_date, ba.last_import_date
ORDER BY ba.account_name;

-- Unmatched transactions view
CREATE OR REPLACE VIEW unmatched_transactions AS
SELECT 
    bt.id,
    bt.transaction_date,
    bt.transaction_ref,
    bt.description,
    bt.amount_kes,
    bt.transaction_type,
    bt.payer_details,
    bt.payee_details,
    bt.channel,
    bt.source,
    ba.account_name,
    ba.bank_name,
    
    -- Potential matches analysis (simplified)
    'NO_OBVIOUS_MATCH' as potential_match_type,
    
    -- Days since transaction
    CURRENT_DATE - bt.transaction_date as days_unmatched

FROM bank_transactions bt
JOIN bank_accounts ba ON bt.bank_account_id = ba.id
WHERE bt.status = 'UNMATCHED' 
  AND ba.is_active = true
ORDER BY bt.transaction_date DESC, bt.amount_kes DESC;

-- Insert default bank accounts
INSERT INTO bank_accounts (account_name, account_number, bank_name, bank_code, account_type, is_primary, current_balance_kes) VALUES
('Mzima Homes Main Account', '1234567890', 'Equity Bank', 'EQBLKENA', 'CURRENT', true, 500000),
('Mzima Homes M-PESA', '254700000000', 'Safaricom M-PESA', 'MPESA', 'MPESA', false, 150000),
('Mzima Homes Savings', '0987654321', 'KCB Bank', 'KCBLKENX', 'SAVINGS', false, 1000000)
ON CONFLICT (account_number, bank_name) DO NOTHING;

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_accounts' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON bank_accounts FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_transactions' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON bank_transactions FOR ALL USING (true);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_date ON bank_transactions(bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_ref ON bank_transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_amount ON bank_transactions(amount_kes);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_unmatched ON bank_transactions(bank_account_id, status) WHERE status = 'UNMATCHED';

-- Verification query
SELECT 
    'bank_accounts' as table_name,
    COUNT(*) as record_count
FROM bank_accounts
UNION ALL
SELECT 
    'bank_transactions' as table_name,
    COUNT(*) as record_count
FROM bank_transactions;
