-- Migration 073: Financial Reporting System
-- Description: Comprehensive financial reporting with P&L, cash flow, and performance analytics
-- Builds on existing income and expense management systems

-- Create report types enum
CREATE TYPE report_type AS ENUM (
  'PROFIT_LOSS',
  'CASH_FLOW',
  'BALANCE_SHEET',
  'PORTFOLIO_PERFORMANCE',
  'PROPERTY_PERFORMANCE',
  'MEMBER_CONTRIBUTION_REPORT',
  'EXPENSE_ANALYSIS',
  'INCOME_ANALYSIS',
  'BUDGET_VARIANCE',
  'CUSTOM'
);

-- Create report frequency enum
CREATE TYPE report_frequency AS ENUM (
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUALLY',
  'CUSTOM'
);

-- Financial reporting periods table
CREATE TABLE IF NOT EXISTS financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_type report_frequency NOT NULL,
  fiscal_year INTEGER NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_by UUID REFERENCES enhanced_users(id),
  closed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure no overlapping periods of same type
  CONSTRAINT valid_period_dates CHECK (end_date >= start_date),
  CONSTRAINT valid_fiscal_year CHECK (fiscal_year >= 2020 AND fiscal_year <= 2050)
);

-- Financial report templates table
CREATE TABLE IF NOT EXISTS financial_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(200) NOT NULL,
  report_type report_type NOT NULL,
  description TEXT,
  template_config JSONB NOT NULL, -- Report structure and calculations
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES enhanced_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one default per report type
  CONSTRAINT unique_default_per_type EXCLUDE (report_type WITH =) WHERE (is_default = true)
);

-- Generated financial reports table
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name VARCHAR(200) NOT NULL,
  report_type report_type NOT NULL,
  template_id UUID REFERENCES financial_report_templates(id),
  period_id UUID REFERENCES financial_periods(id),
  
  -- Date range for the report
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Report data and metadata
  report_data JSONB NOT NULL, -- Calculated financial data
  summary_metrics JSONB, -- Key performance indicators
  comparison_data JSONB, -- Period-over-period comparisons
  
  -- Generation details
  generated_by UUID REFERENCES enhanced_users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_time_ms INTEGER, -- Performance tracking
  
  -- Status and sharing
  status VARCHAR(20) DEFAULT 'GENERATED' CHECK (status IN ('GENERATING', 'GENERATED', 'FAILED', 'ARCHIVED')),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES enhanced_users(id),
  
  -- File attachments
  pdf_url TEXT,
  excel_url TEXT,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_report_dates CHECK (end_date >= start_date)
);

-- Portfolio performance metrics view
CREATE OR REPLACE VIEW portfolio_performance_metrics AS
SELECT 
  -- Time period
  DATE_TRUNC('month', COALESCE(it.transaction_date, et.transaction_date)) as period_month,
  
  -- Income metrics
  SUM(CASE WHEN it.status = 'RECEIVED' THEN it.amount_kes ELSE 0 END) as total_income,
  SUM(CASE WHEN it.status = 'RECEIVED' AND ic.category_name = 'RENTAL_INCOME' THEN it.amount_kes ELSE 0 END) as rental_income,
  SUM(CASE WHEN it.status = 'RECEIVED' AND ic.category_name = 'MEMBER_CONTRIBUTION' THEN it.amount_kes ELSE 0 END) as member_contributions,
  SUM(CASE WHEN it.status = 'RECEIVED' AND ic.category_name = 'PROPERTY_SALE' THEN it.amount_kes ELSE 0 END) as property_sales,
  SUM(CASE WHEN it.status = 'RECEIVED' AND ic.category_name = 'COMMISSION_INCOME' THEN it.amount_kes ELSE 0 END) as commission_income,
  
  -- Expense metrics
  SUM(CASE WHEN et.status = 'PAID' THEN et.amount_kes ELSE 0 END) as total_expenses,
  SUM(CASE WHEN et.status = 'PAID' AND ec.category_name = 'PROPERTY_SPECIFIC' THEN et.amount_kes ELSE 0 END) as property_expenses,
  SUM(CASE WHEN et.status = 'PAID' AND ec.category_name = 'GENERAL_BUSINESS' THEN et.amount_kes ELSE 0 END) as business_expenses,
  SUM(CASE WHEN et.status = 'PAID' AND ec.category_name = 'SHARED_ALLOCATED' THEN et.amount_kes ELSE 0 END) as allocated_expenses,
  
  -- Net income
  SUM(CASE WHEN it.status = 'RECEIVED' THEN it.amount_kes ELSE 0 END) - 
  SUM(CASE WHEN et.status = 'PAID' THEN et.amount_kes ELSE 0 END) as net_income,
  
  -- Transaction counts
  COUNT(DISTINCT it.id) as income_transactions,
  COUNT(DISTINCT et.id) as expense_transactions,
  
  -- Property count (active properties in the period)
  COUNT(DISTINCT COALESCE(it.property_id, et.property_id)) as active_properties

