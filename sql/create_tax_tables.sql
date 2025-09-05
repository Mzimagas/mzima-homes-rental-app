-- Quick fix for Tax Management tables
-- Run this SQL directly in your Supabase SQL Editor

-- Create tax type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_type') THEN
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
    END IF;
END $$;

-- Create tax status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_status') THEN
        CREATE TYPE tax_status AS ENUM (
            'PENDING',
            'CALCULATED',
            'FILED',
            'PAID',
            'OVERDUE',
            'DISPUTED',
            'WAIVED'
        );
    END IF;
END $$;

-- Tax configurations table
CREATE TABLE IF NOT EXISTS tax_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_type tax_type NOT NULL,
    tax_name VARCHAR(200) NOT NULL,
    tax_rate DECIMAL(5,4) NOT NULL,
    minimum_threshold DECIMAL(15,2) DEFAULT 0,
    maximum_threshold DECIMAL(15,2),
    effective_from DATE NOT NULL,
    effective_to DATE,
    description TEXT,
    calculation_method VARCHAR(50) DEFAULT 'PERCENTAGE',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced land rates table
CREATE TABLE IF NOT EXISTS enhanced_land_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id),
    parcel_number VARCHAR(100),
    financial_year VARCHAR(9) NOT NULL,
    assessed_value_kes DECIMAL(15,2) NOT NULL CHECK (assessed_value_kes > 0),
    rate_percentage DECIMAL(5,4) NOT NULL CHECK (rate_percentage > 0),
    annual_rate_kes DECIMAL(15,2) NOT NULL CHECK (annual_rate_kes > 0),
    amount_paid_kes DECIMAL(15,2) DEFAULT 0 CHECK (amount_paid_kes >= 0),
    balance_kes DECIMAL(15,2) GENERATED ALWAYS AS (annual_rate_kes - amount_paid_kes) STORED,
    due_date DATE NOT NULL,
    penalty_rate DECIMAL(5,4) DEFAULT 0.02,
    penalty_amount_kes DECIMAL(15,2) DEFAULT 0 CHECK (penalty_amount_kes >= 0),
    payment_reference VARCHAR(100),
    receipt_number VARCHAR(100),
    payment_date DATE,
    status tax_status DEFAULT 'PENDING',
    is_disputed BOOLEAN DEFAULT FALSE,
    dispute_reason TEXT,
    county VARCHAR(100),
    sub_county VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    UNIQUE(property_id, financial_year)
);

-- Tax compliance calendar table
CREATE TABLE IF NOT EXISTS tax_compliance_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_type tax_type NOT NULL,
    obligation_name VARCHAR(200) NOT NULL,
    description TEXT,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME')),
    due_day INTEGER,
    due_month INTEGER,
    period_start DATE,
    period_end DATE,
    filing_due_date DATE NOT NULL,
    payment_due_date DATE,
    status tax_status DEFAULT 'PENDING',
    completed_date DATE,
    reminder_days_before INTEGER DEFAULT 7,
    is_reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax compliance summary view
