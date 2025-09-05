-- Migration 072: Enhanced Expense Management System
-- Description: Comprehensive expense tracking with intelligent consolidation of property-specific costs
-- and general business expense management with smart allocation capabilities

-- Create expense categories enum
CREATE TYPE expense_category_type AS ENUM (
  'PROPERTY_SPECIFIC',
  'GENERAL_BUSINESS',
  'SHARED_ALLOCATED'
);

-- Create expense subcategory enum
CREATE TYPE expense_subcategory_type AS ENUM (
  -- Property-specific subcategories
  'ACQUISITION_COST',
  'HANDOVER_COST',
  'SUBDIVISION_COST',
  'MAINTENANCE_REPAIR',
  'PROPERTY_MANAGEMENT',
  'PROPERTY_INSURANCE',
  'PROPERTY_TAXES',
  'UTILITIES',
  
  -- General business subcategories
  'OFFICE_RENT',
  'OFFICE_UTILITIES',
  'OFFICE_SUPPLIES',
  'TRANSPORTATION',
  'FUEL',
  'VEHICLE_MAINTENANCE',
  'PROFESSIONAL_SERVICES',
  'LEGAL_FEES',
  'ACCOUNTING_FEES',
  'CONSULTING_FEES',
  'MARKETING_ADVERTISING',
  'TECHNOLOGY',
  'SOFTWARE_SUBSCRIPTIONS',
  'HARDWARE_EQUIPMENT',
  'TELECOMMUNICATIONS',
  'BUSINESS_INSURANCE',
  'EMPLOYEE_SALARIES',
  'EMPLOYEE_BENEFITS',
  'TRAINING_DEVELOPMENT',
  'TRAVEL_ACCOMMODATION',
  'BANK_CHARGES',
  'INTEREST_EXPENSE',
  
  -- Shared/allocated subcategories
  'MANAGEMENT_OVERHEAD',
  'ADMINISTRATIVE_COSTS',
  'SHARED_UTILITIES',
  'SHARED_INSURANCE',
  'SHARED_SERVICES',
  'MISCELLANEOUS'
);

-- Create expense status enum
CREATE TYPE expense_status_type AS ENUM (
  'PENDING',
  'APPROVED',
  'PAID',
  'REJECTED',
  'CANCELLED'
);

-- Create allocation method enum
CREATE TYPE allocation_method_type AS ENUM (
  'EQUAL',        -- Equal distribution across properties
  'VALUE',        -- Based on property values
  'INCOME',       -- Based on rental income
  'UNITS',        -- Based on number of units
  'ACTIVITY',     -- Based on activity/usage
  'MANUAL'        -- Manual allocation percentages
);

-- Expense categories configuration table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name expense_category_type NOT NULL,
  subcategory expense_subcategory_type NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  requires_allocation BOOLEAN DEFAULT FALSE,
  default_allocation_method allocation_method_type DEFAULT 'MANUAL',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique category-subcategory combinations
  UNIQUE(category_name, subcategory)
);

-- Vendors/suppliers management table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name VARCHAR(200) NOT NULL,
  vendor_code VARCHAR(50) UNIQUE,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Kenya',
  
  -- Business details
  vendor_type VARCHAR(50), -- 'CONTRACTOR', 'SUPPLIER', 'SERVICE_PROVIDER', 'PROFESSIONAL'
  tax_id VARCHAR(50), -- KRA PIN or business registration
  payment_terms VARCHAR(50), -- 'NET_30', 'NET_15', 'COD', etc.
  credit_limit_kes DECIMAL(15,2) DEFAULT 0,
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main expense transactions table
CREATE TABLE IF NOT EXISTS expense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  
  -- Related entities (nullable based on expense type)
  property_id UUID REFERENCES properties(id), -- For property-specific expenses
  vendor_id UUID REFERENCES vendors(id),
  
  -- Transaction details
  amount_kes DECIMAL(15,2) NOT NULL CHECK (amount_kes > 0),
  transaction_date DATE NOT NULL,
  due_date DATE, -- For pending payments
  paid_date DATE, -- When actually paid
  
  -- Transaction metadata
  description TEXT NOT NULL,
  invoice_number VARCHAR(100),
  receipt_number VARCHAR(100),
  reference_number VARCHAR(100),
  payment_method VARCHAR(50), -- 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY'
  
  -- Approval workflow
  status expense_status_type DEFAULT 'PENDING',
  requested_by UUID REFERENCES enhanced_users(id),
  approved_by UUID REFERENCES enhanced_users(id),
  approval_date DATE,
  
  -- Allocation details
  requires_allocation BOOLEAN DEFAULT FALSE,
  is_allocated BOOLEAN DEFAULT FALSE,
  allocation_method allocation_method_type,
  
  -- Metadata
  notes TEXT,
  attachments JSONB, -- Array of file URLs/paths
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id),
  
  -- Constraints
  CHECK (paid_date IS NULL OR paid_date >= transaction_date),
  CHECK (due_date IS NULL OR due_date >= transaction_date),
  CHECK (approval_date IS NULL OR approval_date >= transaction_date)
);