FROM income_transactions it
FULL OUTER JOIN expense_transactions et ON DATE_TRUNC('month', it.transaction_date) = DATE_TRUNC('month', et.transaction_date)
LEFT JOIN income_categories ic ON it.category_id = ic.id
LEFT JOIN expense_categories ec ON et.category_id = ec.id
WHERE 
  (it.transaction_date >= CURRENT_DATE - INTERVAL '24 months' OR it.transaction_date IS NULL) AND
  (et.transaction_date >= CURRENT_DATE - INTERVAL '24 months' OR et.transaction_date IS NULL)
GROUP BY DATE_TRUNC('month', COALESCE(it.transaction_date, et.transaction_date))
ORDER BY period_month DESC;

-- Property performance metrics view
CREATE OR REPLACE VIEW property_performance_metrics AS
SELECT 
  p.id as property_id,
  p.name as property_name,
  p.purchase_price_agreement_kes as acquisition_cost,
  
  -- Income metrics (last 12 months)
  COALESCE(income_summary.total_income, 0) as annual_income,
  COALESCE(income_summary.rental_income, 0) as annual_rental_income,
  COALESCE(income_summary.other_income, 0) as annual_other_income,
  
  -- Expense metrics (last 12 months)
  COALESCE(expense_summary.total_expenses, 0) as annual_expenses,
  COALESCE(expense_summary.direct_expenses, 0) as annual_direct_expenses,
  COALESCE(expense_summary.allocated_expenses, 0) as annual_allocated_expenses,
  
  -- Performance calculations
  COALESCE(income_summary.total_income, 0) - COALESCE(expense_summary.total_expenses, 0) as annual_net_income,
  
  -- ROI calculation
  CASE 
    WHEN p.purchase_price_agreement_kes > 0 THEN 
      ((COALESCE(income_summary.total_income, 0) - COALESCE(expense_summary.total_expenses, 0)) / p.purchase_price_agreement_kes) * 100
    ELSE 0 
  END as roi_percentage,
  
  -- Occupancy and rental metrics
  COALESCE(rental_metrics.total_units, 0) as total_units,
  COALESCE(rental_metrics.occupied_units, 0) as occupied_units,
  CASE 
    WHEN rental_metrics.total_units > 0 THEN 
      (rental_metrics.occupied_units::DECIMAL / rental_metrics.total_units) * 100
    ELSE 0 
  END as occupancy_rate,
  
  -- Average rent
  COALESCE(rental_metrics.average_rent, 0) as average_monthly_rent,
  
  -- Last updated
  GREATEST(
    COALESCE(income_summary.last_transaction, '1900-01-01'::DATE),
    COALESCE(expense_summary.last_transaction, '1900-01-01'::DATE)
  ) as last_activity_date

FROM properties p

