-- Migration 075: Enhanced Bank Reconciliation System
-- Description: Comprehensive bank and M-PESA reconciliation with automated matching,
-- statement import, and advanced reconciliation workflows

-- Create reconciliation status enum
CREATE TYPE reconciliation_status AS ENUM (
  'UNMATCHED',
  'MATCHED',
  'PARTIALLY_MATCHED',
  'DISPUTED',
  'IGNORED',
  'MANUAL_MATCH'
);

-- Create transaction source enum
CREATE TYPE transaction_source AS ENUM (
  'BANK_STATEMENT',
  'MPESA_STATEMENT',
  'MANUAL_ENTRY',
  'API_IMPORT'
);

-- Create matching confidence enum
CREATE TYPE matching_confidence AS ENUM (
  'HIGH',
  'MEDIUM',
  'LOW',
  'MANUAL'
);

-- Enhanced bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name VARCHAR(200) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  bank_code VARCHAR(20),
  branch_name VARCHAR(100),
  branch_code VARCHAR(20),
  account_type VARCHAR(50) DEFAULT 'CURRENT', -- CURRENT, SAVINGS, MPESA
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
  import_format VARCHAR(50), -- CSV, EXCEL, API
  last_import_date DATE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id),
  
  -- Constraints
  CONSTRAINT unique_account_number UNIQUE(account_number, bank_name),
  CONSTRAINT unique_primary_account EXCLUDE (bank_name WITH =) WHERE (is_primary = true)
);

-- Enhanced bank transactions table (replaces bank_mpesa_recons)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  
  -- Transaction details
  transaction_date DATE NOT NULL,
  value_date DATE,
  transaction_ref VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount_kes DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- DEBIT, CREDIT
  
  -- Additional details
  payer_details VARCHAR(200),
  payee_details VARCHAR(200),
  channel VARCHAR(50), -- MPESA, BANK_TRANSFER, CHEQUE, CASH, etc.
  
  -- Source information
  source transaction_source NOT NULL,
  source_reference VARCHAR(100), -- Original statement reference
  
  -- Reconciliation status
  status reconciliation_status DEFAULT 'UNMATCHED',
  matched_date DATE,
  matched_by UUID REFERENCES enhanced_users(id),
  
  -- Variance tracking
  variance_amount_kes DECIMAL(15,2) DEFAULT 0,
  variance_reason TEXT,
  
  -- Raw data storage
  raw_data JSONB, -- Original transaction data from import
  import_batch_id UUID, -- For tracking import batches
  
  -- Notes and flags
  notes TEXT,
  is_duplicate BOOLEAN DEFAULT FALSE,
  requires_attention BOOLEAN DEFAULT FALSE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_transaction_ref UNIQUE(bank_account_id, transaction_ref, transaction_date),
  CHECK (amount_kes != 0)
);

-- Transaction matching table for linking bank transactions to system records
CREATE TABLE IF NOT EXISTS transaction_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  
  -- Matched entity details
  matched_entity_type VARCHAR(50) NOT NULL, -- PAYMENT, INCOME_TRANSACTION, EXPENSE_TRANSACTION, INVOICE
  matched_entity_id UUID NOT NULL,
  
  -- Matching details
  matched_amount_kes DECIMAL(15,2) NOT NULL,
  confidence matching_confidence NOT NULL,
  matching_score DECIMAL(5,4), -- 0.0000 to 1.0000
  
  -- Matching criteria used
  matching_criteria JSONB, -- Details of what criteria matched
  auto_matched BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  verified_by UUID REFERENCES enhanced_users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id),
  
  -- Constraints
  CHECK (matched_amount_kes > 0),
  CHECK (matching_score IS NULL OR (matching_score >= 0 AND matching_score <= 1))
);