CREATE OR REPLACE VIEW tax_compliance_summary AS
SELECT 
    -- Land rates summary
    COUNT(CASE WHEN elr.status IN ('PENDING', 'OVERDUE') THEN 1 END) as pending_land_rates,
    SUM(CASE WHEN elr.status IN ('PENDING', 'OVERDUE') THEN elr.balance_kes ELSE 0 END) as outstanding_land_rates_kes,
    SUM(CASE WHEN elr.status = 'PAID' THEN elr.amount_paid_kes ELSE 0 END) as paid_land_rates_kes,
    
    -- VAT summary (placeholder - will be 0 until VAT tables are added)
    0 as pending_vat_returns,
    0 as outstanding_vat_kes,
    0 as paid_vat_kes,
    
    -- Withholding tax summary (placeholder)
    0 as pending_withholding_returns,
    0 as outstanding_withholding_kes,
    0 as paid_withholding_kes,
    
    -- Penalties and interest
    SUM(COALESCE(elr.penalty_amount_kes, 0)) as total_penalties_kes,
    0 as total_interest_kes,
    
    -- Compliance calendar
    COUNT(CASE WHEN tcc.status = 'PENDING' AND tcc.filing_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as upcoming_obligations

FROM enhanced_land_rates elr
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
    
    -- VAT impact (placeholder)
    0 as property_vat_on_sales_kes,
    0 as property_vat_on_purchases_kes,
    
    -- Withholding tax impact (placeholder)
    0 as property_withholding_tax_kes,
    
    -- Total tax burden
    COALESCE(lr_summary.total_annual_rates, 0) as total_tax_burden_kes

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

WHERE p.lifecycle_status = 'ACTIVE'
ORDER BY total_tax_burden_kes DESC;

-- Insert default tax configurations
INSERT INTO tax_configurations (tax_type, tax_name, tax_rate, minimum_threshold, effective_from, description) VALUES
-- VAT rates
('VAT', 'Standard VAT Rate', 0.16, 5000000, '2023-01-01', 'Standard VAT rate of 16% for taxable supplies'),
('VAT', 'Zero-rated VAT', 0.00, 0, '2023-01-01', 'Zero-rated supplies (exports, basic food items)'),

-- Withholding tax rates
('WITHHOLDING_TAX', 'Professional Fees WHT', 0.05, 24000, '2023-01-01', '5% withholding tax on professional fees above KES 24,000'),
('WITHHOLDING_TAX', 'Commission WHT', 0.05, 24000, '2023-01-01', '5% withholding tax on commissions above KES 24,000'),
('WITHHOLDING_TAX', 'Rent WHT', 0.10, 24000, '2023-01-01', '10% withholding tax on rent above KES 24,000'),
('WITHHOLDING_TAX', 'Management Fees WHT', 0.05, 24000, '2023-01-01', '5% withholding tax on management fees above KES 24,000'),

-- Land rates (varies by county)
('LAND_RATES', 'Nairobi County Land Rates', 0.0015, 0, '2024-01-01', 'Nairobi County land rates at 0.15% of assessed value'),
('LAND_RATES', 'Kiambu County Land Rates', 0.0012, 0, '2024-01-01', 'Kiambu County land rates at 0.12% of assessed value'),
('LAND_RATES', 'Machakos County Land Rates', 0.0010, 0, '2024-01-01', 'Machakos County land rates at 0.10% of assessed value'),

-- Capital gains tax
('CAPITAL_GAINS_TAX', 'Property Capital Gains Tax', 0.05, 0, '2023-01-01', '5% capital gains tax on property sales'),

-- Stamp duty
('STAMP_DUTY', 'Property Transfer Stamp Duty', 0.04, 0, '2023-01-01', '4% stamp duty on property transfers'),

-- Rental income tax
('RENTAL_INCOME_TAX', 'Rental Income Tax', 0.10, 144000, '2023-01-01', '10% tax on rental income above KES 144,000 annually')
ON CONFLICT DO NOTHING;

-- Insert sample tax compliance calendar entries
INSERT INTO tax_compliance_calendar (tax_type, obligation_name, description, frequency, due_day, filing_due_date, status) VALUES
('VAT', 'Monthly VAT Return', 'Submit monthly VAT return to KRA', 'MONTHLY', 20, '2024-02-20', 'PENDING'),
('WITHHOLDING_TAX', 'Monthly WHT Return', 'Submit monthly withholding tax return', 'MONTHLY', 20, '2024-02-20', 'PENDING'),
('LAND_RATES', 'Annual Land Rates Payment', 'Pay annual land rates to county government', 'ANNUALLY', NULL, '2024-06-30', 'PENDING'),
('INCOME_TAX', 'Annual Income Tax Return', 'Submit annual income tax return', 'ANNUALLY', NULL, '2024-06-30', 'PENDING')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_land_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_compliance_calendar ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tax_configurations' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON tax_configurations FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'enhanced_land_rates' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON enhanced_land_rates FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tax_compliance_calendar' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON tax_compliance_calendar FOR ALL USING (true);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tax_configurations_type_active ON tax_configurations(tax_type, is_active);
CREATE INDEX IF NOT EXISTS idx_enhanced_land_rates_property ON enhanced_land_rates(property_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_land_rates_financial_year ON enhanced_land_rates(financial_year);
CREATE INDEX IF NOT EXISTS idx_enhanced_land_rates_status ON enhanced_land_rates(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_land_rates_due_date ON enhanced_land_rates(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_compliance_calendar_type ON tax_compliance_calendar(tax_type);
CREATE INDEX IF NOT EXISTS idx_tax_compliance_calendar_due_date ON tax_compliance_calendar(filing_due_date);
CREATE INDEX IF NOT EXISTS idx_tax_compliance_calendar_status ON tax_compliance_calendar(status);

-- Verification query
SELECT 
    'tax_configurations' as table_name,
    COUNT(*) as record_count
FROM tax_configurations
UNION ALL
SELECT 
    'enhanced_land_rates' as table_name,
    COUNT(*) as record_count
FROM enhanced_land_rates
UNION ALL
SELECT 
    'tax_compliance_calendar' as table_name,
    COUNT(*) as record_count
FROM tax_compliance_calendar;
