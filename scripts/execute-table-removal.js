#!/usr/bin/env node

/**
 * Execute Safe Table Removal Script
 * Removes 66 unused database tables safely
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeTableRemoval() {
  console.log('🗑️  Starting safe table removal process...')
  
  // Read the SQL script
  const sqlPath = path.join(__dirname, 'safe-table-removal.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ SQL script not found:', sqlPath)
    process.exit(1)
  }

  const sqlScript = fs.readFileSync(sqlPath, 'utf8')
  console.log('📄 SQL script loaded successfully')

  // Get table count before removal
  console.log('\n📊 Checking current database state...')
  const { data: beforeTables, error: beforeError } = await supabase.rpc('exec_sql', {
    sql: "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
  })

  if (beforeError) {
    console.error('❌ Error checking table count:', beforeError)
    process.exit(1)
  }

  const tableCountBefore = beforeTables?.[0]?.count || 0
  console.log(`📋 Tables before removal: ${tableCountBefore}`)

  // Execute the removal script
  console.log('\n🚀 Executing table removal script...')
  console.log('⚠️  This will permanently remove 66 unused tables')
  
  // Split the script into individual statements for better error handling
  const statements = sqlScript
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'BEGIN' && stmt !== 'COMMIT' && stmt !== 'ROLLBACK')

  console.log(`📝 Found ${statements.length} SQL statements to execute`)

  let successCount = 0
  let errorCount = 0
  const errors = []

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    if (statement.startsWith('DROP TABLE')) {
      const tableName = statement.match(/DROP TABLE IF EXISTS (\w+)/)?.[1]
      process.stdout.write(`🗑️  Dropping ${tableName}... `)
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.log(`❌ Error: ${error.message}`)
          errors.push({ table: tableName, error: error.message })
          errorCount++
        } else {
          console.log('✅ Success')
          successCount++
        }
      } catch (err) {
        console.log(`❌ Exception: ${err.message}`)
        errors.push({ table: tableName, error: err.message })
        errorCount++
      }
    } else if (statement.includes('SELECT')) {
      // Execute verification queries
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        if (!error && data) {
          console.log('📊 Verification query executed successfully')
        }
      } catch (err) {
        // Ignore verification query errors
      }
    }
  }

  // Get table count after removal
  console.log('\n📊 Checking final database state...')
  const { data: afterTables, error: afterError } = await supabase.rpc('exec_sql', {
    sql: "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
  })

  const tableCountAfter = afterTables?.[0]?.count || 0
  const tablesRemoved = tableCountBefore - tableCountAfter

  console.log(`📋 Tables after removal: ${tableCountAfter}`)
  console.log(`🗑️  Tables removed: ${tablesRemoved}`)

  // Summary
  console.log('\n📈 REMOVAL SUMMARY:')
  console.log(`✅ Successful removals: ${successCount}`)
  console.log(`❌ Failed removals: ${errorCount}`)
  console.log(`📊 Total tables removed: ${tablesRemoved}`)

  if (errors.length > 0) {
    console.log('\n⚠️  ERRORS ENCOUNTERED:')
    errors.forEach(({ table, error }) => {
      console.log(`   ${table}: ${error}`)
    })
  }

  // Verify core tables still exist
  console.log('\n🔍 Verifying core rental management tables...')
  const coreTableCheck = await supabase.rpc('exec_sql', {
    sql: `SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name IN ('properties', 'units', 'tenants', 'tenancy_agreements', 'landlords')
          ORDER BY table_name`
  })

  if (coreTableCheck.data && coreTableCheck.data.length === 5) {
    console.log('✅ All core rental management tables preserved')
    coreTableCheck.data.forEach(row => {
      console.log(`   ✓ ${row.table_name}`)
    })
  } else {
    console.log('⚠️  Some core tables may be missing!')
    console.log('Found tables:', coreTableCheck.data?.map(r => r.table_name) || [])
  }

  // Create completion report
  const report = {
    timestamp: new Date().toISOString(),
    operation: 'safe-table-removal',
    tablesBefore: tableCountBefore,
    tablesAfter: tableCountAfter,
    tablesRemoved,
    successfulRemovals: successCount,
    failedRemovals: errorCount,
    errors,
    coreTablesPreserved: coreTableCheck.data?.length === 5
  }

  const reportPath = path.join(__dirname, '..', 'backups', `table-removal-report-${Date.now()}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed report saved: ${reportPath}`)

  if (errorCount === 0 && tablesRemoved > 50) {
    console.log('\n🎉 TABLE REMOVAL COMPLETED SUCCESSFULLY!')
    console.log('✅ Database cleanup complete')
    console.log('✅ Core functionality preserved')
    console.log('✅ Ready for code cleanup phase')
  } else {
    console.log('\n⚠️  TABLE REMOVAL COMPLETED WITH ISSUES')
    console.log('Please review the errors above and the detailed report')
  }

  return report
}

// Execute if run directly
if (require.main === module) {
  executeTableRemoval()
    .then((report) => {
      process.exit(report.failedRemovals > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error)
      process.exit(1)
    })
}

module.exports = { executeTableRemoval }