-- Reconciliation periods table for managing reconciliation cycles
CREATE TABLE IF NOT EXISTS reconciliation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  
  -- Period details
  period_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Balances
  opening_balance_kes DECIMAL(15,2) NOT NULL,
  closing_balance_kes DECIMAL(15,2) NOT NULL,
  statement_balance_kes DECIMAL(15,2) NOT NULL,
  
  -- Reconciliation status
  status VARCHAR(20) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, REVIEWED
  reconciled_by UUID REFERENCES enhanced_users(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES enhanced_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Statistics
  total_transactions INTEGER DEFAULT 0,
  matched_transactions INTEGER DEFAULT 0,
  unmatched_transactions INTEGER DEFAULT 0,
  total_variance_kes DECIMAL(15,2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_period_dates CHECK (end_date >= start_date),
  CONSTRAINT unique_period_per_account UNIQUE(bank_account_id, start_date, end_date)
);

-- Import batches table for tracking statement imports
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  
  -- Import details
  import_type VARCHAR(50) NOT NULL, -- CSV, EXCEL, API, MANUAL
  file_name VARCHAR(200),
  file_size INTEGER,
  
  -- Processing details
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
  error_message TEXT,
  
  -- Date range of imported transactions
  transaction_date_from DATE,
  transaction_date_to DATE,
  
  -- Processing metadata
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_by UUID REFERENCES enhanced_users(id)
);

-- Reconciliation rules table for automated matching
CREATE TABLE IF NOT EXISTS reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule details
  rule_name VARCHAR(200) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 100, -- Lower number = higher priority
  
  -- Matching criteria
  amount_tolerance_kes DECIMAL(15,2) DEFAULT 0,
  amount_tolerance_percentage DECIMAL(5,2) DEFAULT 0,
  date_tolerance_days INTEGER DEFAULT 0,
  
  -- Text matching criteria
  description_keywords TEXT[], -- Keywords to match in transaction description
  reference_pattern VARCHAR(200), -- Regex pattern for reference matching
  payer_keywords TEXT[], -- Keywords to match in payer details
  
  -- Entity type to match against
  target_entity_type VARCHAR(50) NOT NULL, -- PAYMENT, INCOME_TRANSACTION, EXPENSE_TRANSACTION
  
  -- Rule conditions
  min_confidence_score DECIMAL(5,4) DEFAULT 0.7000,
  auto_match_enabled BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id)
);

-- Reconciliation exceptions table for tracking issues
CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  reconciliation_period_id UUID REFERENCES reconciliation_periods(id),
  
  -- Exception details
  exception_type VARCHAR(50) NOT NULL, -- DUPLICATE, MISSING_MATCH, AMOUNT_VARIANCE, DATE_VARIANCE
  severity VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  description TEXT NOT NULL,
  
  -- Resolution
  status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED, IGNORED
  resolution_notes TEXT,
  resolved_by UUID REFERENCES enhanced_users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id)
);

-- Create comprehensive reconciliation analytics view
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
  COUNT(CASE WHEN tm.auto_matched = true THEN 1 END) as auto_matched_count,
  COUNT(CASE WHEN tm.auto_matched = false THEN 1 END) as manual_matched_count,
  AVG(tm.matching_score) as average_matching_score,
  
  -- Exception statistics
  COUNT(re.id) as total_exceptions,
  COUNT(CASE WHEN re.status = 'OPEN' THEN 1 END) as open_exceptions,
  
  -- Last reconciliation
  MAX(rp.reconciled_at) as last_reconciliation_date,
  ba.last_reconciled_balance_kes,
  ba.current_balance_kes,
  
  -- Import statistics
  COUNT(ib.id) as total_imports,
  MAX(ib.created_at) as last_import_date

FROM bank_accounts ba
LEFT JOIN bank_transactions bt ON ba.id = bt.bank_account_id 
  AND bt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN transaction_matches tm ON bt.id = tm.bank_transaction_id AND tm.is_active = true
LEFT JOIN reconciliation_exceptions re ON bt.id = re.bank_transaction_id AND re.status = 'OPEN'
LEFT JOIN reconciliation_periods rp ON ba.id = rp.bank_account_id
LEFT JOIN import_batches ib ON ba.id = ib.bank_account_id 
  AND ib.created_at >= CURRENT_DATE - INTERVAL '30 days'