-- Expense allocation tracking table
CREATE TABLE IF NOT EXISTS expense_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expense_transactions(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id),
  
  -- Allocation details
  allocation_percentage DECIMAL(5,2) NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  allocated_amount_kes DECIMAL(15,2) NOT NULL CHECK (allocated_amount_kes >= 0),
  allocation_method allocation_method_type NOT NULL,
  
  -- Allocation basis (for audit trail)
  allocation_basis JSONB, -- Store the basis for allocation (property value, income, etc.)
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id),
  
  -- Ensure allocations don't exceed 100%
  CONSTRAINT valid_allocation_percentage CHECK (allocation_percentage <= 100)
);

-- Property expense consolidation view
CREATE OR REPLACE VIEW property_expense_consolidation AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  
  -- Direct property expenses
  COALESCE(SUM(et.amount_kes) FILTER (WHERE et.property_id = p.id), 0) as direct_expenses_kes,
  
  -- Allocated shared expenses
  COALESCE(SUM(ea.allocated_amount_kes), 0) as allocated_expenses_kes,
  
  -- Total property expenses
  COALESCE(SUM(et.amount_kes) FILTER (WHERE et.property_id = p.id), 0) + 
  COALESCE(SUM(ea.allocated_amount_kes), 0) as total_expenses_kes,
  
  -- Acquisition costs (from existing system)
  COALESCE(SUM(pac.amount_kes), 0) as acquisition_costs_kes,
  
  -- Handover costs (from existing system)
  COALESCE(SUM(phc.amount_kes), 0) as handover_costs_kes,
  
  -- Maintenance costs
  COALESCE(SUM(et.amount_kes) FILTER (WHERE ec.subcategory = 'MAINTENANCE_REPAIR'), 0) as maintenance_costs_kes,
  
  -- Grand total including legacy costs
  COALESCE(SUM(et.amount_kes) FILTER (WHERE et.property_id = p.id), 0) + 
  COALESCE(SUM(ea.allocated_amount_kes), 0) +
  COALESCE(SUM(pac.amount_kes), 0) +
  COALESCE(SUM(phc.amount_kes), 0) as grand_total_expenses_kes

FROM properties p
LEFT JOIN expense_transactions et ON p.id = et.property_id AND et.status = 'PAID'
LEFT JOIN expense_allocations ea ON p.id = ea.property_id
LEFT JOIN expense_categories ec ON et.category_id = ec.id
LEFT JOIN property_acquisition_costs pac ON p.id = pac.property_id
LEFT JOIN property_handover_costs phc ON p.id = phc.property_id
WHERE p.lifecycle_status = 'ACTIVE'
GROUP BY p.id, p.name;

-- Business expense summary view
CREATE OR REPLACE VIEW business_expense_summary AS
SELECT 
  ec.category_name,
  ec.subcategory,
  ec.display_name,
  COUNT(et.id) as transaction_count,
  SUM(et.amount_kes) as total_amount_kes,
  AVG(et.amount_kes) as average_amount_kes,
  MIN(et.transaction_date) as earliest_date,
  MAX(et.transaction_date) as latest_date
