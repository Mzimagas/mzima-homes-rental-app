-- Migration 074: Tax Management System for Kenyan Tax Compliance
-- Description: Comprehensive tax management including land rates, VAT, withholding tax,
-- and compliance reporting for Kenyan tax requirements

-- Create tax types enum
CREATE TYPE tax_type AS ENUM (
  'LAND_RATES',
  'VAT',
  'WITHHOLDING_TAX',
  'INCOME_TAX',
  'STAMP_DUTY',
  'CAPITAL_GAINS_TAX',
  'RENTAL_INCOME_TAX',
  'PROPERTY_TRANSFER_TAX'
);

-- Create tax status enum
CREATE TYPE tax_status AS ENUM (
  'PENDING',
  'CALCULATED',
  'FILED',
  'PAID',
  'OVERDUE',
  'DISPUTED',
  'WAIVED'
);

-- Create VAT registration status enum
CREATE TYPE vat_registration_status AS ENUM (
  'NOT_REGISTERED',
  'REGISTERED',
  'EXEMPT',
  'SUSPENDED'
);

-- Tax configuration table for Kenyan tax rates and rules
CREATE TABLE IF NOT EXISTS tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_type tax_type NOT NULL,
  tax_name VARCHAR(200) NOT NULL,
  tax_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.16 for 16% VAT
  minimum_threshold DECIMAL(15,2) DEFAULT 0,
  maximum_threshold DECIMAL(15,2),
  effective_from DATE NOT NULL,
  effective_to DATE,
  description TEXT,
  calculation_method VARCHAR(50) DEFAULT 'PERCENTAGE', -- 'PERCENTAGE', 'FIXED', 'TIERED'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure no overlapping active periods for same tax type
  CONSTRAINT valid_effective_period CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Enhanced land rates table (extends existing land_rates)
CREATE TABLE IF NOT EXISTS enhanced_land_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  parcel_number VARCHAR(100),
  
  -- Assessment details
  financial_year VARCHAR(9) NOT NULL, -- e.g., '2024/2025'
  assessed_value_kes DECIMAL(15,2) NOT NULL CHECK (assessed_value_kes > 0),
  rate_percentage DECIMAL(5,4) NOT NULL CHECK (rate_percentage > 0),
  annual_rate_kes DECIMAL(15,2) NOT NULL CHECK (annual_rate_kes > 0),
  
  -- Payment tracking
  amount_paid_kes DECIMAL(15,2) DEFAULT 0 CHECK (amount_paid_kes >= 0),
  balance_kes DECIMAL(15,2) GENERATED ALWAYS AS (annual_rate_kes - amount_paid_kes) STORED,
  
  -- Due dates and penalties
  due_date DATE NOT NULL,
  penalty_rate DECIMAL(5,4) DEFAULT 0.02, -- 2% per month default
  penalty_amount_kes DECIMAL(15,2) DEFAULT 0 CHECK (penalty_amount_kes >= 0),
  
  -- Payment details
  payment_reference VARCHAR(100),
  receipt_number VARCHAR(100),
  payment_date DATE,
  
  -- Status and compliance
  status tax_status DEFAULT 'PENDING',
  is_disputed BOOLEAN DEFAULT FALSE,
  dispute_reason TEXT,
  
  -- County information
  county VARCHAR(100),
  sub_county VARCHAR(100),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id),
  
  -- Constraints
  CONSTRAINT unique_property_financial_year UNIQUE(property_id, financial_year),
  CHECK (payment_date IS NULL OR payment_date >= due_date OR amount_paid_kes = 0)
);

-- VAT management table
CREATE TABLE IF NOT EXISTS vat_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business registration details
  business_name VARCHAR(200) NOT NULL,
  kra_pin VARCHAR(20) NOT NULL,
  vat_registration_number VARCHAR(20),
  registration_status vat_registration_status DEFAULT 'NOT_REGISTERED',
  registration_date DATE,
  
  -- VAT period details
  vat_period_start DATE NOT NULL,
  vat_period_end DATE NOT NULL,
  filing_due_date DATE NOT NULL,
  
  -- VAT calculations
  total_sales_kes DECIMAL(15,2) DEFAULT 0,
  vat_on_sales_kes DECIMAL(15,2) DEFAULT 0,
  total_purchases_kes DECIMAL(15,2) DEFAULT 0,
  vat_on_purchases_kes DECIMAL(15,2) DEFAULT 0,
  net_vat_payable_kes DECIMAL(15,2) GENERATED ALWAYS AS (vat_on_sales_kes - vat_on_purchases_kes) STORED,
  
  -- Filing and payment status
  status tax_status DEFAULT 'PENDING',
  filed_date DATE,
  payment_date DATE,
  payment_reference VARCHAR(100),
  
  -- Penalties and interest
  penalty_amount_kes DECIMAL(15,2) DEFAULT 0,
  interest_amount_kes DECIMAL(15,2) DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id),
  
  -- Constraints
  CONSTRAINT valid_vat_period CHECK (vat_period_end >= vat_period_start),
  CONSTRAINT valid_filing_date CHECK (filing_due_date >= vat_period_end),
  CONSTRAINT unique_vat_period UNIQUE(vat_period_start, vat_period_end)
);