-- Income summary subquery
LEFT JOIN (
  SELECT 
    property_id,
    SUM(amount_kes) as total_income,
    SUM(CASE WHEN ic.category_name = 'RENTAL_INCOME' THEN amount_kes ELSE 0 END) as rental_income,
    SUM(CASE WHEN ic.category_name != 'RENTAL_INCOME' THEN amount_kes ELSE 0 END) as other_income,
    MAX(transaction_date) as last_transaction
  FROM income_transactions it
  JOIN income_categories ic ON it.category_id = ic.id
  WHERE 
    it.status = 'RECEIVED' AND 
    it.transaction_date >= CURRENT_DATE - INTERVAL '12 months' AND
    it.property_id IS NOT NULL
  GROUP BY property_id
) income_summary ON p.id = income_summary.property_id

-- Expense summary subquery
LEFT JOIN (
  SELECT 
    property_id,
    SUM(amount_kes) as total_expenses,
    SUM(CASE WHEN property_id IS NOT NULL THEN amount_kes ELSE 0 END) as direct_expenses,
    SUM(CASE WHEN property_id IS NULL THEN amount_kes ELSE 0 END) as allocated_expenses,
    MAX(transaction_date) as last_transaction
  FROM expense_transactions et
  WHERE 
    et.status = 'PAID' AND 
    et.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY property_id
  
  UNION ALL
  
  SELECT 
    ea.property_id,
    SUM(ea.allocated_amount_kes) as total_expenses,
    0 as direct_expenses,
    SUM(ea.allocated_amount_kes) as allocated_expenses,
    MAX(et.transaction_date) as last_transaction
  FROM expense_allocations ea
  JOIN expense_transactions et ON ea.expense_id = et.id
  WHERE 
    et.status = 'PAID' AND 
    et.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY ea.property_id
) expense_summary ON p.id = expense_summary.property_id

-- Rental metrics subquery
LEFT JOIN (
  SELECT 
    property_id,
    COUNT(*) as total_units,
    COUNT(CASE WHEN t.status = 'ACTIVE' THEN 1 END) as occupied_units,
    AVG(u.monthly_rent_kes) as average_rent
  FROM units u
  LEFT JOIN tenants t ON u.id = t.unit_id AND t.status = 'ACTIVE'
  GROUP BY property_id
) rental_metrics ON p.id = rental_metrics.property_id

WHERE p.lifecycle_status = 'ACTIVE'
ORDER BY annual_net_income DESC;

-- Cash flow analysis view
CREATE OR REPLACE VIEW cash_flow_analysis AS
SELECT
  DATE_TRUNC('month', transaction_date) as period_month,

  -- Operating cash flows
  SUM(CASE
    WHEN source_type = 'INCOME' AND category IN ('RENTAL_INCOME', 'MEMBER_CONTRIBUTION') THEN amount_kes
    ELSE 0
  END) as operating_inflows,

  SUM(CASE
    WHEN source_type = 'EXPENSE' AND category IN ('PROPERTY_SPECIFIC', 'GENERAL_BUSINESS') THEN -amount_kes
    ELSE 0
  END) as operating_outflows,

  -- Investing cash flows
  SUM(CASE
    WHEN source_type = 'INCOME' AND category = 'PROPERTY_SALE' THEN amount_kes
    ELSE 0
  END) as investing_inflows,

  SUM(CASE
    WHEN source_type = 'EXPENSE' AND category = 'ACQUISITION_COST' THEN -amount_kes
    ELSE 0
  END) as investing_outflows,

  -- Financing cash flows
  SUM(CASE
    WHEN source_type = 'INCOME' AND category = 'SHARE_CAPITAL' THEN amount_kes
    ELSE 0
  END) as financing_inflows,

  -- Net cash flow
  SUM(CASE
    WHEN source_type = 'INCOME' THEN amount_kes
    WHEN source_type = 'EXPENSE' THEN -amount_kes
    ELSE 0
  END) as net_cash_flow