FROM expense_categories ec
LEFT JOIN expense_transactions et ON ec.id = et.category_id AND et.status = 'PAID'
WHERE ec.is_active = true
GROUP BY ec.id, ec.category_name, ec.subcategory, ec.display_name, ec.sort_order
ORDER BY ec.sort_order, ec.display_name;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_transactions_category ON expense_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_property ON expense_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_vendor ON expense_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_date ON expense_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_status ON expense_transactions(status);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_allocation ON expense_transactions(requires_allocation, is_allocated);

CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense ON expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_property ON expense_allocations(property_id);

CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(vendor_type);

-- Insert default expense categories
INSERT INTO expense_categories (category_name, subcategory, display_name, description, requires_allocation, default_allocation_method, sort_order) VALUES
-- Property-specific categories
('PROPERTY_SPECIFIC', 'ACQUISITION_COST', 'Acquisition Costs', 'Property purchase and acquisition related costs', false, 'MANUAL', 10),
('PROPERTY_SPECIFIC', 'HANDOVER_COST', 'Handover Costs', 'Property handover and transfer costs', false, 'MANUAL', 11),
('PROPERTY_SPECIFIC', 'SUBDIVISION_COST', 'Subdivision Costs', 'Property subdivision and development costs', false, 'MANUAL', 12),
('PROPERTY_SPECIFIC', 'MAINTENANCE_REPAIR', 'Maintenance & Repairs', 'Property maintenance and repair expenses', false, 'MANUAL', 13),
('PROPERTY_SPECIFIC', 'PROPERTY_MANAGEMENT', 'Property Management', 'Property management fees and costs', false, 'MANUAL', 14),
('PROPERTY_SPECIFIC', 'PROPERTY_INSURANCE', 'Property Insurance', 'Insurance premiums for properties', false, 'MANUAL', 15),
('PROPERTY_SPECIFIC', 'PROPERTY_TAXES', 'Property Taxes', 'Land rates and property taxes', false, 'MANUAL', 16),
('PROPERTY_SPECIFIC', 'UTILITIES', 'Property Utilities', 'Utilities for vacant or common areas', false, 'MANUAL', 17),

-- General business categories
('GENERAL_BUSINESS', 'OFFICE_RENT', 'Office Rent', 'Office space rental costs', true, 'EQUAL', 20),
('GENERAL_BUSINESS', 'OFFICE_UTILITIES', 'Office Utilities', 'Office electricity, water, internet', true, 'EQUAL', 21),
('GENERAL_BUSINESS', 'OFFICE_SUPPLIES', 'Office Supplies', 'Stationery, equipment, and office supplies', true, 'EQUAL', 22),
('GENERAL_BUSINESS', 'TRANSPORTATION', 'Transportation', 'Public transport and travel costs', true, 'ACTIVITY', 23),
('GENERAL_BUSINESS', 'FUEL', 'Fuel', 'Vehicle fuel and transportation fuel', true, 'ACTIVITY', 24),
('GENERAL_BUSINESS', 'VEHICLE_MAINTENANCE', 'Vehicle Maintenance', 'Vehicle repairs and maintenance', true, 'ACTIVITY', 25),
('GENERAL_BUSINESS', 'PROFESSIONAL_SERVICES', 'Professional Services', 'General professional service fees', true, 'VALUE', 26),
('GENERAL_BUSINESS', 'LEGAL_FEES', 'Legal Fees', 'Legal consultation and services', true, 'VALUE', 27),
('GENERAL_BUSINESS', 'ACCOUNTING_FEES', 'Accounting Fees', 'Accounting and bookkeeping services', true, 'EQUAL', 28),
('GENERAL_BUSINESS', 'CONSULTING_FEES', 'Consulting Fees', 'Business consulting and advisory fees', true, 'VALUE', 29),
('GENERAL_BUSINESS', 'MARKETING_ADVERTISING', 'Marketing & Advertising', 'Marketing and promotional expenses', true, 'INCOME', 30),
('GENERAL_BUSINESS', 'TECHNOLOGY', 'Technology', 'General technology expenses', true, 'EQUAL', 31),
('GENERAL_BUSINESS', 'SOFTWARE_SUBSCRIPTIONS', 'Software Subscriptions', 'Software licenses and subscriptions', true, 'EQUAL', 32),
('GENERAL_BUSINESS', 'HARDWARE_EQUIPMENT', 'Hardware & Equipment', 'Computer hardware and office equipment', true, 'EQUAL', 33),
('GENERAL_BUSINESS', 'TELECOMMUNICATIONS', 'Telecommunications', 'Phone, internet, and communication costs', true, 'EQUAL', 34),
('GENERAL_BUSINESS', 'BUSINESS_INSURANCE', 'Business Insurance', 'General business insurance premiums', true, 'VALUE', 35),
('GENERAL_BUSINESS', 'EMPLOYEE_SALARIES', 'Employee Salaries', 'Staff salaries and wages', true, 'INCOME', 36),
('GENERAL_BUSINESS', 'EMPLOYEE_BENEFITS', 'Employee Benefits', 'Staff benefits and allowances', true, 'INCOME', 37),
('GENERAL_BUSINESS', 'TRAINING_DEVELOPMENT', 'Training & Development', 'Staff training and development costs', true, 'EQUAL', 38),
('GENERAL_BUSINESS', 'TRAVEL_ACCOMMODATION', 'Travel & Accommodation', 'Business travel and accommodation', true, 'ACTIVITY', 39),
('GENERAL_BUSINESS', 'BANK_CHARGES', 'Bank Charges', 'Banking fees and transaction charges', true, 'INCOME', 40),
('GENERAL_BUSINESS', 'INTEREST_EXPENSE', 'Interest Expense', 'Loan interest and financing costs', true, 'VALUE', 41),

