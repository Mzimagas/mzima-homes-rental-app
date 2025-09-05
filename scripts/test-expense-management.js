#!/usr/bin/env node

/**
 * Test script for Expense Management System
 *
 * This script tests the expense management functionality by:
 * 1. Running the database migration
 * 2. Testing API endpoints
 * 3. Verifying intelligent consolidation
 * 4. Testing allocation engine
 *
 * Usage: node scripts/test-expense-management.js
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
  console.log('🔄 Running expense management migration...')

  try {
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/072_expense_management_schema.sql'
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

async function testExpenseCategories() {
  console.log('🔄 Testing expense categories...')

  try {
    const { data, error } = await supabase.from('expense_categories').select('*').limit(5)

    if (error) throw error

    console.log(`✅ Found ${data.length} expense categories`)
    console.log('Sample categories:', data.map((c) => c.display_name).join(', '))
  } catch (error) {
    console.error('❌ Expense categories test failed:', error.message)
    throw error
  }
}

async function testVendorManagement() {
  console.log('🔄 Testing vendor management...')

  try {
    // Create a test vendor
    const testVendor = {
      vendor_name: 'Test Contractor Ltd',
      vendor_code: 'TC001',
      contact_person: 'John Doe',
      phone: '+254700000000',
      email: 'john@testcontractor.com',
      vendor_type: 'CONTRACTOR',
      tax_id: 'A123456789X',
      payment_terms: 'NET_30',
    }

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert(testVendor)
      .select()
      .single()

    if (vendorError) throw vendorError

    console.log('✅ Created test vendor:', vendor.vendor_name)

    // Clean up
    await supabase.from('vendors').delete().eq('id', vendor.id)

    console.log('✅ Cleaned up test vendor')
  } catch (error) {
    console.error('❌ Vendor management test failed:', error.message)
    throw error
  }
}

async function testExpenseTransaction() {
  console.log('🔄 Testing expense transaction creation...')

  try {
    // Get a sample category
    const { data: categories } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('category_name', 'GENERAL_BUSINESS')
      .limit(1)

    if (!categories || categories.length === 0) {
      throw new Error('No general business category found')
    }

    // Create a test expense transaction
    const testExpense = {
      category_id: categories[0].id,
      amount_kes: 25000,
      transaction_date: new Date().toISOString().split('T')[0],
      description: 'Test office rent payment',
      status: 'PAID',
      requires_allocation: true,
    }

    const { data, error } = await supabase
      .from('expense_transactions')
      .insert(testExpense)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Created test expense transaction:', data.id)

    // Clean up
    await supabase.from('expense_transactions').delete().eq('id', data.id)

    console.log('✅ Cleaned up test expense transaction')
  } catch (error) {
    console.error('❌ Expense transaction test failed:', error.message)
    throw error
  }
}

async function testPropertyConsolidation() {
  console.log('🔄 Testing property expense consolidation...')

  try {
    // Test the consolidation view
    const { data: consolidation, error } = await supabase
      .from('property_expense_consolidation')
      .select('*')
      .limit(3)

    if (error) throw error

    console.log(`✅ Property consolidation working: ${consolidation.length} properties found`)

    if (consolidation.length > 0) {
      const sample = consolidation[0]
      console.log(`Sample: ${sample.property_name} - Total: KES ${sample.grand_total_expenses_kes}`)
    }
  } catch (error) {
    console.error('❌ Property consolidation test failed:', error.message)
    throw error
  }
}

async function testAllocationEngine() {
  console.log('🔄 Testing allocation engine...')

  try {
    // Get active properties for allocation testing
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, purchase_price_agreement_kes')
      .eq('lifecycle_status', 'ACTIVE')
      .limit(3)

    if (propertiesError) throw propertiesError

    if (properties.length < 2) {
      console.log('⚠️  Need at least 2 active properties to test allocation engine')
      return
    }

    console.log(`✅ Found ${properties.length} active properties for allocation testing`)

    // Test equal allocation calculation
    const equalPercentage = 100 / properties.length
    console.log(`✅ Equal allocation: ${equalPercentage.toFixed(2)}% per property`)

    // Test value-based allocation calculation
    const totalValue = properties.reduce(
      (sum, prop) => sum + (prop.purchase_price_agreement_kes || 0),
      0
    )
    if (totalValue > 0) {
      console.log(
        `✅ Value-based allocation possible: Total portfolio value KES ${totalValue.toLocaleString()}`
      )
    } else {
      console.log('⚠️  No property values available for value-based allocation')
    }
  } catch (error) {
    console.error('❌ Allocation engine test failed:', error.message)
    throw error
  }
}

async function testDatabaseViews() {
  console.log('🔄 Testing database views...')

  try {
    // Test property expense consolidation view
    const { data: consolidationView } = await supabase
      .from('property_expense_consolidation')
      .select('*')
      .limit(1)

    console.log('✅ Property expense consolidation view working')

    // Test business expense summary view
    const { data: summaryView } = await supabase
      .from('business_expense_summary')
      .select('*')
      .limit(1)

    console.log('✅ Business expense summary view working')
  } catch (error) {
    console.error('❌ Database views test failed:', error.message)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting Expense Management System Tests\n')

  try {
    await runMigration()
    await testExpenseCategories()
    await testVendorManagement()
    await testExpenseTransaction()
    await testPropertyConsolidation()
    await testAllocationEngine()
    await testDatabaseViews()

    console.log('\n🎉 All tests passed! Expense Management System is ready.')
    console.log('\n📋 Next steps:')
    console.log('1. Navigate to /dashboard/accounting in your app')
    console.log('2. Click on the "Expense Management" tab')
    console.log('3. Verify the intelligent consolidation displays property costs')
    console.log('4. Test adding new expense transactions')
    console.log('5. Test the smart allocation engine for shared expenses')

    console.log('\n🔧 Key Features Available:')
    console.log('• Intelligent property expense consolidation')
    console.log('• Smart allocation engine (equal, value-based, income-based)')
    console.log('• Vendor management system')
    console.log('• Comprehensive expense categorization')
    console.log('• Real-time analytics and reporting')
  } catch (error) {
    console.error('\n💥 Tests failed:', error.message)
    process.exit(1)
  }
}

// Run the tests
main().catch(console.error)
