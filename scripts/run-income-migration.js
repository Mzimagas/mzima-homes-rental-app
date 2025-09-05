#!/usr/bin/env node

/**
 * Script to run the Income Management migration
 *
 * This script runs the income management migration to create the missing tables
 * that are causing the 400 errors in the Income Management tab.
 *
 * Usage: node scripts/run-income-migration.js
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

async function runIncomeMigration() {
  console.log('🔄 Running income management migration...')

  try {
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/071_income_management_schema.sql'
    )

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            if (
              error.message.includes('already exists') ||
              error.message.includes('does not exist')
            ) {
              console.log(`⚠️  Statement ${i + 1}: ${error.message}`)
            } else {
              console.error(`❌ Statement ${i + 1} failed:`, error.message)
              throw error
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          }
        } catch (err) {
          console.error(`❌ Error executing statement ${i + 1}:`, err.message)
          console.log('Statement:', statement.substring(0, 100) + '...')
          throw err
        }
      }
    }

    console.log('✅ Income management migration completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    throw error
  }
}

async function testTables() {
  console.log('🔄 Testing created tables...')

  const tablesToTest = [
    'income_categories',
    'income_transactions',
    'member_contributions',
    'property_sales_income',
    'commission_income_tracking',
  ]

  for (const table of tablesToTest) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)

      if (error) {
        console.error(`❌ Table ${table} test failed:`, error.message)
      } else {
        console.log(`✅ Table ${table} is accessible`)
      }
    } catch (err) {
      console.error(`❌ Error testing table ${table}:`, err.message)
    }
  }
}

async function insertDefaultData() {
  console.log('🔄 Inserting default income categories...')

  try {
    // Check if categories already exist
    const { data: existingCategories } = await supabase
      .from('income_categories')
      .select('id')
      .limit(1)

    if (existingCategories && existingCategories.length > 0) {
      console.log('✅ Income categories already exist, skipping default data insertion')
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
      },
      {
        category_name: 'RENTAL_INCOME',
        subcategory: 'DEPOSIT',
        display_name: 'Security Deposit',
        description: 'Security deposits from tenants',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
      },
      {
        category_name: 'MEMBER_CONTRIBUTION',
        subcategory: 'MONTHLY_MEMBER_FEE',
        display_name: 'Monthly Member Fee',
        description: 'Regular monthly membership fees',
        is_recurring: true,
        default_frequency: 'MONTHLY',
      },
      {
        category_name: 'MEMBER_CONTRIBUTION',
        subcategory: 'PROJECT_SPECIFIC_CONTRIBUTION',
        display_name: 'Project Contribution',
        description: 'Contributions for specific property projects',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
      },
      {
        category_name: 'PROPERTY_SALE',
        subcategory: 'FULL_SALE',
        display_name: 'Property Sale',
        description: 'Income from complete property sales',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
      },
      {
        category_name: 'COMMISSION_INCOME',
        subcategory: 'SALES_COMMISSION',
        display_name: 'Sales Commission',
        description: 'Commission from property sales',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
      },
      {
        category_name: 'INTEREST_INCOME',
        subcategory: 'BANK_INTEREST',
        display_name: 'Bank Interest',
        description: 'Interest earned on bank deposits',
        is_recurring: true,
        default_frequency: 'MONTHLY',
      },
      {
        category_name: 'OTHER_INCOME',
        subcategory: 'MISCELLANEOUS',
        display_name: 'Miscellaneous Income',
        description: 'Other miscellaneous income sources',
        is_recurring: false,
        default_frequency: 'ONE_TIME',
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
    // Test income_transactions with joins
    const { data, error } = await supabase
      .from('income_transactions')
      .select(
        `
        *,
        category:income_categories(display_name, category_name, subcategory),
        property:properties(name),
        member:enhanced_users(full_name, member_number),
        tenant:tenants(full_name)
      `
      )
      .limit(1)

    if (error) {
      console.error('❌ Relationship test failed:', error.message)
    } else {
      console.log('✅ Table relationships are working correctly')
    }
  } catch (error) {
    console.error('❌ Error testing relationships:', error.message)
  }
}

async function main() {
  console.log('🚀 Starting Income Management Migration\n')

  try {
    await runIncomeMigration()
    await testTables()
    await insertDefaultData()
    await testRelationships()

    console.log('\n🎉 Income Management migration completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Refresh your browser')
    console.log('2. Navigate to /dashboard/accounting')
    console.log('3. Click on the "Income Management" tab')
    console.log('4. The tab should now load without errors')

    console.log('\n📊 Created Tables:')
    console.log('• income_categories - Income category configuration')
    console.log('• income_transactions - Main income transaction tracking')
    console.log('• member_contributions - Member contribution tracking')
    console.log('• property_sales_income - Property sale income tracking')
    console.log('• commission_income_tracking - Commission income tracking')
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
main().catch(console.error)
