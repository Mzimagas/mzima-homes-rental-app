-- Migration 004: Financial Schema - Payments, Invoicing, and Financial Management
-- Creates tables for financial transactions, invoicing, and reconciliation

-- Create financial-related types (with IF NOT EXISTS handling)
DO $$
BEGIN
    -- Create payment_method if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cash', 'cheque', 'bank_eft', 'mpesa', 'card', 'mobile_money');
    END IF;

    -- Create invoice_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'unpaid', 'partly_paid', 'paid', 'overdue', 'cancelled');
    END IF;

    -- Create recon_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recon_status') THEN
        CREATE TYPE recon_status AS ENUM ('matched', 'unmatched', 'disputed', 'resolved');
    END IF;

    -- Create transfer_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status') THEN
        CREATE TYPE transfer_status AS ENUM ('pending', 'lodged', 'approved', 'completed', 'rejected');
    END IF;

    -- Create commission_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_status') THEN
        CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
    END IF;

    -- Create dispute_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
        CREATE TYPE dispute_status AS ENUM ('open', 'pending', 'resolved', 'closed');
    END IF;
END $$;

-- Invoices table - Invoice generation and tracking
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    sale_agreement_id UUID NOT NULL REFERENCES sale_agreements(sale_agreement_id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    amount_due DECIMAL(15,2) NOT NULL CHECK (amount_due > 0),
    amount_paid DECIMAL(15,2) DEFAULT 0 CHECK (amount_paid >= 0),
    balance DECIMAL(15,2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
    status invoice_status DEFAULT 'draft',
    line_items JSONB NOT NULL, -- Array of invoice line items
    tax_amount DECIMAL(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(15,2) DEFAULT 0 CHECK (discount_amount >= 0),
    payment_terms TEXT,
    notes TEXT,
    sent_date DATE,
    last_reminder_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (due_date >= issue_date),
    CHECK (amount_paid <= amount_due)
);

-- Receipts table - Payment receipts and tracking
CREATE TABLE IF NOT EXISTS receipts (
    receipt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    sale_agreement_id UUID NOT NULL REFERENCES sale_agreements(sale_agreement_id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(invoice_id),
    payment_method payment_method NOT NULL,
    transaction_ref VARCHAR(100), -- Bank ref, M-PESA code, etc.
    paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    payer_name VARCHAR(200) NOT NULL,
    payer_phone VARCHAR(20),
    bank_name VARCHAR(100),
    cheque_number VARCHAR(50),
    mpesa_receipt_number VARCHAR(50),
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    currency VARCHAR(3) DEFAULT 'KES',
    processed_by UUID REFERENCES user_profiles(id),
    verified BOOLEAN DEFAULT FALSE,
    verification_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank and M-PESA reconciliation table
CREATE TABLE IF NOT EXISTS bank_mpesa_recons (
    recon_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    transaction_ref VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payer_details VARCHAR(200),
    source VARCHAR(20) NOT NULL, -- 'bank', 'mpesa'
    receipt_id UUID REFERENCES receipts(receipt_id),
    status recon_status DEFAULT 'unmatched',
    matched_date DATE,
    matched_by UUID REFERENCES user_profiles(id),
    variance_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    raw_data JSONB, -- Original transaction data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(transaction_ref, source)
);

-- Title transfers table - Title deed transfer tracking
CREATE TABLE IF NOT EXISTS transfers_titles (
    transfer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_agreement_id UUID NOT NULL REFERENCES sale_agreements(sale_agreement_id) ON DELETE CASCADE,
    transfer_reference VARCHAR(100),
    lawyer_firm VARCHAR(200),
    lawyer_contact VARCHAR(100),
    lodgement_date DATE,
    approval_date DATE,
    completion_date DATE,
    status transfer_status DEFAULT 'pending',
    registrar_office VARCHAR(100),
    new_title_number VARCHAR(100),
    transfer_fee DECIMAL(12,2) CHECK (transfer_fee >= 0),
    stamp_duty DECIMAL(12,2) CHECK (stamp_duty >= 0),
    legal_fees DECIMAL(12,2) CHECK (legal_fees >= 0),
    total_costs DECIMAL(12,2) GENERATED ALWAYS AS (
        COALESCE(transfer_fee, 0) + COALESCE(stamp_duty, 0) + COALESCE(legal_fees, 0)
    ) STORED,
    conditions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (approval_date IS NULL OR approval_date >= lodgement_date),
    CHECK (completion_date IS NULL OR completion_date >= approval_date)
);

-- Agents table - Sales agents information
CREATE TABLE IF NOT EXISTS agents (
    agent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES user_profiles(id),
    agent_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    id_number VARCHAR(20) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    kra_pin VARCHAR(11),
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    bank_branch VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    hire_date DATE DEFAULT CURRENT_DATE,
    termination_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (termination_date IS NULL OR termination_date >= hire_date)
);

-- Commissions table - Agent commission tracking
CREATE TABLE IF NOT EXISTS commissions (
    commission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(agent_id),
    sale_agreement_id UUID NOT NULL REFERENCES sale_agreements(sale_agreement_id),
    base_amount DECIMAL(15,2) NOT NULL CHECK (base_amount > 0),
    rate_applied DECIMAL(5,2) NOT NULL CHECK (rate_applied >= 0),
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    withholding_tax DECIMAL(12,2) DEFAULT 0 CHECK (withholding_tax >= 0),
    net_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount - COALESCE(withholding_tax, 0)) STORED,
    balance DECIMAL(15,2) DEFAULT 0,
    payable_date DATE NOT NULL,
    paid_date DATE,
    status commission_status DEFAULT 'pending',
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (paid_date IS NULL OR paid_date >= payable_date),
    UNIQUE(agent_id, sale_agreement_id)
);

-- Land rates table - Government land rates tracking
CREATE TABLE IF NOT EXISTS land_rates (
    rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id) ON DELETE CASCADE,
    financial_year VARCHAR(9) NOT NULL, -- e.g., '2023/2024'
    assessed_value DECIMAL(15,2) NOT NULL CHECK (assessed_value > 0),
    rate_percentage DECIMAL(5,4) NOT NULL CHECK (rate_percentage > 0),
    annual_rate DECIMAL(12,2) NOT NULL CHECK (annual_rate > 0),
    amount_paid DECIMAL(12,2) DEFAULT 0 CHECK (amount_paid >= 0),
    balance DECIMAL(12,2) GENERATED ALWAYS AS (annual_rate - amount_paid) STORED,
    due_date DATE NOT NULL,
    penalty_amount DECIMAL(12,2) DEFAULT 0 CHECK (penalty_amount >= 0),
    payment_reference VARCHAR(100),
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(parcel_id, financial_year)
);

-- Disputes table - Financial disputes and resolution tracking
CREATE TABLE IF NOT EXISTS disputes_logs (
    dispute_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'receipt', 'invoice', 'commission', etc.
    entity_id UUID NOT NULL,
    dispute_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount_disputed DECIMAL(15,2) CHECK (amount_disputed >= 0),
    raised_by UUID REFERENCES user_profiles(id),
    assigned_to UUID REFERENCES user_profiles(id),
    status dispute_status DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    resolution TEXT,
    resolved_by UUID REFERENCES user_profiles(id),
    resolved_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (resolved_date IS NULL OR resolved_date >= created_at::date)
);

-- Payment allocations table - Track how payments are allocated to invoices
CREATE TABLE IF NOT EXISTS payment_allocations (
    allocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES receipts(receipt_id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance (with error handling)
DO $$
BEGIN
    -- Invoices indexes
    CREATE INDEX IF NOT EXISTS idx_invoices_sale_agreement_id ON invoices(sale_agreement_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);

    -- Receipts indexes (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipts') THEN
        CREATE INDEX IF NOT EXISTS idx_receipts_sale_agreement_id ON receipts(sale_agreement_id);
        CREATE INDEX IF NOT EXISTS idx_receipts_payment_method ON receipts(payment_method);
        CREATE INDEX IF NOT EXISTS idx_receipts_paid_date ON receipts(paid_date);
        CREATE INDEX IF NOT EXISTS idx_receipts_transaction_ref ON receipts(transaction_ref);
        CREATE INDEX IF NOT EXISTS idx_receipts_receipt_no ON receipts(receipt_no);
    END IF;

    -- Bank reconciliation indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_mpesa_recons') THEN
        CREATE INDEX IF NOT EXISTS idx_bank_mpesa_recons_status ON bank_mpesa_recons(status);
        CREATE INDEX IF NOT EXISTS idx_bank_mpesa_recons_source ON bank_mpesa_recons(source);
        CREATE INDEX IF NOT EXISTS idx_bank_mpesa_recons_transaction_ref ON bank_mpesa_recons(transaction_ref);
        CREATE INDEX IF NOT EXISTS idx_bank_mpesa_recons_transaction_date ON bank_mpesa_recons(transaction_date);
    END IF;

    -- Title transfers indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfers_titles') THEN
        CREATE INDEX IF NOT EXISTS idx_transfers_titles_sale_agreement_id ON transfers_titles(sale_agreement_id);
        CREATE INDEX IF NOT EXISTS idx_transfers_titles_status ON transfers_titles(status);
        CREATE INDEX IF NOT EXISTS idx_transfers_titles_lodgement_date ON transfers_titles(lodgement_date);
    END IF;

    -- Agents indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
        CREATE INDEX IF NOT EXISTS idx_agents_agent_code ON agents(agent_code);
        CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
        CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);
    END IF;

    -- Commissions indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commissions') THEN
        CREATE INDEX IF NOT EXISTS idx_commissions_agent_id ON commissions(agent_id);
        CREATE INDEX IF NOT EXISTS idx_commissions_sale_agreement_id ON commissions(sale_agreement_id);
        CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
        CREATE INDEX IF NOT EXISTS idx_commissions_payable_date ON commissions(payable_date);
    END IF;

    -- Land rates indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'land_rates') THEN
        CREATE INDEX IF NOT EXISTS idx_land_rates_parcel_id ON land_rates(parcel_id);
        CREATE INDEX IF NOT EXISTS idx_land_rates_financial_year ON land_rates(financial_year);
        CREATE INDEX IF NOT EXISTS idx_land_rates_due_date ON land_rates(due_date);
    END IF;

    -- Disputes indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disputes_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_disputes_logs_entity ON disputes_logs(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_disputes_logs_status ON disputes_logs(status);
        CREATE INDEX IF NOT EXISTS idx_disputes_logs_assigned_to ON disputes_logs(assigned_to);
    END IF;

    -- Payment allocations indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_allocations') THEN
        CREATE INDEX IF NOT EXISTS idx_payment_allocations_receipt_id ON payment_allocations(receipt_id);
        CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);
    END IF;

    RAISE NOTICE 'Financial schema indexes created successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some indexes could not be created: %', SQLERRM;
END $$;

-- Apply updated_at triggers (with error handling)
DO $$
BEGIN
    -- Drop and recreate triggers to avoid conflicts
    DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
    CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_receipts_updated_at ON receipts;
    CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_bank_mpesa_recons_updated_at ON bank_mpesa_recons;
    CREATE TRIGGER update_bank_mpesa_recons_updated_at BEFORE UPDATE ON bank_mpesa_recons
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_transfers_titles_updated_at ON transfers_titles;
    CREATE TRIGGER update_transfers_titles_updated_at BEFORE UPDATE ON transfers_titles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
    CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_commissions_updated_at ON commissions;
    CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_land_rates_updated_at ON land_rates;
    CREATE TRIGGER update_land_rates_updated_at BEFORE UPDATE ON land_rates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_disputes_logs_updated_at ON disputes_logs;
    CREATE TRIGGER update_disputes_logs_updated_at BEFORE UPDATE ON disputes_logs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Comments for documentation
COMMENT ON TABLE invoices IS 'Invoice generation and tracking for sale agreements';
COMMENT ON TABLE receipts IS 'Payment receipts and transaction tracking';
COMMENT ON TABLE bank_mpesa_recons IS 'Bank and M-PESA transaction reconciliation';
COMMENT ON TABLE transfers_titles IS 'Title deed transfer process tracking';
COMMENT ON TABLE agents IS 'Sales agents information and commission rates';
COMMENT ON TABLE commissions IS 'Agent commission calculations and payments';
COMMENT ON TABLE land_rates IS 'Government land rates and payments tracking';
COMMENT ON TABLE disputes_logs IS 'Financial disputes and resolution tracking';
COMMENT ON TABLE payment_allocations IS 'Allocation of payments to specific invoices';
