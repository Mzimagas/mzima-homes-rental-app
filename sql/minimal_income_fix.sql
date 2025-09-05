-- Minimal fix for Income Management - Run this in Supabase SQL Editor

-- Create essential enums (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE income_category_type AS ENUM (
      'RENTAL_INCOME',
      'MEMBER_CONTRIBUTION',
      'PROPERTY_SALE',
      'COMMISSION_INCOME',
      'OTHER_INCOME'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE income_status_type AS ENUM (
      'PENDING',
      'RECEIVED',
      'OVERDUE',
      'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Income categories table
CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name income_category_type NOT NULL,
  subcategory VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  default_frequency VARCHAR(20) DEFAULT 'ONE_TIME',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_name, subcategory)
);

-- Income transactions table
CREATE TABLE IF NOT EXISTS income_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES income_categories(id),
  property_id UUID REFERENCES properties(id),
  member_id UUID REFERENCES enhanced_users(id),
  tenant_id UUID REFERENCES tenants(id),
  amount_kes DECIMAL(15,2) NOT NULL CHECK (amount_kes > 0),
  transaction_date DATE NOT NULL,
  due_date DATE,
  received_date DATE,
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  status income_status_type DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id)
);

-- Member contributions table
CREATE TABLE IF NOT EXISTS member_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES enhanced_users(id),
  property_id UUID REFERENCES properties(id),
  amount_kes DECIMAL(15,2) NOT NULL CHECK (amount_kes > 0),
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_reference VARCHAR(100),
  status income_status_type DEFAULT 'PENDING',
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property sales income table
CREATE TABLE IF NOT EXISTS property_sales_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  sale_price_kes DECIMAL(15,2) NOT NULL CHECK (sale_price_kes > 0),
  total_received_kes DECIMAL(15,2) DEFAULT 0,
  sale_date DATE NOT NULL,
  completion_date DATE,
  status income_status_type DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO income_categories (category_name, subcategory, display_name, description, is_recurring, sort_order) VALUES
('RENTAL_INCOME', 'MONTHLY_RENT', 'Monthly Rent', 'Regular monthly rental income', true, 1),
('RENTAL_INCOME', 'DEPOSIT', 'Security Deposit', 'Security deposits from tenants', false, 2),
('MEMBER_CONTRIBUTION', 'MONTHLY_FEE', 'Monthly Member Fee', 'Regular membership fees', true, 3),
('MEMBER_CONTRIBUTION', 'PROJECT_CONTRIBUTION', 'Project Contribution', 'Project-specific contributions', false, 4),
('PROPERTY_SALE', 'FULL_SALE', 'Property Sale', 'Complete property sales', false, 5),
('COMMISSION_INCOME', 'SALES_COMMISSION', 'Sales Commission', 'Property sales commission', false, 6),
('OTHER_INCOME', 'MISCELLANEOUS', 'Miscellaneous', 'Other income sources', false, 7);

-- Enable RLS
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_sales_income ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (only create if they don't exist)
DO $$ BEGIN
    CREATE POLICY "Enable read access for all users" ON income_categories FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON income_transactions FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON member_contributions FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON property_sales_income FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
