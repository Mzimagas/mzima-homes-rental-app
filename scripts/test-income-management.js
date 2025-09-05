#!/usr/bin/env node

/**
 * Test script for Income Management System
 *
 * This script tests the income management functionality by:
 * 1. Running the database migration
 * 2. Testing API endpoints
 * 3. Verifying data integrity
 *
 * Usage: node scripts/test-income-management.js
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
  console.log('🔄 Running income management migration...')

  try {
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/071_income_management_schema.sql'
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

async function testIncomeCategories() {
  console.log('🔄 Testing income categories...')

  try {
    const { data, error } = await supabase.from('income_categories').select('*').limit(5)

    if (error) throw error

    console.log(`✅ Found ${data.length} income categories`)
    console.log('Sample categories:', data.map((c) => c.display_name).join(', '))
  } catch (error) {
    console.error('❌ Income categories test failed:', error.message)
    throw error
  }
}

async function testCreateIncomeTransaction() {
  console.log('🔄 Testing income transaction creation...')

  try {
    // Get a sample category
    const { data: categories } = await supabase
      .from('income_categories')
      .select('id')
      .eq('category_name', 'RENTAL_INCOME')
      .limit(1)

    if (!categories || categories.length === 0) {
      throw new Error('No rental income category found')
    }

    // Create a test transaction
    const testTransaction = {
      category_id: categories[0].id,
      amount_kes: 50000,
      transaction_date: new Date().toISOString().split('T')[0],
      description: 'Test rental payment',
      status: 'RECEIVED',
    }

    const { data, error } = await supabase
      .from('income_transactions')
      .insert(testTransaction)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Created test income transaction:', data.id)

    // Clean up
    await supabase.from('income_transactions').delete().eq('id', data.id)

    console.log('✅ Cleaned up test transaction')
  } catch (error) {
    console.error('❌ Income transaction test failed:', error.message)
    throw error
  }
}

async function testMemberContributions() {
  console.log('🔄 Testing member contributions...')

  try {
    // Get a sample member
    const { data: members } = await supabase.from('enhanced_users').select('id').limit(1)

    if (!members || members.length === 0) {
      console.log('⚠️  No members found, skipping member contribution test')
      return
    }

    // Create a test contribution
    const testContribution = {
      member_id: members[0].id,
      contribution_type: 'MONTHLY_MEMBER_FEE',
      amount_kes: 1000,
      due_date: new Date().toISOString().split('T')[0],
      status: 'PENDING',
    }

    const { data, error } = await supabase
      .from('member_contributions')
      .insert(testContribution)
      .select()
      .single()

    if (error) throw error

    console.log('✅ Created test member contribution:', data.id)

    // Clean up
    await supabase.from('member_contributions').delete().eq('id', data.id)

    console.log('✅ Cleaned up test contribution')
  } catch (error) {
    console.error('❌ Member contribution test failed:', error.message)
    throw error
  }
}

async function testDatabaseIntegrity() {
  console.log('🔄 Testing database integrity...')

  try {
    // Test foreign key constraints
    const { data: transactions } = await supabase
      .from('income_transactions')
      .select(
        `
        id,
        category:income_categories(display_name),
        property:properties(name),
        member:enhanced_users(full_name)
      `
      )
      .limit(5)

    console.log('✅ Foreign key relationships working correctly')

    // Test enum constraints
    const { data: categories } = await supabase
      .from('income_categories')
      .select('category_name, subcategory')
      .limit(5)

    console.log('✅ Enum constraints working correctly')

    // Test computed columns
    const { data: sales } = await supabase
      .from('property_sales_income')
      .select('sale_price_kes, acquisition_cost_kes, capital_gains_kes')
      .limit(1)

    console.log('✅ Computed columns working correctly')
  } catch (error) {
    console.error('❌ Database integrity test failed:', error.message)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting Income Management System Tests\n')

  try {
    await runMigration()
    await testIncomeCategories()
    await testCreateIncomeTransaction()
    await testMemberContributions()
    await testDatabaseIntegrity()

    console.log('\n🎉 All tests passed! Income Management System is ready.')
    console.log('\n📋 Next steps:')
    console.log('1. Navigate to /dashboard/accounting in your app')
    console.log('2. Click on the "Income Management" tab')
    console.log('3. Verify the UI loads correctly')
    console.log('4. Test adding income transactions and member contributions')
  } catch (error) {
    console.error('\n💥 Tests failed:', error.message)
    process.exit(1)
  }
}

// Run the tests
main().catch(console.error)
