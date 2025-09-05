-- Migration 071: Enhanced Income Management System
-- Description: Comprehensive income tracking for rental income, member contributions, 
-- property sales, commissions, and other revenue streams

-- Create income categories enum
CREATE TYPE income_category_type AS ENUM (
  'RENTAL_INCOME',
  'MEMBER_CONTRIBUTION', 
  'PROPERTY_SALE',
  'COMMISSION_INCOME',
  'INTEREST_INCOME',
  'OTHER_INCOME'
);

-- Create income subcategory enum
CREATE TYPE income_subcategory_type AS ENUM (
  -- Rental income subcategories
  'MONTHLY_RENT',
  'LATE_FEES',
  'SECURITY_DEPOSIT',
  'PARKING_FEES',
  'UTILITY_INCOME',
  
  -- Member contribution subcategories
  'MONTHLY_MEMBER_FEE',
  'PROJECT_SPECIFIC_CONTRIBUTION',
  'SHARE_CAPITAL',
  'SPECIAL_ASSESSMENT',
  
  -- Property sale subcategories
  'SALE_PROCEEDS',
  'CAPITAL_GAINS',
  'INSTALLMENT_PAYMENT',
  
  -- Commission subcategories
  'SALES_COMMISSION',
  'REFERRAL_COMMISSION',
  'MANAGEMENT_FEE',
  
  -- Interest subcategories
  'LOAN_INTEREST',
  'INVESTMENT_INTEREST',
  'BANK_INTEREST',
  
  -- Other income subcategories
  'INSURANCE_CLAIM',
  'RENTAL_EQUIPMENT',
  'MISCELLANEOUS'
);

-- Create recurring frequency enum
CREATE TYPE recurring_frequency_type AS ENUM (
  'MONTHLY',
  'QUARTERLY', 
  'SEMI_ANNUALLY',
  'ANNUALLY',
  'ONE_TIME'
);

-- Create income status enum
CREATE TYPE income_status_type AS ENUM (
  'PENDING',
  'RECEIVED',
  'OVERDUE',
  'CANCELLED',
  'PARTIAL'
);

-- Income categories configuration table
CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name income_category_type NOT NULL,
  subcategory income_subcategory_type NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  default_frequency recurring_frequency_type DEFAULT 'ONE_TIME',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique category-subcategory combinations
  UNIQUE(category_name, subcategory)
);

-- Main income transactions table
CREATE TABLE IF NOT EXISTS income_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES income_categories(id),
  
  -- Related entities (nullable based on income type)
  property_id UUID REFERENCES properties(id),
  member_id UUID REFERENCES enhanced_users(id),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES agents(agent_id),
  
  -- Transaction details
  amount_kes DECIMAL(15,2) NOT NULL CHECK (amount_kes > 0),
  transaction_date DATE NOT NULL,
  due_date DATE, -- For expected income
  received_date DATE, -- When actually received
  
  -- Transaction metadata
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  external_reference VARCHAR(100), -- Bank ref, M-PESA code, etc.
  
  -- Recurring transaction details
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency recurring_frequency_type DEFAULT 'ONE_TIME',
  parent_transaction_id UUID REFERENCES income_transactions(id), -- For recurring transactions
  
  -- Status and tracking
  status income_status_type DEFAULT 'PENDING',
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id),
  
  -- Constraints
  CHECK (received_date IS NULL OR received_date >= transaction_date),
  CHECK (due_date IS NULL OR due_date >= transaction_date)
);

-- Member contributions tracking table
CREATE TABLE IF NOT EXISTS member_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES enhanced_users(id),
  contribution_type income_subcategory_type NOT NULL,
  
  -- Project/property specific contributions
  property_id UUID REFERENCES properties(id),
  project_name VARCHAR(200),
  
  -- Contribution details
  amount_kes DECIMAL(15,2) NOT NULL CHECK (amount_kes > 0),
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_reference VARCHAR(100),
  
  -- Status tracking
  status income_status_type DEFAULT 'PENDING',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency recurring_frequency_type DEFAULT 'MONTHLY',
  
  -- Metadata
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (paid_date IS NULL OR paid_date >= due_date),
  CHECK (contribution_type IN ('MONTHLY_MEMBER_FEE', 'PROJECT_SPECIFIC_CONTRIBUTION', 'SHARE_CAPITAL', 'SPECIAL_ASSESSMENT'))
);

