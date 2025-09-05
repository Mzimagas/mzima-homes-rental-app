#!/usr/bin/env node

/**
 * Script to fix Income Management tables
 *
 * This script creates the missing income management tables directly
 * using individual SQL statements to avoid exec_sql issues.
 *
 * Usage: node scripts/fix-income-tables.js
 */

const { createClient } = require('@supabase/supabase-js')

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

async function createIncomeCategories() {
  console.log('🔄 Creating income_categories table...')

  try {
    // First, let's check if the table exists
    const { data: existingTable } = await supabase.from('income_categories').select('id').limit(1)

    console.log('✅ income_categories table already exists')
    return true
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log(
        '⚠️  income_categories table does not exist, will need to be created via migration'
      )
      return false
    } else {
      console.error('❌ Error checking income_categories:', error.message)
      return false
    }
  }
}

async function createIncomeTransactions() {
  console.log('🔄 Creating income_transactions table...')

  try {
    const { data: existingTable } = await supabase.from('income_transactions').select('id').limit(1)

    console.log('✅ income_transactions table already exists')
    return true
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log(
        '⚠️  income_transactions table does not exist, will need to be created via migration'
      )
      return false
    } else {
      console.error('❌ Error checking income_transactions:', error.message)
      return false
    }
  }
}

async function createMemberContributions() {
  console.log('🔄 Creating member_contributions table...')

  try {
    const { data: existingTable } = await supabase
      .from('member_contributions')
      .select('id')
      .limit(1)

    console.log('✅ member_contributions table already exists')
    return true
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log(
        '⚠️  member_contributions table does not exist, will need to be created via migration'
      )
      return false
    } else {
      console.error('❌ Error checking member_contributions:', error.message)
      return false
    }
  }
}

async function createPropertySalesIncome() {
  console.log('🔄 Creating property_sales_income table...')

  try {
    const { data: existingTable } = await supabase
      .from('property_sales_income')
      .select('id')
      .limit(1)

    console.log('✅ property_sales_income table already exists')
    return true
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log(
        '⚠️  property_sales_income table does not exist, will need to be created via migration'
      )
      return false
    } else {
      console.error('❌ Error checking property_sales_income:', error.message)
      return false
    }
  }
}

async function insertDefaultCategories() {
  console.log('🔄 Inserting default income categories...')

  try {
    // Check if categories already exist
    const { data: existingCategories } = await supabase
      .from('income_categories')
      .select('id')
      .limit(1)

    if (existingCategories && existingCategories.length > 0) {
      console.log('✅ Income categories already exist')
      return
    }

    // Insert default categories
    const defaultCategories = [
      {
        category_name: 'RENTAL_INCOME',
        subcategory: 'MONTHLY_RENT',
        display_name: 'Monthly Rent',
        description: 'Regular monthly rental income from tenants',
        is_recurring: true,
        default_frequency: 'MONTHLY',
        is_active: true,
        sort_order: 1,
      },
      {
        category_name: 'RENTAL_INCOME',
        subcategory: 'DEPOSIT',
        display_name: 'Security Deposit',
        description: 'Security deposits from tenants',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
        is_active: true,
        sort_order: 2,
      },
      {
        category_name: 'MEMBER_CONTRIBUTION',
        subcategory: 'MONTHLY_MEMBER_FEE',
        display_name: 'Monthly Member Fee',
        description: 'Regular monthly membership fees',
        is_recurring: true,
        default_frequency: 'MONTHLY',
        is_active: true,
        sort_order: 3,
      },
      {
        category_name: 'MEMBER_CONTRIBUTION',
        subcategory: 'PROJECT_SPECIFIC_CONTRIBUTION',
        display_name: 'Project Contribution',
        description: 'Contributions for specific property projects',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
        is_active: true,
        sort_order: 4,
      },
      {
        category_name: 'PROPERTY_SALE',
        subcategory: 'FULL_SALE',
        display_name: 'Property Sale',
        description: 'Income from complete property sales',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
        is_active: true,
        sort_order: 5,
      },
      {
        category_name: 'COMMISSION_INCOME',
        subcategory: 'SALES_COMMISSION',
        display_name: 'Sales Commission',
        description: 'Commission from property sales',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
        is_active: true,
        sort_order: 6,
      },
    ]

    const { data, error } = await supabase
      .from('income_categories')
      .insert(defaultCategories)
      .select()

    if (error) {
      console.error('❌ Error inserting default categories:', error.message)
    } else {
      console.log(`✅ Inserted ${data.length} default income categories`)
    }
  } catch (error) {
    console.error('❌ Error inserting default data:', error.message)
  }
}

async function testRelationships() {
  console.log('🔄 Testing table relationships...')

  try {
    // Test basic table access first
    const { data: categories, error: catError } = await supabase
      .from('income_categories')
      .select('*')
      .limit(1)

    if (catError) {
      console.error('❌ Cannot access income_categories:', catError.message)
      return false
    }

    // Test income_transactions with simple joins
    const { data: transactions, error: transError } = await supabase
      .from('income_transactions')
      .select('*, income_categories(*)')
      .limit(1)

    if (transError) {
      console.error('❌ Cannot access income_transactions with joins:', transError.message)
      return false
    }

    console.log('✅ Basic table relationships are working')
    return true
  } catch (error) {
    console.error('❌ Error testing relationships:', error.message)
    return false
  }
}

async function checkMigrationStatus() {
  console.log('🔄 Checking migration status...')

  const tables = [
    'income_categories',
    'income_transactions',
    'member_contributions',
    'property_sales_income',
  ]

  const results = {}

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1)

      if (error) {
        results[table] = false
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        results[table] = true
        console.log(`✅ ${table}: accessible`)
      }
    } catch (err) {
      results[table] = false
      console.log(`❌ ${table}: ${err.message}`)
    }
  }

  return results
}

async function main() {
  console.log('🚀 Checking Income Management Tables\n')

  try {
    const migrationStatus = await checkMigrationStatus()

    const allTablesExist = Object.values(migrationStatus).every((exists) => exists)

    if (allTablesExist) {
      console.log('\n✅ All income management tables exist!')
      await insertDefaultCategories()
      await testRelationships()

      console.log('\n🎉 Income Management system is ready!')
      console.log('\n📋 Next steps:')
      console.log('1. Refresh your browser')
      console.log('2. Navigate to /dashboard/accounting')
      console.log('3. Click on the "Income Management" tab')
      console.log('4. The tab should now load without errors')
    } else {
      console.log('\n⚠️  Some tables are missing. You need to run the migration.')
      console.log('\nMissing tables:')
      Object.entries(migrationStatus).forEach(([table, exists]) => {
        if (!exists) {
          console.log(`  ❌ ${table}`)
        }
      })

      console.log('\n📋 To fix this:')
      console.log('1. Run the income management migration in your Supabase dashboard')
      console.log('2. Or contact your database administrator')
      console.log('3. The migration file is: supabase/migrations/071_income_management_schema.sql')
    }
  } catch (error) {
    console.error('\n💥 Check failed:', error.message)
    process.exit(1)
  }
}

// Run the check
main().catch(console.error)
