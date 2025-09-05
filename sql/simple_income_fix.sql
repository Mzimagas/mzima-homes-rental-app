-- Simple Income Management Fix - Run this in Supabase SQL Editor
-- This creates the minimum required tables to fix the 400 errors

-- Step 1: Create enums (skip if they exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_category_type') THEN
        CREATE TYPE income_category_type AS ENUM (
            'RENTAL_INCOME',
            'MEMBER_CONTRIBUTION', 
            'PROPERTY_SALE',
            'COMMISSION_INCOME',
            'OTHER_INCOME'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_status_type') THEN
        CREATE TYPE income_status_type AS ENUM (
            'PENDING',
            'RECEIVED',
            'OVERDUE',
            'CANCELLED'
        );
    END IF;
END $$;

-- Step 2: Create income_categories table
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create income_transactions table
CREATE TABLE IF NOT EXISTS income_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID,
    property_id UUID,
    member_id UUID,
    tenant_id UUID,
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
    created_by UUID
);

-- Step 4: Create member_contributions table
CREATE TABLE IF NOT EXISTS member_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID,
    property_id UUID,
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

-- Step 5: Create property_sales_income table
CREATE TABLE IF NOT EXISTS property_sales_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID,
    sale_price_kes DECIMAL(15,2) NOT NULL CHECK (sale_price_kes > 0),
    total_received_kes DECIMAL(15,2) DEFAULT 0,
    sale_date DATE NOT NULL,
    completion_date DATE,
    status income_status_type DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Add foreign key constraints (only if tables exist)
DO $$
BEGIN
    -- Add foreign key for income_transactions.category_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'income_categories') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'income_transactions_category_id_fkey') THEN
            ALTER TABLE income_transactions 
            ADD CONSTRAINT income_transactions_category_id_fkey 
            FOREIGN KEY (category_id) REFERENCES income_categories(id);
        END IF;
    END IF;

    -- Add foreign key for property_id (if properties table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'income_transactions_property_id_fkey') THEN
            ALTER TABLE income_transactions 
            ADD CONSTRAINT income_transactions_property_id_fkey 
            FOREIGN KEY (property_id) REFERENCES properties(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'member_contributions_property_id_fkey') THEN
            ALTER TABLE member_contributions 
            ADD CONSTRAINT member_contributions_property_id_fkey 
            FOREIGN KEY (property_id) REFERENCES properties(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'property_sales_income_property_id_fkey') THEN
            ALTER TABLE property_sales_income 
            ADD CONSTRAINT property_sales_income_property_id_fkey 
            FOREIGN KEY (property_id) REFERENCES properties(id);
        END IF;
    END IF;

    -- Add foreign key for enhanced_users (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enhanced_users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'income_transactions_member_id_fkey') THEN
            ALTER TABLE income_transactions 
            ADD CONSTRAINT income_transactions_member_id_fkey 
            FOREIGN KEY (member_id) REFERENCES enhanced_users(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'member_contributions_member_id_fkey') THEN
            ALTER TABLE member_contributions 
            ADD CONSTRAINT member_contributions_member_id_fkey 
            FOREIGN KEY (member_id) REFERENCES enhanced_users(id);
        END IF;
    END IF;

    -- Add foreign key for tenants (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'income_transactions_tenant_id_fkey') THEN
            ALTER TABLE income_transactions 
            ADD CONSTRAINT income_transactions_tenant_id_fkey 
            FOREIGN KEY (tenant_id) REFERENCES tenants(id);
        END IF;
    END IF;
END $$;

-- Step 7: Insert default categories (only if table is empty)
INSERT INTO income_categories (category_name, subcategory, display_name, description, is_recurring, sort_order)
SELECT * FROM (VALUES
    ('RENTAL_INCOME', 'MONTHLY_RENT', 'Monthly Rent', 'Regular monthly rental income', true, 1),
    ('RENTAL_INCOME', 'DEPOSIT', 'Security Deposit', 'Security deposits from tenants', false, 2),
    ('MEMBER_CONTRIBUTION', 'MONTHLY_FEE', 'Monthly Member Fee', 'Regular membership fees', true, 3),
    ('MEMBER_CONTRIBUTION', 'PROJECT_CONTRIBUTION', 'Project Contribution', 'Project-specific contributions', false, 4),
    ('PROPERTY_SALE', 'FULL_SALE', 'Property Sale', 'Complete property sales', false, 5),
    ('COMMISSION_INCOME', 'SALES_COMMISSION', 'Sales Commission', 'Property sales commission', false, 6),
    ('OTHER_INCOME', 'MISCELLANEOUS', 'Miscellaneous', 'Other income sources', false, 7)
) AS v(category_name, subcategory, display_name, description, is_recurring, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM income_categories LIMIT 1);

-- Step 8: Enable RLS
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_sales_income ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_categories' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON income_categories FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_transactions' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON income_transactions FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member_contributions' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON member_contributions FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_sales_income' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON property_sales_income FOR ALL USING (true);
    END IF;
END $$;

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_transactions_category ON income_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_property ON income_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_member ON income_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_date ON income_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_income_transactions_status ON income_transactions(status);

CREATE INDEX IF NOT EXISTS idx_member_contributions_member ON member_contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_contributions_due_date ON member_contributions(due_date);
CREATE INDEX IF NOT EXISTS idx_member_contributions_status ON member_contributions(status);

CREATE INDEX IF NOT EXISTS idx_property_sales_property ON property_sales_income(property_id);
CREATE INDEX IF NOT EXISTS idx_property_sales_date ON property_sales_income(sale_date);

-- Verification query - run this to check if everything was created
SELECT 
    'income_categories' as table_name,
    COUNT(*) as record_count
FROM income_categories
UNION ALL
SELECT 
    'income_transactions' as table_name,
    COUNT(*) as record_count
FROM income_transactions
UNION ALL
SELECT 
    'member_contributions' as table_name,
    COUNT(*) as record_count
FROM member_contributions
UNION ALL
SELECT 
    'property_sales_income' as table_name,
    COUNT(*) as record_count
FROM property_sales_income;