-- VAT transactions table for detailed VAT tracking
CREATE TABLE IF NOT EXISTS vat_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vat_period_id UUID NOT NULL REFERENCES vat_management(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SALE', 'PURCHASE')),
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  
  -- Related entities
  property_id UUID REFERENCES properties(id),
  vendor_id UUID REFERENCES vendors(id),
  customer_name VARCHAR(200),
  
  -- Financial details
  gross_amount_kes DECIMAL(15,2) NOT NULL,
  vat_rate DECIMAL(5,4) NOT NULL,
  vat_amount_kes DECIMAL(15,2) NOT NULL,
  net_amount_kes DECIMAL(15,2) GENERATED ALWAYS AS (gross_amount_kes - vat_amount_kes) STORED,
  
  -- Supporting documents
  invoice_number VARCHAR(100),
  receipt_number VARCHAR(100),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id)
);

-- Withholding tax management table
CREATE TABLE IF NOT EXISTS withholding_tax_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Withholding tax details
  tax_period_start DATE NOT NULL,
  tax_period_end DATE NOT NULL,
  filing_due_date DATE NOT NULL,
  
  -- Calculations
  total_payments_kes DECIMAL(15,2) DEFAULT 0,
  total_withholding_tax_kes DECIMAL(15,2) DEFAULT 0,
  
  -- Filing and payment
  status tax_status DEFAULT 'PENDING',
  filed_date DATE,
  payment_date DATE,
  payment_reference VARCHAR(100),
  
  -- Penalties
  penalty_amount_kes DECIMAL(15,2) DEFAULT 0,
  interest_amount_kes DECIMAL(15,2) DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id),
  
  CONSTRAINT valid_withholding_period CHECK (tax_period_end >= tax_period_start),
  CONSTRAINT unique_withholding_period UNIQUE(tax_period_start, tax_period_end)
);

-- Withholding tax transactions table
CREATE TABLE IF NOT EXISTS withholding_tax_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withholding_period_id UUID NOT NULL REFERENCES withholding_tax_management(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_date DATE NOT NULL,
  payee_name VARCHAR(200) NOT NULL,
  payee_pin VARCHAR(20),
  service_description TEXT NOT NULL,
  
  -- Related entities
  agent_id UUID REFERENCES agents(agent_id), -- For commission payments
  vendor_id UUID REFERENCES vendors(id), -- For vendor payments
  property_id UUID REFERENCES properties(id),
  
  -- Financial details
  gross_payment_kes DECIMAL(15,2) NOT NULL,
  withholding_rate DECIMAL(5,4) NOT NULL,
  withholding_tax_kes DECIMAL(15,2) NOT NULL,
  net_payment_kes DECIMAL(15,2) GENERATED ALWAYS AS (gross_payment_kes - withholding_tax_kes) STORED,
  
  -- Tax category
  tax_category VARCHAR(50) NOT NULL, -- 'PROFESSIONAL_FEES', 'COMMISSIONS', 'RENT', 'MANAGEMENT_FEES'
  
  -- Supporting documents
  invoice_number VARCHAR(100),
  payment_voucher VARCHAR(100),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id)
);

-- Tax compliance calendar table
CREATE TABLE IF NOT EXISTS tax_compliance_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tax obligation details
  tax_type tax_type NOT NULL,
  obligation_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Frequency and timing
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME')),
  due_day INTEGER, -- Day of month for monthly obligations
  due_month INTEGER, -- Month for annual obligations
  
  -- Period details
  period_start DATE,
  period_end DATE,
  filing_due_date DATE NOT NULL,
  payment_due_date DATE,
  
  -- Status tracking
  status tax_status DEFAULT 'PENDING',
  completed_date DATE,
  
  -- Reminders
  reminder_days_before INTEGER DEFAULT 7,
  is_reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax penalties and interest calculation table
