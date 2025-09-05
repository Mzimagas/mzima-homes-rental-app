-- Complete Accounting Dashboard Fix
-- Run this SQL script in Supabase SQL Editor to fix all missing tables

-- ============================================================================
-- FINANCIAL REPORTING TABLES
-- ============================================================================

-- Property performance metrics table (missing from previous script)
CREATE TABLE IF NOT EXISTS property_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id),
    analysis_period DATE NOT NULL,
    
    -- Income metrics
    monthly_rental_income DECIMAL(15,2) DEFAULT 0,
    annual_rental_income DECIMAL(15,2) DEFAULT 0,
    other_income DECIMAL(15,2) DEFAULT 0,
    total_income DECIMAL(15,2) DEFAULT 0,
    
    -- Expense metrics
    monthly_expenses DECIMAL(15,2) DEFAULT 0,
    annual_expenses DECIMAL(15,2) DEFAULT 0,
    maintenance_costs DECIMAL(15,2) DEFAULT 0,
    
    -- Performance calculations
    annual_net_income DECIMAL(15,2) DEFAULT 0,
    roi_percentage DECIMAL(5,4) DEFAULT 0,
    cap_rate DECIMAL(5,4) DEFAULT 0,
    cash_flow DECIMAL(15,2) DEFAULT 0,
    
    -- Property valuation
    current_market_value DECIMAL(15,2) DEFAULT 0,
    acquisition_cost DECIMAL(15,2) DEFAULT 0,
    total_invested DECIMAL(15,2) DEFAULT 0,
    
    -- Occupancy metrics
    occupancy_rate DECIMAL(5,4) DEFAULT 0,
    vacancy_loss DECIMAL(15,2) DEFAULT 0,
    
    -- Performance ranking
    performance_score DECIMAL(3,2) DEFAULT 0,
    market_comparison VARCHAR(20) DEFAULT 'AVERAGE',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(property_id, analysis_period)
);

-- Cash flow analysis table (if not exists from previous script)
CREATE TABLE IF NOT EXISTS cash_flow_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_month DATE NOT NULL,
    
    -- Operating activities
    operating_inflows DECIMAL(15,2) DEFAULT 0,
    operating_outflows DECIMAL(15,2) DEFAULT 0,
    net_operating_cash_flow DECIMAL(15,2) GENERATED ALWAYS AS (operating_inflows + operating_outflows) STORED,
    
    -- Investing activities
    investing_inflows DECIMAL(15,2) DEFAULT 0,
    investing_outflows DECIMAL(15,2) DEFAULT 0,
    net_investing_cash_flow DECIMAL(15,2) GENERATED ALWAYS AS (investing_inflows + investing_outflows) STORED,
    
    -- Financing activities
    financing_inflows DECIMAL(15,2) DEFAULT 0,
    financing_outflows DECIMAL(15,2) DEFAULT 0,
    net_financing_cash_flow DECIMAL(15,2) GENERATED ALWAYS AS (financing_inflows + financing_outflows) STORED,
    
    -- Net cash flow
    net_cash_flow DECIMAL(15,2) GENERATED ALWAYS AS (
        (operating_inflows + operating_outflows) + 
        (investing_inflows + investing_outflows) + 
        (financing_inflows + financing_outflows)
    ) STORED,
    
    -- Beginning and ending cash
    beginning_cash DECIMAL(15,2) DEFAULT 0,
    ending_cash DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(period_month)
);

-- Portfolio performance metrics table (if not exists)
CREATE TABLE IF NOT EXISTS portfolio_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_month DATE NOT NULL,
    
    -- Portfolio overview
    total_properties INTEGER DEFAULT 0,
    active_properties INTEGER DEFAULT 0,
    total_portfolio_value_kes DECIMAL(15,2) DEFAULT 0,
    
    -- Performance metrics
    total_rental_income_kes DECIMAL(15,2) DEFAULT 0,
    total_expenses_kes DECIMAL(15,2) DEFAULT 0,
    net_operating_income_kes DECIMAL(15,2) DEFAULT 0,
    
    -- ROI calculations
    average_roi DECIMAL(5,4) DEFAULT 0,
    best_performing_property_roi DECIMAL(5,4) DEFAULT 0,
    worst_performing_property_roi DECIMAL(5,4) DEFAULT 0,
    
    -- Occupancy metrics
    average_occupancy_rate DECIMAL(5,4) DEFAULT 0,
    total_occupied_units INTEGER DEFAULT 0,
    total_available_units INTEGER DEFAULT 0,
    
    -- Financial ratios
    expense_ratio DECIMAL(5,4) DEFAULT 0,
    cap_rate DECIMAL(5,4) DEFAULT 0,
    cash_on_cash_return DECIMAL(5,4) DEFAULT 0,
    
    -- Growth metrics
    portfolio_growth_rate DECIMAL(5,4) DEFAULT 0,
    income_growth_rate DECIMAL(5,4) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(period_month)
);