-- Property sales income tracking
CREATE TABLE IF NOT EXISTS property_sales_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  sale_agreement_id UUID, -- Reference to sale agreement if exists
  
  -- Sale details
  sale_price_kes DECIMAL(15,2) NOT NULL CHECK (sale_price_kes > 0),
  acquisition_cost_kes DECIMAL(15,2) DEFAULT 0,
  capital_gains_kes DECIMAL(15,2) GENERATED ALWAYS AS (sale_price_kes - COALESCE(acquisition_cost_kes, 0)) STORED,
  
  -- Payment tracking
  total_received_kes DECIMAL(15,2) DEFAULT 0 CHECK (total_received_kes >= 0),
  balance_kes DECIMAL(15,2) GENERATED ALWAYS AS (sale_price_kes - COALESCE(total_received_kes, 0)) STORED,
  
  -- Dates
  sale_date DATE NOT NULL,
  completion_date DATE,
  
  -- Buyer information
  buyer_name VARCHAR(200),
  buyer_contact VARCHAR(100),
  
  -- Status and metadata
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission income tracking (extends existing commissions table)
CREATE TABLE IF NOT EXISTS commission_income_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID REFERENCES commissions(commission_id), -- Link to existing commissions
  income_transaction_id UUID REFERENCES income_transactions(id),

  -- Commission details
  commission_type income_subcategory_type NOT NULL,
  base_amount_kes DECIMAL(15,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount_kes DECIMAL(15,2) NOT NULL,

  -- Payment tracking
  expected_date DATE,
  received_date DATE,
  status income_status_type DEFAULT 'PENDING',

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CHECK (commission_type IN ('SALES_COMMISSION', 'REFERRAL_COMMISSION', 'MANAGEMENT_FEE'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_transactions_category ON income_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_property ON income_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_member ON income_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_tenant ON income_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_date ON income_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_income_transactions_status ON income_transactions(status);
CREATE INDEX IF NOT EXISTS idx_income_transactions_recurring ON income_transactions(is_recurring, recurring_frequency);

CREATE INDEX IF NOT EXISTS idx_member_contributions_member ON member_contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_contributions_property ON member_contributions(property_id);
CREATE INDEX IF NOT EXISTS idx_member_contributions_type ON member_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_member_contributions_status ON member_contributions(status);
CREATE INDEX IF NOT EXISTS idx_member_contributions_due_date ON member_contributions(due_date);

CREATE INDEX IF NOT EXISTS idx_property_sales_property ON property_sales_income(property_id);
CREATE INDEX IF NOT EXISTS idx_property_sales_status ON property_sales_income(status);
CREATE INDEX IF NOT EXISTS idx_property_sales_date ON property_sales_income(sale_date);

-- Insert default income categories
INSERT INTO income_categories (category_name, subcategory, display_name, description, is_recurring, default_frequency, sort_order) VALUES
-- Rental Income Categories
('RENTAL_INCOME', 'MONTHLY_RENT', 'Monthly Rent', 'Regular monthly rental payments from tenants', true, 'MONTHLY', 1),
('RENTAL_INCOME', 'LATE_FEES', 'Late Fees', 'Penalties for late rent payments', false, 'ONE_TIME', 2),
('RENTAL_INCOME', 'SECURITY_DEPOSIT', 'Security Deposits', 'Refundable security deposits from tenants', false, 'ONE_TIME', 3),
('RENTAL_INCOME', 'PARKING_FEES', 'Parking Fees', 'Additional parking space rental fees', true, 'MONTHLY', 4),
('RENTAL_INCOME', 'UTILITY_INCOME', 'Utility Income', 'Utility cost recovery from tenants', true, 'MONTHLY', 5),

-- Member Contribution Categories
('MEMBER_CONTRIBUTION', 'MONTHLY_MEMBER_FEE', 'Monthly Member Fee', 'KES 1,000 monthly contribution from each member', true, 'MONTHLY', 10),
('MEMBER_CONTRIBUTION', 'PROJECT_SPECIFIC_CONTRIBUTION', 'Project Contribution', 'Member contributions for specific property projects', false, 'ONE_TIME', 11),
('MEMBER_CONTRIBUTION', 'SHARE_CAPITAL', 'Share Capital', 'Member equity investments in the company', false, 'ONE_TIME', 12),
('MEMBER_CONTRIBUTION', 'SPECIAL_ASSESSMENT', 'Special Assessment', 'One-time special contributions from members', false, 'ONE_TIME', 13),

-- Property Sale Categories
('PROPERTY_SALE', 'SALE_PROCEEDS', 'Property Sale Proceeds', 'Income from property sales', false, 'ONE_TIME', 20),
('PROPERTY_SALE', 'CAPITAL_GAINS', 'Capital Gains', 'Profit from property appreciation', false, 'ONE_TIME', 21),
('PROPERTY_SALE', 'INSTALLMENT_PAYMENT', 'Installment Payments', 'Installment payments from property sales', false, 'ONE_TIME', 22),

-- Commission Categories
('COMMISSION_INCOME', 'SALES_COMMISSION', 'Sales Commission', 'Commission earned from property sales', false, 'ONE_TIME', 30),
('COMMISSION_INCOME', 'REFERRAL_COMMISSION', 'Referral Commission', 'Commission from client referrals', false, 'ONE_TIME', 31),
('COMMISSION_INCOME', 'MANAGEMENT_FEE', 'Management Fee', 'Property management service fees', true, 'MONTHLY', 32),

-- Interest Income Categories
('INTEREST_INCOME', 'LOAN_INTEREST', 'Loan Interest', 'Interest earned from loans given', true, 'MONTHLY', 40),
('INTEREST_INCOME', 'INVESTMENT_INTEREST', 'Investment Interest', 'Interest from investments', true, 'QUARTERLY', 41),
('INTEREST_INCOME', 'BANK_INTEREST', 'Bank Interest', 'Interest earned from bank deposits', true, 'MONTHLY', 42),

-- Other Income Categories
('OTHER_INCOME', 'INSURANCE_CLAIM', 'Insurance Claims', 'Income from insurance claim settlements', false, 'ONE_TIME', 50),
('OTHER_INCOME', 'RENTAL_EQUIPMENT', 'Equipment Rental', 'Income from renting out equipment', false, 'ONE_TIME', 51),
('OTHER_INCOME', 'MISCELLANEOUS', 'Miscellaneous Income', 'Other miscellaneous income sources', false, 'ONE_TIME', 52);

-- Create RLS policies
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_sales_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_income_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for income_categories (read-only for all authenticated users)
CREATE POLICY "income_categories_select" ON income_categories FOR SELECT TO authenticated USING (true);

-- RLS Policies for income_transactions
CREATE POLICY "income_transactions_select" ON income_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "income_transactions_insert" ON income_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "income_transactions_update" ON income_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "income_transactions_delete" ON income_transactions FOR DELETE TO authenticated USING (true);

-- RLS Policies for member_contributions
CREATE POLICY "member_contributions_select" ON member_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "member_contributions_insert" ON member_contributions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "member_contributions_update" ON member_contributions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "member_contributions_delete" ON member_contributions FOR DELETE TO authenticated USING (true);

-- RLS Policies for property_sales_income
CREATE POLICY "property_sales_income_select" ON property_sales_income FOR SELECT TO authenticated USING (true);
CREATE POLICY "property_sales_income_insert" ON property_sales_income FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "property_sales_income_update" ON property_sales_income FOR UPDATE TO authenticated USING (true);
CREATE POLICY "property_sales_income_delete" ON property_sales_income FOR DELETE TO authenticated USING (true);

-- RLS Policies for commission_income_tracking
CREATE POLICY "commission_income_tracking_select" ON commission_income_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "commission_income_tracking_insert" ON commission_income_tracking FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "commission_income_tracking_update" ON commission_income_tracking FOR UPDATE TO authenticated USING (true);
CREATE POLICY "commission_income_tracking_delete" ON commission_income_tracking FOR DELETE TO authenticated USING (true);

-- Add comments for documentation
COMMENT ON TABLE income_categories IS 'Configuration table for income categories and subcategories';
COMMENT ON TABLE income_transactions IS 'Main table for tracking all income transactions across different categories';
COMMENT ON TABLE member_contributions IS 'Specific tracking for member contributions including monthly fees and project contributions';
COMMENT ON TABLE property_sales_income IS 'Tracking income from property sales including capital gains calculations';
COMMENT ON TABLE commission_income_tracking IS 'Extended tracking for commission income with detailed breakdown';