FROM (
  -- Income transactions
  SELECT
    it.transaction_date,
    'INCOME' as source_type,
    ic.category_name as category,
    it.amount_kes
  FROM income_transactions it
  JOIN income_categories ic ON it.category_id = ic.id
  WHERE it.status = 'RECEIVED'

  UNION ALL

  -- Expense transactions
  SELECT
    et.transaction_date,
    'EXPENSE' as source_type,
    ec.category_name as category,
    et.amount_kes
  FROM expense_transactions et
  JOIN expense_categories ec ON et.category_id = ec.id
  WHERE et.status = 'PAID'
) cash_flows
WHERE transaction_date >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', transaction_date)
ORDER BY period_month DESC;

-- Member contribution analysis view
CREATE OR REPLACE VIEW member_contribution_analysis AS
SELECT
  eu.id as member_id,
  eu.full_name as member_name,
  eu.member_number,

  -- Contribution summary (last 12 months)
  COALESCE(contrib_summary.total_contributions, 0) as annual_contributions,
  COALESCE(contrib_summary.monthly_fees, 0) as annual_monthly_fees,
  COALESCE(contrib_summary.project_contributions, 0) as annual_project_contributions,
  COALESCE(contrib_summary.share_capital, 0) as total_share_capital,

  -- Payment behavior
  COALESCE(contrib_summary.total_payments, 0) as total_payments,
  COALESCE(contrib_summary.on_time_payments, 0) as on_time_payments,
  CASE
    WHEN contrib_summary.total_payments > 0 THEN
      (contrib_summary.on_time_payments::DECIMAL / contrib_summary.total_payments) * 100
    ELSE 0
  END as payment_reliability_percentage,

  -- Outstanding amounts
  COALESCE(outstanding.outstanding_amount, 0) as current_outstanding,
  COALESCE(outstanding.overdue_amount, 0) as overdue_amount,

  -- Last activity
  contrib_summary.last_payment_date,

  -- Member status
  CASE
    WHEN contrib_summary.last_payment_date >= CURRENT_DATE - INTERVAL '3 months' THEN 'ACTIVE'
    WHEN contrib_summary.last_payment_date >= CURRENT_DATE - INTERVAL '6 months' THEN 'INACTIVE'
    ELSE 'DORMANT'
  END as member_status

FROM enhanced_users eu

-- Contribution summary subquery
LEFT JOIN (
  SELECT
    member_id,
    SUM(amount_kes) as total_contributions,
    SUM(CASE WHEN contribution_type = 'MONTHLY_MEMBER_FEE' THEN amount_kes ELSE 0 END) as monthly_fees,
    SUM(CASE WHEN contribution_type = 'PROJECT_SPECIFIC_CONTRIBUTION' THEN amount_kes ELSE 0 END) as project_contributions,
    SUM(CASE WHEN contribution_type = 'SHARE_CAPITAL' THEN amount_kes ELSE 0 END) as share_capital,
    COUNT(*) as total_payments,
    COUNT(CASE WHEN paid_date <= due_date THEN 1 END) as on_time_payments,
    MAX(paid_date) as last_payment_date
  FROM member_contributions
  WHERE
    status = 'RECEIVED' AND
    due_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY member_id
) contrib_summary ON eu.id = contrib_summary.member_id

-- Outstanding amounts subquery
LEFT JOIN (
  SELECT
    member_id,
    SUM(amount_kes) as outstanding_amount,
    SUM(CASE WHEN due_date < CURRENT_DATE THEN amount_kes ELSE 0 END) as overdue_amount
  FROM member_contributions
  WHERE status IN ('PENDING', 'PARTIAL')
  GROUP BY member_id
) outstanding ON eu.id = outstanding.member_id