WHERE ba.is_active = true
GROUP BY ba.id, ba.account_name, ba.bank_name, ba.last_reconciled_balance_kes, ba.current_balance_kes
ORDER BY ba.account_name;

-- Unmatched transactions view for easy identification
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

  -- Potential matches analysis
  CASE
    WHEN EXISTS (
      SELECT 1 FROM payments p
      WHERE ABS(p.amount_kes - ABS(bt.amount_kes)) <= 10
      AND p.payment_date BETWEEN bt.transaction_date - INTERVAL '3 days' AND bt.transaction_date + INTERVAL '3 days'
    ) THEN 'PAYMENT_MATCH_POSSIBLE'
    WHEN EXISTS (
      SELECT 1 FROM income_transactions it
      WHERE ABS(it.amount_kes - ABS(bt.amount_kes)) <= 10
      AND it.transaction_date BETWEEN bt.transaction_date - INTERVAL '3 days' AND bt.transaction_date + INTERVAL '3 days'
    ) THEN 'INCOME_MATCH_POSSIBLE'
    WHEN EXISTS (
      SELECT 1 FROM expense_transactions et
      WHERE ABS(et.amount_kes - ABS(bt.amount_kes)) <= 10
      AND et.transaction_date BETWEEN bt.transaction_date - INTERVAL '3 days' AND bt.transaction_date + INTERVAL '3 days'
    ) THEN 'EXPENSE_MATCH_POSSIBLE'
    ELSE 'NO_OBVIOUS_MATCH'
  END as potential_match_type,

  -- Days since transaction
  CURRENT_DATE - bt.transaction_date as days_unmatched

FROM bank_transactions bt
JOIN bank_accounts ba ON bt.bank_account_id = ba.id
WHERE bt.status = 'UNMATCHED'
  AND ba.is_active = true