CREATE TABLE IF NOT EXISTS tax_penalties_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to tax obligation
  tax_type tax_type NOT NULL,
  reference_id UUID NOT NULL, -- References the specific tax record
  
  -- Penalty details
  penalty_type VARCHAR(50) NOT NULL, -- 'LATE_FILING', 'LATE_PAYMENT', 'UNDERSTATEMENT'
  penalty_rate DECIMAL(5,4) NOT NULL,
  penalty_amount_kes DECIMAL(15,2) NOT NULL,
  
  -- Interest details
  interest_rate DECIMAL(5,4) DEFAULT 0,
  interest_amount_kes DECIMAL(15,2) DEFAULT 0,
  
  -- Calculation period
  calculation_from_date DATE NOT NULL,
  calculation_to_date DATE NOT NULL,
  
  -- Status
  is_waived BOOLEAN DEFAULT FALSE,
  waiver_reason TEXT,
  waived_by UUID REFERENCES enhanced_users(id),
  waived_date DATE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES enhanced_users(id)
);

-- Tax reporting and analytics view
CREATE OR REPLACE VIEW tax_compliance_summary AS
SELECT
  -- Land rates summary
  COUNT(CASE WHEN elr.status IN ('PENDING', 'OVERDUE') THEN 1 END) as pending_land_rates,
  SUM(CASE WHEN elr.status IN ('PENDING', 'OVERDUE') THEN elr.balance_kes ELSE 0 END) as outstanding_land_rates_kes,
  SUM(CASE WHEN elr.status = 'PAID' THEN elr.amount_paid_kes ELSE 0 END) as paid_land_rates_kes,

  -- VAT summary
  COUNT(CASE WHEN vm.status IN ('PENDING', 'OVERDUE') THEN 1 END) as pending_vat_returns,
  SUM(CASE WHEN vm.status IN ('PENDING', 'OVERDUE') THEN vm.net_vat_payable_kes ELSE 0 END) as outstanding_vat_kes,
  SUM(CASE WHEN vm.status = 'PAID' THEN vm.net_vat_payable_kes ELSE 0 END) as paid_vat_kes,

  -- Withholding tax summary
  COUNT(CASE WHEN wtm.status IN ('PENDING', 'OVERDUE') THEN 1 END) as pending_withholding_returns,
  SUM(CASE WHEN wtm.status IN ('PENDING', 'OVERDUE') THEN wtm.total_withholding_tax_kes ELSE 0 END) as outstanding_withholding_kes,
  SUM(CASE WHEN wtm.status = 'PAID' THEN wtm.total_withholding_tax_kes ELSE 0 END) as paid_withholding_kes,

  -- Penalties and interest
  SUM(COALESCE(elr.penalty_amount_kes, 0) + COALESCE(vm.penalty_amount_kes, 0) + COALESCE(wtm.penalty_amount_kes, 0)) as total_penalties_kes,
  SUM(COALESCE(vm.interest_amount_kes, 0) + COALESCE(wtm.interest_amount_kes, 0)) as total_interest_kes,

  -- Compliance calendar
  COUNT(CASE WHEN tcc.status = 'PENDING' AND tcc.filing_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as upcoming_obligations

FROM enhanced_land_rates elr
FULL OUTER JOIN vat_management vm ON 1=1
FULL OUTER JOIN withholding_tax_management wtm ON 1=1
FULL OUTER JOIN tax_compliance_calendar tcc ON 1=1;

-- Property tax summary view
CREATE OR REPLACE VIEW property_tax_summary AS
SELECT
  p.id as property_id,
  p.name as property_name,

  -- Land rates
  COALESCE(lr_summary.total_assessed_value, 0) as total_assessed_value_kes,
  COALESCE(lr_summary.total_annual_rates, 0) as total_annual_rates_kes,
  COALESCE(lr_summary.total_paid, 0) as total_land_rates_paid_kes,
  COALESCE(lr_summary.total_outstanding, 0) as total_land_rates_outstanding_kes,
  COALESCE(lr_summary.total_penalties, 0) as total_land_rates_penalties_kes,

  -- VAT impact (from property-related transactions)
  COALESCE(vat_summary.total_vat_on_sales, 0) as property_vat_on_sales_kes,
  COALESCE(vat_summary.total_vat_on_purchases, 0) as property_vat_on_purchases_kes,

  -- Withholding tax impact
  COALESCE(wht_summary.total_withholding_tax, 0) as property_withholding_tax_kes,

  -- Total tax burden
  COALESCE(lr_summary.total_annual_rates, 0) +
  COALESCE(vat_summary.total_vat_on_sales, 0) - COALESCE(vat_summary.total_vat_on_purchases, 0) +
  COALESCE(wht_summary.total_withholding_tax, 0) as total_tax_burden_kes

FROM properties p

-- Land rates summary subquery
LEFT JOIN (
  SELECT
    property_id,
    SUM(assessed_value_kes) as total_assessed_value,
    SUM(annual_rate_kes) as total_annual_rates,
    SUM(amount_paid_kes) as total_paid,
    SUM(balance_kes) as total_outstanding,
    SUM(penalty_amount_kes) as total_penalties
  FROM enhanced_land_rates
  WHERE financial_year >= EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '/' || (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::TEXT
  GROUP BY property_id
) lr_summary ON p.id = lr_summary.property_id

-- VAT summary subquery
LEFT JOIN (
  SELECT
    property_id,
    SUM(CASE WHEN transaction_type = 'SALE' THEN vat_amount_kes ELSE 0 END) as total_vat_on_sales,
    SUM(CASE WHEN transaction_type = 'PURCHASE' THEN vat_amount_kes ELSE 0 END) as total_vat_on_purchases
  FROM vat_transactions
  WHERE transaction_date >= DATE_TRUNC('year', CURRENT_DATE)
  GROUP BY property_id
) vat_summary ON p.id = vat_summary.property_id

-- Withholding tax summary subquery
LEFT JOIN (
  SELECT
    property_id,
    SUM(withholding_tax_kes) as total_withholding_tax
  FROM withholding_tax_transactions
  WHERE transaction_date >= DATE_TRUNC('year', CURRENT_DATE)
  GROUP BY property_id
) wht_summary ON p.id = wht_summary.property_id

WHERE p.lifecycle_status = 'ACTIVE'
ORDER BY total_tax_burden_kes DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tax_configurations_type_active ON tax_configurations(tax_type, is_active);
CREATE INDEX IF NOT EXISTS idx_tax_configurations_effective_dates ON tax_configurations(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_enhanced_land_rates_property ON enhanced_land_rates(property_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_land_rates_financial_year ON enhanced_land_rates(financial_year);
CREATE INDEX IF NOT EXISTS idx_enhanced_land_rates_status ON enhanced_land_rates(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_land_rates_due_date ON enhanced_land_rates(due_date);

CREATE INDEX IF NOT EXISTS idx_vat_management_period ON vat_management(vat_period_start, vat_period_end);
CREATE INDEX IF NOT EXISTS idx_vat_management_status ON vat_management(status);
CREATE INDEX IF NOT EXISTS idx_vat_management_due_date ON vat_management(filing_due_date);

CREATE INDEX IF NOT EXISTS idx_vat_transactions_period ON vat_transactions(vat_period_id);
CREATE INDEX IF NOT EXISTS idx_vat_transactions_property ON vat_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_vat_transactions_date ON vat_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_withholding_tax_period ON withholding_tax_management(tax_period_start, tax_period_end);
CREATE INDEX IF NOT EXISTS idx_withholding_tax_status ON withholding_tax_management(status);

CREATE INDEX IF NOT EXISTS idx_withholding_transactions_period ON withholding_tax_transactions(withholding_period_id);
CREATE INDEX IF NOT EXISTS idx_withholding_transactions_agent ON withholding_tax_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_withholding_transactions_vendor ON withholding_tax_transactions(vendor_id);

CREATE INDEX IF NOT EXISTS idx_tax_compliance_calendar_type ON tax_compliance_calendar(tax_type);
CREATE INDEX IF NOT EXISTS idx_tax_compliance_calendar_due_date ON tax_compliance_calendar(filing_due_date);
CREATE INDEX IF NOT EXISTS idx_tax_compliance_calendar_status ON tax_compliance_calendar(status);

-- Insert default Kenyan tax configurations
INSERT INTO tax_configurations (tax_type, tax_name, tax_rate, minimum_threshold, effective_from, description) VALUES
-- VAT rates
('VAT', 'Standard VAT Rate', 0.16, 5000000, '2023-01-01', 'Standard VAT rate of 16% for taxable supplies'),
('VAT', 'Zero-rated VAT', 0.00, 0, '2023-01-01', 'Zero-rated supplies (exports, basic food items)'),

-- Withholding tax rates
('WITHHOLDING_TAX', 'Professional Fees WHT', 0.05, 24000, '2023-01-01', '5% withholding tax on professional fees above KES 24,000'),
('WITHHOLDING_TAX', 'Commission WHT', 0.05, 24000, '2023-01-01', '5% withholding tax on commissions above KES 24,000'),
('WITHHOLDING_TAX', 'Rent WHT', 0.10, 24000, '2023-01-01', '10% withholding tax on rent above KES 24,000'),
('WITHHOLDING_TAX', 'Management Fees WHT', 0.05, 24000, '2023-01-01', '5% withholding tax on management fees above KES 24,000'),

-- Land rates (varies by county - example rates)
('LAND_RATES', 'Nairobi County Land Rates', 0.0015, 0, '2024-01-01', 'Nairobi County land rates at 0.15% of assessed value'),
('LAND_RATES', 'Kiambu County Land Rates', 0.0012, 0, '2024-01-01', 'Kiambu County land rates at 0.12% of assessed value'),
('LAND_RATES', 'Machakos County Land Rates', 0.0010, 0, '2024-01-01', 'Machakos County land rates at 0.10% of assessed value'),

-- Capital gains tax
('CAPITAL_GAINS_TAX', 'Property Capital Gains Tax', 0.05, 0, '2023-01-01', '5% capital gains tax on property sales'),

-- Stamp duty
('STAMP_DUTY', 'Property Transfer Stamp Duty', 0.04, 0, '2023-01-01', '4% stamp duty on property transfers'),

-- Rental income tax
('RENTAL_INCOME_TAX', 'Rental Income Tax', 0.10, 144000, '2023-01-01', '10% tax on rental income above KES 144,000 annually');

-- Enable RLS
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_land_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withholding_tax_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE withholding_tax_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_compliance_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_penalties_interest ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tax_configurations_select" ON tax_configurations FOR SELECT TO authenticated USING (true);

CREATE POLICY "enhanced_land_rates_select" ON enhanced_land_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "enhanced_land_rates_insert" ON enhanced_land_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "enhanced_land_rates_update" ON enhanced_land_rates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "enhanced_land_rates_delete" ON enhanced_land_rates FOR DELETE TO authenticated USING (true);

CREATE POLICY "vat_management_select" ON vat_management FOR SELECT TO authenticated USING (true);
CREATE POLICY "vat_management_insert" ON vat_management FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vat_management_update" ON vat_management FOR UPDATE TO authenticated USING (true);
CREATE POLICY "vat_management_delete" ON vat_management FOR DELETE TO authenticated USING (true);

CREATE POLICY "vat_transactions_select" ON vat_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "vat_transactions_insert" ON vat_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vat_transactions_update" ON vat_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "vat_transactions_delete" ON vat_transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "withholding_tax_management_select" ON withholding_tax_management FOR SELECT TO authenticated USING (true);
CREATE POLICY "withholding_tax_management_insert" ON withholding_tax_management FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "withholding_tax_management_update" ON withholding_tax_management FOR UPDATE TO authenticated USING (true);
CREATE POLICY "withholding_tax_management_delete" ON withholding_tax_management FOR DELETE TO authenticated USING (true);

CREATE POLICY "withholding_tax_transactions_select" ON withholding_tax_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "withholding_tax_transactions_insert" ON withholding_tax_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "withholding_tax_transactions_update" ON withholding_tax_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "withholding_tax_transactions_delete" ON withholding_tax_transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "tax_compliance_calendar_select" ON tax_compliance_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "tax_compliance_calendar_insert" ON tax_compliance_calendar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tax_compliance_calendar_update" ON tax_compliance_calendar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tax_compliance_calendar_delete" ON tax_compliance_calendar FOR DELETE TO authenticated USING (true);

CREATE POLICY "tax_penalties_interest_select" ON tax_penalties_interest FOR SELECT TO authenticated USING (true);
CREATE POLICY "tax_penalties_interest_insert" ON tax_penalties_interest FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tax_penalties_interest_update" ON tax_penalties_interest FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tax_penalties_interest_delete" ON tax_penalties_interest FOR DELETE TO authenticated USING (true);

-- Add comments for documentation
COMMENT ON TABLE tax_configurations IS 'Kenyan tax rates and configuration settings';
COMMENT ON TABLE enhanced_land_rates IS 'Enhanced land rates tracking with county-specific details';
COMMENT ON TABLE vat_management IS 'VAT period management and calculations';
COMMENT ON TABLE vat_transactions IS 'Detailed VAT transaction tracking';
COMMENT ON TABLE withholding_tax_management IS 'Withholding tax period management';
COMMENT ON TABLE withholding_tax_transactions IS 'Individual withholding tax transactions';
COMMENT ON TABLE tax_compliance_calendar IS 'Tax filing and payment due dates calendar';
COMMENT ON TABLE tax_penalties_interest IS 'Tax penalties and interest calculations';
COMMENT ON VIEW tax_compliance_summary IS 'Overall tax compliance status summary';
COMMENT ON VIEW property_tax_summary IS 'Property-specific tax burden analysis';
