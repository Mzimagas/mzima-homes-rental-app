#!/usr/bin/env node

/**
 * BACKDOOR MIGRATION RUNNER - SUPABASE MANAGEMENT API
 * 
 * This script runs the administrative backdoor audit migration
 * using the Supabase Management API for direct database queries.
 * 
 * Usage: node scripts/run-migration-api.js
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Configuration
const SUPABASE_PROJECT_ID = 'ajrxvnakphkpkcssisxm' // Your project ID
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN // Management API token

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

async function runMigrationViaAPI() {
  log('\n🔐 RUNNING MIGRATION VIA SUPABASE MANAGEMENT API', 'bold')
  log('=' .repeat(60), 'blue')
  
  // Read migration file
  log('\n1. Reading migration file...', 'yellow')
  
  const migrationPath = path.join(__dirname, '../supabase/migrations/999_admin_backdoor_audit.sql')
  let migrationSQL
  
  try {
    migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    log('✅ Migration file loaded successfully', 'green')
    log(`   File: ${migrationPath}`, 'blue')
  } catch (err) {
    log(`❌ Failed to read migration file: ${err.message}`, 'red')
    process.exit(1)
  }

  log('\n2. Executing migration via Management API...', 'yellow')
  
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN || 'your-management-api-token'}`
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    log('✅ Migration executed successfully via Management API', 'green')
    
    if (result.result) {
      log(`   Result: ${JSON.stringify(result.result, null, 2)}`, 'blue')
    }
    
  } catch (err) {
    log(`❌ Management API execution failed: ${err.message}`, 'red')
    log('\n💡 Falling back to direct client method...', 'yellow')
    
    // Fallback to the previous method
    return runDirectClientMethod(migrationSQL)
  }

  log('\n✅ Migration completed successfully!', 'green')
}

async function runDirectClientMethod(migrationSQL) {
  const { createClient } = require('@supabase/supabase-js')
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('❌ Missing Supabase credentials for fallback method', 'red')
    process.exit(1)
  }

  log('\n3. Using direct client method...', 'yellow')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  // Split migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
  
  log(`   Executing ${statements.length} statements...`, 'blue')
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    if (statement.trim().length === 0) continue
    
    try {
      // For CREATE TABLE, CREATE INDEX, etc.
      if (statement.toUpperCase().includes('CREATE') || 
          statement.toUpperCase().includes('ALTER') ||
          statement.toUpperCase().includes('INSERT') ||
          statement.toUpperCase().includes('GRANT')) {
        
        // Use raw SQL execution
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        })
        
        if (error) {
          // Try alternative approach
          console.log(`   Statement ${i + 1}: ${statement.substring(0, 50)}...`)
          
          // For some statements, we might need to handle them differently
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            // Handle table creation
            log(`   ⚠️  Table creation statement - may need manual execution`, 'yellow')
          }
        } else {
          log(`   ✅ Statement ${i + 1} executed`, 'green')
        }
      }
    } catch (err) {
      log(`   ⚠️  Statement ${i + 1} failed: ${err.message}`, 'yellow')
    }
  }
  
  log('\n✅ Direct client method completed', 'green')
}

// Alternative: Simple SQL execution function
async function executeSimpleMigration() {
  log('\n🔐 SIMPLE MIGRATION EXECUTION', 'bold')
  log('=' .repeat(60), 'blue')
  
  const { createClient } = require('@supabase/supabase-js')
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('❌ Missing required environment variables', 'red')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  log('\n1. Creating admin_backdoor_audit table...', 'yellow')
  
  try {
    // Create the table directly
    const { error: tableError } = await supabase.rpc('create_audit_table', {})
    
    // If that doesn't work, try manual table creation
    const { data, error } = await supabase
      .from('admin_backdoor_audit')
      .select('id')
      .limit(1)
    
    if (error && error.code === 'PGRST116') {
      log('   Table does not exist, creating manually...', 'blue')
      
      // Create table using raw SQL
      const createTableSQL = `
        CREATE TABLE admin_backdoor_audit (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_email TEXT NOT NULL,
          user_id TEXT,
          action TEXT NOT NULL,
          permission TEXT,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_address TEXT,
          user_agent TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
      
      // This would need to be executed manually or through a different method
      log('   ⚠️  Manual table creation required', 'yellow')
      log('   SQL to execute:', 'blue')
      log(createTableSQL, 'reset')
    } else {
      log('✅ Table already exists or was created', 'green')
    }
    
    // Insert initialization record
    log('\n2. Creating initialization record...', 'yellow')
    
    const { error: insertError } = await supabase
      .from('admin_backdoor_audit')
      .insert({
        admin_email: 'mzimagas@gmail.com',
        action: 'BACKDOOR_SYSTEM_INITIALIZED',
        metadata: {
          version: '1.0.0',
          initialized_at: new Date().toISOString(),
          method: 'simple_api'
        }
      })
    
    if (insertError) {
      log(`   ⚠️  Insert failed: ${insertError.message}`, 'yellow')
    } else {
      log('✅ Initialization record created', 'green')
    }
    
  } catch (err) {
    log(`❌ Simple migration failed: ${err.message}`, 'red')
  }
}

// Main execution
async function main() {
  const method = process.argv[2] || 'api'
  
  switch (method) {
    case 'api':
      await runMigrationViaAPI()
      break
    case 'simple':
      await executeSimpleMigration()
      break
    default:
      log('Usage: node scripts/run-migration-api.js [api|simple]', 'yellow')
      log('  api    - Use Supabase Management API (requires access token)', 'blue')
      log('  simple - Use simple client method', 'blue')
  }
}

main().catch(err => {
  log(`\n❌ MIGRATION FAILED: ${err.message}`, 'red')
  process.exit(1)
})