-- Member contribution analysis table (if not exists)
CREATE TABLE IF NOT EXISTS member_contribution_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES enhanced_users(id),
    analysis_period DATE NOT NULL,
    
    -- Contribution totals
    monthly_contributions DECIMAL(15,2) DEFAULT 0,
    quarterly_contributions DECIMAL(15,2) DEFAULT 0,
    annual_contributions DECIMAL(15,2) DEFAULT 0,
    lifetime_contributions DECIMAL(15,2) DEFAULT 0,
    
    -- Contribution types breakdown
    membership_fees DECIMAL(15,2) DEFAULT 0,
    project_contributions DECIMAL(15,2) DEFAULT 0,
    special_assessments DECIMAL(15,2) DEFAULT 0,
    share_capital DECIMAL(15,2) DEFAULT 0,
    
    -- Member metrics
    contribution_consistency_score DECIMAL(3,2) DEFAULT 0,
    average_monthly_contribution DECIMAL(15,2) DEFAULT 0,
    months_active INTEGER DEFAULT 0,
    
    -- Ranking and percentiles
    contribution_rank INTEGER DEFAULT 0,
    contribution_percentile DECIMAL(5,2) DEFAULT 0,
    
    -- Status flags
    is_current BOOLEAN DEFAULT TRUE,
    is_delinquent BOOLEAN DEFAULT FALSE,
    outstanding_balance DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(member_id, analysis_period)
);

-- Insert sample data for current month
DO $$
DECLARE
    current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
    sample_property_id UUID;
BEGIN
    -- Get a sample property ID (or create a placeholder)
    SELECT id INTO sample_property_id FROM properties LIMIT 1;
    
    -- Insert sample property performance metrics
    IF sample_property_id IS NOT NULL THEN
        INSERT INTO property_performance_metrics (
            property_id,
            analysis_period,
            monthly_rental_income,
            annual_rental_income,
            annual_expenses,
            annual_net_income,
            roi_percentage,
            cap_rate,
            current_market_value,
            acquisition_cost,
            occupancy_rate,
            performance_score
        ) VALUES (
            sample_property_id,
            current_month_start,
            45000,   -- Monthly rental income
            540000,  -- Annual rental income
            200000,  -- Annual expenses
            340000,  -- Annual net income
            0.15,    -- 15% ROI
            0.12,    -- 12% cap rate
            3000000, -- Market value
            2500000, -- Acquisition cost
            0.95,    -- 95% occupancy
            8.5      -- Performance score
        ) ON CONFLICT (property_id, analysis_period) DO NOTHING;
    END IF;
    
    -- Insert sample cash flow analysis
    INSERT INTO cash_flow_analysis (
        period_month, 
        operating_inflows, 
        operating_outflows, 
        investing_inflows, 
        investing_outflows,
        beginning_cash,
        ending_cash
    ) VALUES (
        current_month_start,
        500000,  -- Operating inflows
        -300000, -- Operating outflows
        100000,  -- Investing inflows
        -50000,  -- Investing outflows
        1000000, -- Beginning cash
        1250000  -- Ending cash
    ) ON CONFLICT (period_month) DO NOTHING;
    
    -- Insert sample portfolio performance
    INSERT INTO portfolio_performance_metrics (
        period_month,
        total_properties,
        active_properties,
        total_portfolio_value_kes,
        total_rental_income_kes,
        total_expenses_kes,
        net_operating_income_kes,
        average_roi,
        average_occupancy_rate,
        total_occupied_units,
        total_available_units
    ) VALUES (
        current_month_start,
        25,        -- Total properties
        23,        -- Active properties
        50000000,  -- Portfolio value (50M KES)
        450000,    -- Rental income
        200000,    -- Expenses
        250000,    -- NOI
        0.12,      -- 12% ROI
        0.85,      -- 85% occupancy
        85,        -- Occupied units
        100        -- Total units
    ) ON CONFLICT (period_month) DO NOTHING;
    
END $$;

-- Enable RLS on all tables
ALTER TABLE property_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_contribution_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'property_performance_metrics' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON property_performance_metrics FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_flow_analysis' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON cash_flow_analysis FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_performance_metrics' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON portfolio_performance_metrics FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member_contribution_analysis' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON member_contribution_analysis FOR ALL USING (true);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_performance_property_period ON property_performance_metrics(property_id, analysis_period);
CREATE INDEX IF NOT EXISTS idx_property_performance_annual_income ON property_performance_metrics(annual_net_income DESC);
CREATE INDEX IF NOT EXISTS idx_cash_flow_analysis_period ON cash_flow_analysis(period_month);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_period ON portfolio_performance_metrics(period_month);
CREATE INDEX IF NOT EXISTS idx_member_contribution_member_period ON member_contribution_analysis(member_id, analysis_period);

-- Verification query
SELECT 
    'property_performance_metrics' as table_name,
    COUNT(*) as record_count
FROM property_performance_metrics
UNION ALL
SELECT 
    'cash_flow_analysis' as table_name,
    COUNT(*) as record_count
FROM cash_flow_analysis
UNION ALL
SELECT 
    'portfolio_performance_metrics' as table_name,
    COUNT(*) as record_count
FROM portfolio_performance_metrics
UNION ALL
SELECT 
    'member_contribution_analysis' as table_name,
    COUNT(*) as record_count
FROM member_contribution_analysis;