ORDER BY bt.transaction_date DESC, bt.amount_kes DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts(is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_date ON bank_transactions(bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_ref ON bank_transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_amount ON bank_transactions(amount_kes);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_source ON bank_transactions(source);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_unmatched ON bank_transactions(bank_account_id, status) WHERE status = 'UNMATCHED';

CREATE INDEX IF NOT EXISTS idx_transaction_matches_bank_transaction ON transaction_matches(bank_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_matches_entity ON transaction_matches(matched_entity_type, matched_entity_id);
CREATE INDEX IF NOT EXISTS idx_transaction_matches_active ON transaction_matches(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_transaction_matches_confidence ON transaction_matches(confidence);

CREATE INDEX IF NOT EXISTS idx_reconciliation_periods_account ON reconciliation_periods(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_periods_status ON reconciliation_periods(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_periods_dates ON reconciliation_periods(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_import_batches_account ON import_batches(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_date ON import_batches(created_at);

CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_active ON reconciliation_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_priority ON reconciliation_rules(priority);

CREATE INDEX IF NOT EXISTS idx_reconciliation_exceptions_status ON reconciliation_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_exceptions_type ON reconciliation_exceptions(exception_type);

-- Insert default bank accounts (examples)
INSERT INTO bank_accounts (account_name, account_number, bank_name, bank_code, account_type, is_primary) VALUES
('Mzima Homes Main Account', '1234567890', 'Equity Bank', 'EQBLKENA', 'CURRENT', true),
('Mzima Homes M-PESA', '254700000000', 'Safaricom M-PESA', 'MPESA', 'MPESA', false),
('Mzima Homes Savings', '0987654321', 'KCB Bank', 'KCBLKENX', 'SAVINGS', false);

-- Insert default reconciliation rules
INSERT INTO reconciliation_rules (
  rule_name,
  description,
  priority,
  amount_tolerance_kes,
  date_tolerance_days,
  target_entity_type,
  min_confidence_score,
  auto_match_enabled
) VALUES
-- High priority exact matches
('Exact Amount and Date Match', 'Match transactions with exact amount and date', 10, 0, 0, 'PAYMENT', 0.9500, true),
('M-PESA Receipt Match', 'Match M-PESA transactions by receipt number', 20, 5, 1, 'PAYMENT', 0.9000, true),
('Bank Reference Match', 'Match by bank reference number', 30, 10, 2, 'PAYMENT', 0.8500, true),

-- Medium priority fuzzy matches
('Amount with Date Tolerance', 'Match by amount with 3-day date tolerance', 50, 5, 3, 'PAYMENT', 0.8000, true),
('Rent Payment Pattern', 'Match rent payments by amount and tenant pattern', 60, 10, 5, 'INCOME_TRANSACTION', 0.7500, true),
('Commission Payment Pattern', 'Match commission payments by agent and amount', 70, 20, 7, 'EXPENSE_TRANSACTION', 0.7500, true),

-- Lower priority broad matches
('Large Amount Match', 'Match large amounts with higher tolerance', 100, 100, 7, 'PAYMENT', 0.7000, false),
('Vendor Payment Pattern', 'Match vendor payments by name and amount range', 110, 50, 10, 'EXPENSE_TRANSACTION', 0.7000, false);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "bank_accounts_select" ON bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_accounts_insert" ON bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bank_accounts_update" ON bank_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "bank_accounts_delete" ON bank_accounts FOR DELETE TO authenticated USING (true);

CREATE POLICY "bank_transactions_select" ON bank_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_transactions_insert" ON bank_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bank_transactions_update" ON bank_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "bank_transactions_delete" ON bank_transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "transaction_matches_select" ON transaction_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "transaction_matches_insert" ON transaction_matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transaction_matches_update" ON transaction_matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "transaction_matches_delete" ON transaction_matches FOR DELETE TO authenticated USING (true);

CREATE POLICY "reconciliation_periods_select" ON reconciliation_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "reconciliation_periods_insert" ON reconciliation_periods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reconciliation_periods_update" ON reconciliation_periods FOR UPDATE TO authenticated USING (true);
CREATE POLICY "reconciliation_periods_delete" ON reconciliation_periods FOR DELETE TO authenticated USING (true);

CREATE POLICY "import_batches_select" ON import_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "import_batches_insert" ON import_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "import_batches_update" ON import_batches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "import_batches_delete" ON import_batches FOR DELETE TO authenticated USING (true);

CREATE POLICY "reconciliation_rules_select" ON reconciliation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "reconciliation_rules_insert" ON reconciliation_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reconciliation_rules_update" ON reconciliation_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "reconciliation_rules_delete" ON reconciliation_rules FOR DELETE TO authenticated USING (true);

CREATE POLICY "reconciliation_exceptions_select" ON reconciliation_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "reconciliation_exceptions_insert" ON reconciliation_exceptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reconciliation_exceptions_update" ON reconciliation_exceptions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "reconciliation_exceptions_delete" ON reconciliation_exceptions FOR DELETE TO authenticated USING (true);

-- Add comments for documentation
COMMENT ON TABLE bank_accounts IS 'Bank account management with balance tracking and import settings';
COMMENT ON TABLE bank_transactions IS 'Enhanced bank transaction records with reconciliation status';
COMMENT ON TABLE transaction_matches IS 'Links between bank transactions and system entities';
COMMENT ON TABLE reconciliation_periods IS 'Reconciliation period management and tracking';
COMMENT ON TABLE import_batches IS 'Statement import batch tracking and statistics';
COMMENT ON TABLE reconciliation_rules IS 'Automated matching rules and criteria';
COMMENT ON TABLE reconciliation_exceptions IS 'Reconciliation issues and exception tracking';
COMMENT ON VIEW reconciliation_analytics IS 'Comprehensive reconciliation analytics and statistics';
COMMENT ON VIEW unmatched_transactions IS 'Unmatched transactions with potential match analysis';
