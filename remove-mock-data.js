#!/usr/bin/env node

/**
 * Remove Mock Data Script
 * This script removes all sample/mock data from the Supabase database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('Please check your .env.local file')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function removeMockData() {
  console.log('🧹 Starting mock data removal...')
  console.log('')

  try {
    // Read the SQL script
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'migrations', 'remove_mock_data.sql'), 
      'utf8'
    )

    console.log('📄 Executing mock data removal SQL script...')
    
    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlScript 
    })

    if (error) {
      // If the exec_sql function doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not available, trying direct execution...')
      
      // Split the SQL into individual statements and execute them
      const statements = sqlScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

      for (const statement of statements) {
        if (statement.includes('BEGIN') || statement.includes('COMMIT') || statement.includes('DO $$')) {
          // Skip transaction control statements for now
          continue
        }

        try {
          const { error: stmtError } = await supabase.rpc('exec', { 
            sql: statement 
          })
          
          if (stmtError) {
            console.log(`⚠️  Statement failed (continuing): ${stmtError.message}`)
          }
        } catch (e) {
          console.log(`⚠️  Statement failed (continuing): ${e.message}`)
        }
      }
    }

    console.log('✅ Mock data removal completed!')
    console.log('')
    
    // Verify removal by checking for mock data
    console.log('🔍 Verifying mock data removal...')
    
    // Check for mock subdivisions
    const { data: subdivisions } = await supabase
      .from('subdivisions')
      .select('name')
      .in('name', ['Westlands Gardens', 'Kikuyu Heights', 'Syokimau Commercial Park', 'Rongai Residences', 'Kenol Farms'])

    // Check for mock plots
    const { data: plots } = await supabase
      .from('plots')
      .select('plot_no')
      .like('plot_no', 'A00%')

    // Check for mock clients
    const { data: clients } = await supabase
      .from('clients')
      .select('full_name')
      .in('full_name', ['James Mwangi Kariuki', 'Sarah Njoki Wambui', 'Peter Ochieng Otieno'])

    console.log(`📊 Verification results:`)
    console.log(`   Mock subdivisions remaining: ${subdivisions?.length || 0}`)
    console.log(`   Mock plots remaining: ${plots?.length || 0}`)
    console.log(`   Mock clients remaining: ${clients?.length || 0}`)
    console.log('')

    if ((subdivisions?.length || 0) === 0 && (plots?.length || 0) === 0 && (clients?.length || 0) === 0) {
      console.log('🎉 SUCCESS: All mock data has been successfully removed!')
      console.log('')
      console.log('The application should now show:')
      console.log('- Empty property listings (no Plot A007, A008, etc.)')
      console.log('- Clean subdivision interface')
      console.log('- No sample client data')
      console.log('')
      console.log('You can now add real data through the application interface.')
    } else {
      console.log('⚠️  Some mock data may still remain. This could be due to:')
      console.log('- Database permission issues')
      console.log('- Foreign key constraints')
      console.log('- Data that was modified after creation')
      console.log('')
      console.log('You may need to manually remove remaining mock data.')
    }

  } catch (error) {
    console.error('❌ Error removing mock data:', error.message)
    console.error('')
    console.error('This could be due to:')
    console.error('- Database connection issues')
    console.error('- Permission problems')
    console.error('- Missing tables or functions')
    console.error('')
    console.error('Please check your Supabase configuration and try again.')
    process.exit(1)
  }
}

// Run the script
removeMockData().catch(console.error)