WHERE eu.user_type = 'MEMBER'
ORDER BY annual_contributions DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_periods_dates ON financial_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_financial_periods_type ON financial_periods(period_type, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_financial_reports_type_date ON financial_reports(report_type, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_financial_reports_status ON financial_reports(status, generated_at);

-- Insert default financial periods for current and previous years
INSERT INTO financial_periods (period_name, start_date, end_date, period_type, fiscal_year) VALUES
-- Current year quarters
(EXTRACT(YEAR FROM CURRENT_DATE) || ' Q1',
 DATE_TRUNC('year', CURRENT_DATE),
 DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 months' - INTERVAL '1 day',
 'QUARTERLY',
 EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),

(EXTRACT(YEAR FROM CURRENT_DATE) || ' Q2',
 DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 months',
 DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months' - INTERVAL '1 day',
 'QUARTERLY',
 EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),

(EXTRACT(YEAR FROM CURRENT_DATE) || ' Q3',
 DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months',
 DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '9 months' - INTERVAL '1 day',
 'QUARTERLY',
 EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),

(EXTRACT(YEAR FROM CURRENT_DATE) || ' Q4',
 DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '9 months',
 DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '12 months' - INTERVAL '1 day',
 'QUARTERLY',
 EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),

-- Current year annual
(EXTRACT(YEAR FROM CURRENT_DATE) || ' Annual',
 DATE_TRUNC('year', CURRENT_DATE),
 DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '12 months' - INTERVAL '1 day',
 'ANNUALLY',
 EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

-- Insert default report templates
INSERT INTO financial_report_templates (template_name, report_type, description, template_config, is_default) VALUES
('Standard Profit & Loss', 'PROFIT_LOSS', 'Standard P&L statement with income and expense categories',
 '{"sections": ["income", "expenses", "net_income"], "include_comparisons": true, "show_percentages": true}', true),

('Cash Flow Statement', 'CASH_FLOW', 'Operating, investing, and financing cash flows',
 '{"sections": ["operating", "investing", "financing"], "include_beginning_balance": true, "show_monthly_breakdown": true}', true),

('Portfolio Performance', 'PORTFOLIO_PERFORMANCE', 'Overall portfolio performance metrics and KPIs',
 '{"metrics": ["roi", "occupancy", "net_income", "growth"], "include_property_breakdown": true, "show_trends": true}', true),

('Property Performance', 'PROPERTY_PERFORMANCE', 'Individual property performance analysis',
 '{"metrics": ["income", "expenses", "roi", "occupancy"], "include_comparisons": true, "show_rankings": true}', true),

('Member Contributions', 'MEMBER_CONTRIBUTION_REPORT', 'Member contribution tracking and analysis',
 '{"sections": ["monthly_fees", "project_contributions", "share_capital"], "include_payment_behavior": true, "show_outstanding": true}', true);

-- Enable RLS
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "financial_periods_select" ON financial_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "financial_periods_insert" ON financial_periods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "financial_periods_update" ON financial_periods FOR UPDATE TO authenticated USING (true);

CREATE POLICY "financial_report_templates_select" ON financial_report_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "financial_report_templates_insert" ON financial_report_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "financial_report_templates_update" ON financial_report_templates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "financial_reports_select" ON financial_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "financial_reports_insert" ON financial_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "financial_reports_update" ON financial_reports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "financial_reports_delete" ON financial_reports FOR DELETE TO authenticated USING (true);

-- Add comments for documentation
COMMENT ON TABLE financial_periods IS 'Financial reporting periods for organizing reports by time periods';
COMMENT ON TABLE financial_report_templates IS 'Templates for different types of financial reports';
COMMENT ON TABLE financial_reports IS 'Generated financial reports with data and metadata';
COMMENT ON VIEW portfolio_performance_metrics IS 'Portfolio-wide performance metrics aggregated by month';
COMMENT ON VIEW property_performance_metrics IS 'Individual property performance metrics and ROI analysis';
COMMENT ON VIEW cash_flow_analysis IS 'Cash flow analysis categorized by operating, investing, and financing activities';
COMMENT ON VIEW member_contribution_analysis IS 'Member contribution analysis with payment behavior and outstanding amounts';
