-- Quick fix for Expense Management tables
-- Run this SQL directly in your Supabase SQL Editor

-- Create expense category enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category_type') THEN
        CREATE TYPE expense_category_type AS ENUM (
            'PROPERTY_SPECIFIC',
            'GENERAL_BUSINESS',
            'SHARED_ALLOCATED',
            'MAINTENANCE_REPAIRS',
            'UTILITIES',
            'PROFESSIONAL_SERVICES',
            'MARKETING_ADVERTISING',
            'ADMINISTRATIVE',
            'OTHER_EXPENSES'
        );
    END IF;
END $$;

-- Create expense status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status_type') THEN
        CREATE TYPE expense_status_type AS ENUM (
            'PENDING',
            'APPROVED',
            'PAID',
            'REJECTED',
            'CANCELLED'
        );
    END IF;
END $$;

-- Create allocation method enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allocation_method_type') THEN
        CREATE TYPE allocation_method_type AS ENUM (
            'EQUAL_SPLIT',
            'PERCENTAGE',
            'SQUARE_FOOTAGE',
            'RENTAL_VALUE',
            'CUSTOM'
        );
    END IF;
END $$;

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name expense_category_type NOT NULL,
    subcategory VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_allocatable BOOLEAN DEFAULT FALSE,
    default_allocation_method allocation_method_type DEFAULT 'EQUAL_SPLIT',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_name, subcategory)
);

-- Vendors table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    vendor_type VARCHAR(50),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense transactions table
CREATE TABLE IF NOT EXISTS expense_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES expense_categories(id),
    vendor_id UUID REFERENCES vendors(id),
    property_id UUID REFERENCES properties(id),
    
    -- Transaction details
    amount_kes DECIMAL(15,2) NOT NULL CHECK (amount_kes > 0),
    transaction_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    
    -- Transaction metadata
    description TEXT NOT NULL,
    reference_number VARCHAR(100),
    invoice_number VARCHAR(100),
    receipt_number VARCHAR(100),
    
    -- Status and approval
    status expense_status_type DEFAULT 'PENDING',
    approved_by UUID,
    approved_date DATE,
    
    -- Allocation details
    is_allocated BOOLEAN DEFAULT FALSE,
    allocation_method allocation_method_type DEFAULT 'EQUAL_SPLIT',
    
    -- Notes and attachments
    notes TEXT,
    attachment_urls TEXT[],
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CHECK (paid_date IS NULL OR paid_date >= transaction_date),
    CHECK (due_date IS NULL OR due_date >= transaction_date)
);

-- Expense allocations table
CREATE TABLE IF NOT EXISTS expense_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_transaction_id UUID NOT NULL REFERENCES expense_transactions(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id),
    
    -- Allocation details
    allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
    allocated_amount_kes DECIMAL(15,2) NOT NULL CHECK (allocated_amount_kes >= 0),
    allocation_method allocation_method_type NOT NULL,
    
    -- Allocation basis (for percentage calculations)
    allocation_basis DECIMAL(15,2), -- Square footage, rental value, etc.
    
    -- Notes
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    UNIQUE(expense_transaction_id, property_id)
);

-- Property expense consolidation view
CREATE OR REPLACE VIEW property_expense_consolidation AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    
    -- Direct expenses (property-specific)
    COALESCE(direct_expenses.total_amount, 0) as direct_expenses_kes,
    COALESCE(direct_expenses.transaction_count, 0) as direct_expense_count,
    
    -- Allocated expenses (shared expenses allocated to this property)
    COALESCE(allocated_expenses.total_allocated, 0) as allocated_expenses_kes,
    COALESCE(allocated_expenses.allocation_count, 0) as allocated_expense_count,
    
    -- Grand total
    COALESCE(direct_expenses.total_amount, 0) + COALESCE(allocated_expenses.total_allocated, 0) as grand_total_expenses_kes,
    
    -- Current month expenses
    COALESCE(current_month.total_amount, 0) as current_month_expenses_kes,
    
    -- Last month expenses
    COALESCE(last_month.total_amount, 0) as last_month_expenses_kes,
    
    -- Year to date expenses
    COALESCE(ytd_expenses.total_amount, 0) as ytd_expenses_kes

FROM properties p

-- Direct expenses subquery
LEFT JOIN (
    SELECT 
        property_id,
        SUM(amount_kes) as total_amount,
        COUNT(*) as transaction_count
    FROM expense_transactions
    WHERE property_id IS NOT NULL
      AND status = 'PAID'
    GROUP BY property_id
) direct_expenses ON p.id = direct_expenses.property_id

-- Allocated expenses subquery
LEFT JOIN (
    SELECT 
        ea.property_id,
        SUM(ea.allocated_amount_kes) as total_allocated,
        COUNT(*) as allocation_count
    FROM expense_allocations ea
    JOIN expense_transactions et ON ea.expense_transaction_id = et.id
    WHERE et.status = 'PAID'
    GROUP BY ea.property_id
) allocated_expenses ON p.id = allocated_expenses.property_id

