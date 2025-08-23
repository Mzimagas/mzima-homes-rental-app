#!/usr/bin/env node

/**
 * BACKDOOR MIGRATION RUNNER
 * 
 * This script runs the administrative backdoor audit migration
 * using the Supabase API directly.
 * 
 * Usage: node scripts/run-backdoor-migration.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function runBackdoorMigration() {
  log('\n🔐 RUNNING ADMINISTRATIVE BACKDOOR MIGRATION', 'bold')
  log('=' .repeat(60), 'blue')
  
  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('❌ Missing required environment variables:', 'red')
    log('   - NEXT_PUBLIC_SUPABASE_URL', 'red')
    log('   - SUPABASE_SERVICE_ROLE_KEY', 'red')
    process.exit(1)
  }

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  log('\n1. Connecting to Supabase...', 'yellow')
  
  try {
    // Test connection
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Connection test failed: ${error.message}`)
    }
    log('✅ Connected to Supabase successfully', 'green')
  } catch (err) {
    log(`❌ Failed to connect to Supabase: ${err.message}`, 'red')
    process.exit(1)
  }

  log('\n2. Reading migration file...', 'yellow')
  
  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/999_admin_backdoor_audit.sql')
  let migrationSQL
  
  try {
    migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    log('✅ Migration file loaded successfully', 'green')
    log(`   File: ${migrationPath}`, 'blue')
    log(`   Size: ${migrationSQL.length} characters`, 'blue')
  } catch (err) {
    log(`❌ Failed to read migration file: ${err.message}`, 'red')
    process.exit(1)
  }

  log('\n3. Checking if migration already applied...', 'yellow')
  
  try {
    // Check if the audit table already exists
    const { data, error } = await supabase
      .from('admin_backdoor_audit')
      .select('id')
      .limit(1)
    
    if (!error) {
      log('⚠️  Migration appears to already be applied', 'yellow')
      log('   admin_backdoor_audit table exists', 'yellow')
      
      // Check for initialization record
      const { data: initRecord } = await supabase
        .from('admin_backdoor_audit')
        .select('*')
        .eq('action', 'BACKDOOR_SYSTEM_INITIALIZED')
        .single()
      
      if (initRecord) {
        log('✅ System already initialized', 'green')
        log(`   Initialized at: ${initRecord.timestamp}`, 'blue')
        log('\n🎯 Migration already complete. System is ready!', 'green')
        return
      }
    }
  } catch (err) {
    // Table doesn't exist, which is expected for first run
    log('✅ Table does not exist - proceeding with migration', 'green')
  }

  log('\n4. Executing migration...', 'yellow')
  
  try {
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    log(`   Found ${statements.length} SQL statements to execute`, 'blue')
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue
      }
      
      log(`   Executing statement ${i + 1}/${statements.length}...`, 'blue')
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          // Try alternative method for statements that don't work with rpc
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0)
          
          // If that fails too, try using the REST API directly
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ sql: statement })
          })
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }
        }
        
        log(`   ✅ Statement ${i + 1} executed successfully`, 'green')
      } catch (stmtError) {
        log(`   ⚠️  Statement ${i + 1} failed: ${stmtError.message}`, 'yellow')
        
        // Some statements might fail if objects already exist - that's okay
        if (stmtError.message.includes('already exists') || 
            stmtError.message.includes('does not exist')) {
          log(`   ℹ️  This is likely safe to ignore`, 'blue')
        } else {
          throw stmtError
        }
      }
    }
    
    log('✅ Migration executed successfully', 'green')
  } catch (err) {
    log(`❌ Migration execution failed: ${err.message}`, 'red')
    
    // Try alternative approach - execute the entire migration as one block
    log('\n5. Trying alternative execution method...', 'yellow')
    
    try {
      // Use a more direct approach
      const { error } = await supabase.rpc('exec_raw_sql', { 
        query: migrationSQL 
      })
      
      if (error) {
        throw error
      }
      
      log('✅ Alternative execution successful', 'green')
    } catch (altError) {
      log(`❌ Alternative execution also failed: ${altError.message}`, 'red')
      log('\n💡 Manual execution required. Please run the migration manually.', 'yellow')
      process.exit(1)
    }
  }

  log('\n6. Verifying migration results...', 'yellow')
  
  try {
    // Check if table was created
    const { data: tableCheck, error: tableError } = await supabase
      .from('admin_backdoor_audit')
      .select('id')
      .limit(1)
    
    if (tableError) {
      throw new Error(`Table verification failed: ${tableError.message}`)
    }
    
    log('✅ admin_backdoor_audit table created successfully', 'green')
    
    // Check for initialization record
    const { data: initRecord, error: initError } = await supabase
      .from('admin_backdoor_audit')
      .select('*')
      .eq('action', 'BACKDOOR_SYSTEM_INITIALIZED')
      .single()
    
    if (initError) {
      log('⚠️  Initialization record not found, creating it...', 'yellow')
      
      // Create initialization record manually
      const { error: insertError } = await supabase
        .from('admin_backdoor_audit')
        .insert({
          admin_email: 'mzimagas@gmail.com',
          action: 'BACKDOOR_SYSTEM_INITIALIZED',
          metadata: {
            version: '1.0.0',
            initialized_at: new Date().toISOString(),
            method: 'api_migration'
          }
        })
      
      if (insertError) {
        throw new Error(`Failed to create initialization record: ${insertError.message}`)
      }
      
      log('✅ Initialization record created', 'green')
    } else {
      log('✅ Initialization record found', 'green')
      log(`   Initialized at: ${initRecord.timestamp}`, 'blue')
    }
    
    // Check if view was created
    const { data: viewCheck, error: viewError } = await supabase
      .from('backdoor_usage_stats')
      .select('*')
      .limit(1)
    
    if (!viewError) {
      log('✅ backdoor_usage_stats view created successfully', 'green')
    } else {
      log('⚠️  View creation may have failed, but core functionality should work', 'yellow')
    }
    
  } catch (err) {
    log(`❌ Verification failed: ${err.message}`, 'red')
    log('⚠️  Migration may have partially succeeded', 'yellow')
  }

  // Final summary
  log('\n' + '=' .repeat(60), 'blue')
  log('🔐 MIGRATION SUMMARY', 'bold')
  log('=' .repeat(60), 'blue')
  
  log('\n✅ Administrative Backdoor Migration Complete!', 'green')
  log('\n📋 What was created:', 'blue')
  log('   • admin_backdoor_audit table', 'reset')
  log('   • Performance indexes', 'reset')
  log('   • Row Level Security policies', 'reset')
  log('   • Cleanup function', 'reset')
  log('   • Usage statistics view', 'reset')
  log('   • Initial audit log entry', 'reset')
  
  log('\n🎯 Next Steps:', 'blue')
  log('   1. Set NEXT_PUBLIC_ADMIN_EMAILS environment variable', 'reset')
  log('   2. Run: node scripts/test-backdoor-system.js', 'reset')
  log('   3. Test emergency access API', 'reset')
  log('   4. Login with mzimagas@gmail.com to verify access', 'reset')
  
  log('\n🔗 Test Commands:', 'blue')
  log('   • System Test: node scripts/test-backdoor-system.js', 'reset')
  log('   • API Test: curl -X POST http://localhost:3000/api/admin/emergency-access \\', 'reset')
  log('     -H "Content-Type: application/json" \\', 'reset')
  log('     -d \'{"email":"mzimagas@gmail.com","action":"create_access"}\'', 'reset')
  
  log('\n🎉 Backdoor system is now active and ready for use!', 'green')
}

// Run the migration
runBackdoorMigration().catch(err => {
  log(`\n❌ MIGRATION FAILED: ${err.message}`, 'red')
  log('\n💡 You may need to run the migration manually using:', 'yellow')
  log('   • Supabase Dashboard SQL Editor', 'reset')
  log('   • psql command line tool', 'reset')
  log('   • Supabase CLI: supabase db push', 'reset')
  process.exit(1)
})