-- Shared/allocated categories
('SHARED_ALLOCATED', 'MANAGEMENT_OVERHEAD', 'Management Overhead', 'General management and administrative overhead', true, 'INCOME', 50),
('SHARED_ALLOCATED', 'ADMINISTRATIVE_COSTS', 'Administrative Costs', 'General administrative expenses', true, 'EQUAL', 51),
('SHARED_ALLOCATED', 'SHARED_UTILITIES', 'Shared Utilities', 'Utilities shared across multiple properties', true, 'UNITS', 52),
('SHARED_ALLOCATED', 'SHARED_INSURANCE', 'Shared Insurance', 'Insurance covering multiple properties', true, 'VALUE', 53),
('SHARED_ALLOCATED', 'SHARED_SERVICES', 'Shared Services', 'Services benefiting multiple properties', true, 'VALUE', 54),
('SHARED_ALLOCATED', 'MISCELLANEOUS', 'Miscellaneous', 'Other miscellaneous business expenses', true, 'EQUAL', 55);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories (read-only for all authenticated users)
CREATE POLICY "expense_categories_select" ON expense_categories FOR SELECT TO authenticated USING (true);

-- RLS Policies for vendors
CREATE POLICY "vendors_select" ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendors_insert" ON vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vendors_update" ON vendors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "vendors_delete" ON vendors FOR DELETE TO authenticated USING (true);

-- RLS Policies for expense_transactions
CREATE POLICY "expense_transactions_select" ON expense_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "expense_transactions_insert" ON expense_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expense_transactions_update" ON expense_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "expense_transactions_delete" ON expense_transactions FOR DELETE TO authenticated USING (true);

-- RLS Policies for expense_allocations
CREATE POLICY "expense_allocations_select" ON expense_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "expense_allocations_insert" ON expense_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expense_allocations_update" ON expense_allocations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "expense_allocations_delete" ON expense_allocations FOR DELETE TO authenticated USING (true);

-- Add comments for documentation
COMMENT ON TABLE expense_categories IS 'Configuration table for expense categories and subcategories with allocation settings';
COMMENT ON TABLE vendors IS 'Vendor and supplier management with contact and business details';
COMMENT ON TABLE expense_transactions IS 'Main table for tracking all business expenses with approval workflow';
COMMENT ON TABLE expense_allocations IS 'Allocation of shared expenses across properties with detailed tracking';
COMMENT ON VIEW property_expense_consolidation IS 'Consolidated view of all property-related expenses including legacy costs';
COMMENT ON VIEW business_expense_summary IS 'Summary view of business expenses by category and subcategory';