-- Current month expenses
LEFT JOIN (
    SELECT 
        property_id,
        SUM(amount_kes) as total_amount
    FROM expense_transactions
    WHERE property_id IS NOT NULL
      AND status = 'PAID'
      AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY property_id
) current_month ON p.id = current_month.property_id

-- Last month expenses
LEFT JOIN (
    SELECT 
        property_id,
        SUM(amount_kes) as total_amount
    FROM expense_transactions
    WHERE property_id IS NOT NULL
      AND status = 'PAID'
      AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    GROUP BY property_id
) last_month ON p.id = last_month.property_id

-- Year to date expenses
LEFT JOIN (
    SELECT 
        property_id,
        SUM(amount_kes) as total_amount
    FROM expense_transactions
    WHERE property_id IS NOT NULL
      AND status = 'PAID'
      AND DATE_TRUNC('year', transaction_date) = DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY property_id
) ytd_expenses ON p.id = ytd_expenses.property_id

WHERE p.lifecycle_status = 'ACTIVE'
ORDER BY grand_total_expenses_kes DESC;

-- Insert default expense categories
INSERT INTO expense_categories (category_name, subcategory, display_name, description, is_allocatable, sort_order) VALUES
('PROPERTY_SPECIFIC', 'MAINTENANCE', 'Property Maintenance', 'Property-specific maintenance and repairs', false, 1),
('PROPERTY_SPECIFIC', 'UTILITIES', 'Property Utilities', 'Water, electricity, gas for specific properties', false, 2),
('PROPERTY_SPECIFIC', 'INSURANCE', 'Property Insurance', 'Insurance for specific properties', false, 3),
('GENERAL_BUSINESS', 'OFFICE_RENT', 'Office Rent', 'Business office rental expenses', true, 4),
('GENERAL_BUSINESS', 'SALARIES', 'Staff Salaries', 'Employee salaries and wages', true, 5),
('SHARED_ALLOCATED', 'MANAGEMENT_FEES', 'Management Fees', 'Property management fees to be allocated', true, 6),
('MAINTENANCE_REPAIRS', 'PLUMBING', 'Plumbing Repairs', 'Plumbing maintenance and repairs', false, 7),
('MAINTENANCE_REPAIRS', 'ELECTRICAL', 'Electrical Repairs', 'Electrical maintenance and repairs', false, 8),
('UTILITIES', 'WATER_SEWER', 'Water & Sewer', 'Water and sewer utility bills', false, 9),
('UTILITIES', 'ELECTRICITY', 'Electricity', 'Electrical utility bills', false, 10),
('PROFESSIONAL_SERVICES', 'LEGAL_FEES', 'Legal Fees', 'Legal and attorney fees', true, 11),
('PROFESSIONAL_SERVICES', 'ACCOUNTING', 'Accounting Fees', 'Accounting and bookkeeping services', true, 12),
('MARKETING_ADVERTISING', 'ONLINE_ADS', 'Online Advertising', 'Digital marketing and online ads', true, 13),
('ADMINISTRATIVE', 'OFFICE_SUPPLIES', 'Office Supplies', 'General office supplies and materials', true, 14),
('OTHER_EXPENSES', 'MISCELLANEOUS', 'Miscellaneous', 'Other miscellaneous expenses', false, 15)
ON CONFLICT (category_name, subcategory) DO NOTHING;

-- Insert sample vendors
INSERT INTO vendors (vendor_name, vendor_type, is_active) VALUES
('ABC Plumbing Services', 'MAINTENANCE', true),
('City Water Department', 'UTILITIES', true),
('Kenya Power & Lighting', 'UTILITIES', true),
('Elite Property Management', 'PROFESSIONAL_SERVICES', true),
('Quick Fix Repairs', 'MAINTENANCE', true),
('Office Depot Kenya', 'SUPPLIES', true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense_categories' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON expense_categories FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON vendors FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense_transactions' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON expense_transactions FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expense_allocations' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON expense_allocations FOR ALL USING (true);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_transactions_category ON expense_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_vendor ON expense_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_property ON expense_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_date ON expense_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_status ON expense_transactions(status);

CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense ON expense_allocations(expense_transaction_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_property ON expense_allocations(property_id);

-- Verification query
SELECT 
    'expense_categories' as table_name,
    COUNT(*) as record_count
FROM expense_categories
UNION ALL
SELECT 
    'vendors' as table_name,
    COUNT(*) as record_count
FROM vendors
UNION ALL
SELECT 
    'expense_transactions' as table_name,
    COUNT(*) as record_count
FROM expense_transactions
UNION ALL
SELECT 
    'expense_allocations' as table_name,
    COUNT(*) as record_count
FROM expense_allocations;
