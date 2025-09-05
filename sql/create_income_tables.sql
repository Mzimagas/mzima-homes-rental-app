-- Quick fix for Income Management tables
-- Run this SQL directly in your Supabase SQL Editor

-- Create income categories enum
DO $$ BEGIN
    CREATE TYPE income_category_type AS ENUM (
      'RENTAL_INCOME',
      'MEMBER_CONTRIBUTION', 
      'PROPERTY_SALE',
      'COMMISSION_INCOME',
      'INTEREST_INCOME',
      'OTHER_INCOME'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create income subcategory enum
DO $$ BEGIN
    CREATE TYPE income_subcategory_type AS ENUM (
      'MONTHLY_RENT',
      'DEPOSIT',
      'LATE_FEES',
      'MONTHLY_MEMBER_FEE',
      'PROJECT_SPECIFIC_CONTRIBUTION',
      'SHARE_CAPITAL',
      'SPECIAL_ASSESSMENT',
      'FULL_SALE',
      'PARTIAL_SALE',
      'SALES_COMMISSION',
      'MANAGEMENT_COMMISSION',
      'BANK_INTEREST',
      'INVESTMENT_RETURNS',
      'MISCELLANEOUS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create recurring frequency enum
DO $$ BEGIN
    CREATE TYPE recurring_frequency_type AS ENUM (
      'ONE_TIME',
      'DAILY',
      'WEEKLY',
      'MONTHLY',
      'QUARTERLY',
      'ANNUALLY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create income status enum
DO $$ BEGIN
    CREATE TYPE income_status_type AS ENUM (
      'PENDING',
      'PARTIAL',
      'RECEIVED',
      'OVERDUE',
      'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
  agent_name VARCHAR(200), -- Agent name instead of foreign key reference
  
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
  
  -- Status
  status income_status_type DEFAULT 'PENDING',
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default income categories
INSERT INTO income_categories (category_name, subcategory, display_name, description, is_recurring, default_frequency, sort_order) VALUES
('RENTAL_INCOME', 'MONTHLY_RENT', 'Monthly Rent', 'Regular monthly rental income from tenants', true, 'MONTHLY', 1),
('RENTAL_INCOME', 'DEPOSIT', 'Security Deposit', 'Security deposits from tenants', false, 'ONE_TIME', 2),
('RENTAL_INCOME', 'LATE_FEES', 'Late Fees', 'Late payment fees from tenants', false, 'ONE_TIME', 3),
('MEMBER_CONTRIBUTION', 'MONTHLY_MEMBER_FEE', 'Monthly Member Fee', 'Regular monthly membership fees', true, 'MONTHLY', 4),
('MEMBER_CONTRIBUTION', 'PROJECT_SPECIFIC_CONTRIBUTION', 'Project Contribution', 'Contributions for specific property projects', false, 'ONE_TIME', 5),
('MEMBER_CONTRIBUTION', 'SHARE_CAPITAL', 'Share Capital', 'Member share capital contributions', false, 'ONE_TIME', 6),
('PROPERTY_SALE', 'FULL_SALE', 'Property Sale', 'Income from complete property sales', false, 'ONE_TIME', 7),
('COMMISSION_INCOME', 'SALES_COMMISSION', 'Sales Commission', 'Commission from property sales', false, 'ONE_TIME', 8),
('COMMISSION_INCOME', 'MANAGEMENT_COMMISSION', 'Management Commission', 'Property management commissions', false, 'ONE_TIME', 9),
('INTEREST_INCOME', 'BANK_INTEREST', 'Bank Interest', 'Interest earned on bank deposits', true, 'MONTHLY', 10),
('OTHER_INCOME', 'MISCELLANEOUS', 'Miscellaneous Income', 'Other miscellaneous income sources', false, 'ONE_TIME', 11)
ON CONFLICT (category_name, subcategory) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_transactions_category ON income_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_property ON income_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_member ON income_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_tenant ON income_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_date ON income_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_income_transactions_status ON income_transactions(status);

CREATE INDEX IF NOT EXISTS idx_member_contributions_member ON member_contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_contributions_property ON member_contributions(property_id);
CREATE INDEX IF NOT EXISTS idx_member_contributions_type ON member_contributions(contribution_type);
CREATE INDEX IF NOT EXISTS idx_member_contributions_status ON member_contributions(status);
CREATE INDEX IF NOT EXISTS idx_member_contributions_due_date ON member_contributions(due_date);

CREATE INDEX IF NOT EXISTS idx_property_sales_property ON property_sales_income(property_id);
CREATE INDEX IF NOT EXISTS idx_property_sales_status ON property_sales_income(status);
CREATE INDEX IF NOT EXISTS idx_property_sales_date ON property_sales_income(sale_date);

-- Enable RLS
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_sales_income ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "income_categories_select" ON income_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "income_transactions_select" ON income_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "income_transactions_insert" ON income_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "income_transactions_update" ON income_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "income_transactions_delete" ON income_transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "member_contributions_select" ON member_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "member_contributions_insert" ON member_contributions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "member_contributions_update" ON member_contributions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "member_contributions_delete" ON member_contributions FOR DELETE TO authenticated USING (true);

CREATE POLICY "property_sales_income_select" ON property_sales_income FOR SELECT TO authenticated USING (true);
CREATE POLICY "property_sales_income_insert" ON property_sales_income FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "property_sales_income_update" ON property_sales_income FOR UPDATE TO authenticated USING (true);
CREATE POLICY "property_sales_income_delete" ON property_sales_income FOR DELETE TO authenticated USING (true);
