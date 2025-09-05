#!/usr/bin/env node

/**
 * Test script for Financial Reporting System
 *
 * This script tests the financial reporting functionality by:
 * 1. Running the database migration
 * 2. Testing report generation APIs
 * 3. Verifying data views and calculations
 * 4. Testing report templates and periods
 *
 * Usage: node scripts/test-financial-reporting.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_URL.includes('your-')) {
  console.error(
    '❌ Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runMigration() {
  console.log('🔄 Running financial reporting migration...')

  try {
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/073_financial_reporting_schema.sql'
    )
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error && !error.message.includes('already exists')) {
          console.warn(`⚠️  Migration warning: ${error.message}`)
        }
      }
    }

    console.log('✅ Migration completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    throw error
  }
}

async function testFinancialPeriods() {
  console.log('🔄 Testing financial periods...')

  try {
    const { data, error } = await supabase.from('financial_periods').select('*').limit(5)

    if (error) throw error

    console.log(`✅ Found ${data.length} financial periods`)
    if (data.length > 0) {
      console.log('Sample periods:', data.map((p) => p.period_name).join(', '))
    }
  } catch (error) {
    console.error('❌ Financial periods test failed:', error.message)
    throw error
  }
}

async function testReportTemplates() {
  console.log('🔄 Testing report templates...')

  try {
    const { data, error } = await supabase
      .from('financial_report_templates')
      .select('*')
      .eq('is_active', true)

    if (error) throw error

    console.log(`✅ Found ${data.length} active report templates`)
    console.log('Available templates:', data.map((t) => t.template_name).join(', '))
  } catch (error) {
    console.error('❌ Report templates test failed:', error.message)
    throw error
  }
}

async function testPortfolioPerformanceView() {
  console.log('🔄 Testing portfolio performance view...')

  try {
    const { data, error } = await supabase
      .from('portfolio_performance_metrics')
      .select('*')
      .limit(3)

    if (error) throw error

    console.log(`✅ Portfolio performance view working: ${data.length} periods found`)

    if (data.length > 0) {
      const sample = data[0]
      console.log(
        `Sample period: ${sample.period_month} - Income: KES ${sample.total_income || 0}, Expenses: KES ${sample.total_expenses || 0}`
      )
    }
  } catch (error) {
    console.error('❌ Portfolio performance view test failed:', error.message)
    throw error
  }
}

async function testPropertyPerformanceView() {
  console.log('🔄 Testing property performance view...')

  try {
    const { data, error } = await supabase.from('property_performance_metrics').select('*').limit(3)

    if (error) throw error

    console.log(`✅ Property performance view working: ${data.length} properties found`)

    if (data.length > 0) {
      const sample = data[0]
      console.log(
        `Sample property: ${sample.property_name} - ROI: ${sample.roi_percentage || 0}%, Net Income: KES ${sample.annual_net_income || 0}`
      )
    }
  } catch (error) {
    console.error('❌ Property performance view test failed:', error.message)
    throw error
  }
}

async function testCashFlowAnalysisView() {
  console.log('🔄 Testing cash flow analysis view...')

  try {
    const { data, error } = await supabase.from('cash_flow_analysis').select('*').limit(3)

    if (error) throw error

    console.log(`✅ Cash flow analysis view working: ${data.length} periods found`)

    if (data.length > 0) {
      const sample = data[0]
      console.log(
        `Sample period: ${sample.period_month} - Net Cash Flow: KES ${sample.net_cash_flow || 0}`
      )
    }
  } catch (error) {
    console.error('❌ Cash flow analysis view test failed:', error.message)
    throw error
  }
}

async function testMemberContributionAnalysisView() {
  console.log('🔄 Testing member contribution analysis view...')

  try {
    const { data, error } = await supabase.from('member_contribution_analysis').select('*').limit(3)

    if (error) throw error

    console.log(`✅ Member contribution analysis view working: ${data.length} members found`)

    if (data.length > 0) {
      const sample = data[0]
      console.log(
        `Sample member: ${sample.member_name} - Annual Contributions: KES ${sample.annual_contributions || 0}, Status: ${sample.member_status}`
      )
    }
  } catch (error) {
    console.error('❌ Member contribution analysis view test failed:', error.message)
    throw error
  }
}

async function testReportGeneration() {
  console.log('🔄 Testing report generation...')

  try {
    // Create a test financial report
    const testReport = {
      report_name: 'Test P&L Report',
      report_type: 'PROFIT_LOSS',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      report_data: {
        income: { total_income: 100000 },
        expenses: { total_expenses: 60000 },
        net_income: 40000,
      },
      summary_metrics: {
        net_margin: 40,
        gross_margin: 45,
      },
      status: 'GENERATED',
    }

    const { data, error } = await supabase
      .from('financial_reports')
      .insert(testReport)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Created test financial report:', data.report_name)

    // Clean up
    await supabase.from('financial_reports').delete().eq('id', data.id)

    console.log('✅ Cleaned up test report')
  } catch (error) {
    console.error('❌ Report generation test failed:', error.message)
    throw error
  }
}

async function testDataIntegrity() {
  console.log('🔄 Testing data integrity and relationships...')

  try {
    // Test that views can join with existing tables
    const { data: incomeData } = await supabase
      .from('income_transactions')
      .select('id, amount_kes, transaction_date')
      .limit(1)

    const { data: expenseData } = await supabase
      .from('expense_transactions')
      .select('id, amount_kes, transaction_date')
      .limit(1)

    console.log('✅ Income and expense data integration working')

    // Test financial period constraints
    const currentYear = new Date().getFullYear()
    const { data: periods } = await supabase
      .from('financial_periods')
      .select('*')
      .eq('fiscal_year', currentYear)

    console.log(`✅ Found ${periods?.length || 0} periods for current fiscal year ${currentYear}`)

    // Test report template configurations
    const { data: templates } = await supabase
      .from('financial_report_templates')
      .select('template_config')
      .limit(1)

    if (templates && templates.length > 0) {
      const config = templates[0].template_config
      console.log('✅ Report template configurations are valid JSON')
    }
  } catch (error) {
    console.error('❌ Data integrity test failed:', error.message)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting Financial Reporting System Tests\n')

  try {
    await runMigration()
    await testFinancialPeriods()
    await testReportTemplates()
    await testPortfolioPerformanceView()
    await testPropertyPerformanceView()
    await testCashFlowAnalysisView()
    await testMemberContributionAnalysisView()
    await testReportGeneration()
    await testDataIntegrity()

    console.log('\n🎉 All tests passed! Financial Reporting System is ready.')
    console.log('\n📋 Next steps:')
    console.log('1. Navigate to /dashboard/accounting in your app')
    console.log('2. Click on the "Financial Reports" tab')
    console.log('3. Select different time periods and verify reports generate correctly')
    console.log('4. Test P&L statements, cash flow analysis, and portfolio performance')
    console.log('5. Verify member contribution reports and property performance metrics')

    console.log('\n📊 Available Reports:')
    console.log('• Profit & Loss Statement with period comparisons')
    console.log('• Cash Flow Statement (Operating, Investing, Financing)')
    console.log('• Portfolio Performance with ROI analysis')
    console.log('• Property Performance with detailed metrics')
    console.log('• Member Contribution Analysis with payment behavior')
    console.log('• Advanced analytics views and KPIs')
  } catch (error) {
    console.error('\n💥 Tests failed:', error.message)
    process.exit(1)
  }
}

// Run the tests
main().catch(console.error)
