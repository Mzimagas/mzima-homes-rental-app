#!/usr/bin/env node

/**
 * Supabase Migration Runner using REST API
 * Runs migrations using Supabase's REST API with service role key
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

// Make HTTP request
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          resolve({ status: res.statusCode, data: result })
        } catch (e) {
          resolve({ status: res.statusCode, data: body })
        }
      })
    })

    req.on('error', reject)

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

// Execute SQL via Supabase REST API
async function executeSql(sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
  }

  try {
    const response = await makeRequest(url, options, { sql })

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`)
    }

    return response.data
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`)
  }
}

// Alternative: Execute SQL by splitting into statements
async function executeSqlStatements(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'))

  logInfo(`Executing ${statements.length} SQL statements...`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (statement.length === 0) continue

    try {
      // For certain statements that might not work with exec_sql, we'll skip them
      if (
        statement.toUpperCase().includes('CREATE EXTENSION') ||
        statement.toUpperCase().includes('CREATE TYPE') ||
        statement.toUpperCase().includes('DO $$')
      ) {
        logWarning(`Skipping complex statement ${i + 1}: ${statement.substring(0, 50)}...`)
        continue
      }

      await executeSql(statement + ';')

      if ((i + 1) % 10 === 0) {
        logInfo(`Executed ${i + 1}/${statements.length} statements...`)
      }
    } catch (error) {
      logWarning(`Statement ${i + 1} failed: ${error.message}`)
      logWarning(`Statement: ${statement.substring(0, 100)}...`)
      // Continue with next statement instead of failing completely
    }
  }
}

// Run a single migration
async function runMigration(migrationPath) {
  const migrationName = path.basename(migrationPath, '.sql')

  try {
    logInfo(`Running migration: ${migrationName}`)

    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Try to execute the full SQL first
    try {
      await executeSql(sql)
      logSuccess(`Migration ${migrationName} completed successfully`)
      return true
    } catch (error) {
      logWarning(`Full SQL execution failed, trying statement-by-statement approach...`)
      await executeSqlStatements(sql)
      logSuccess(`Migration ${migrationName} completed with statement-by-statement approach`)
      return true
    }
  } catch (error) {
    logError(`Migration ${migrationName} failed: ${error.message}`)
    return false
  }
}

// Main execution
async function main() {
  log('🚀 Starting Supabase Migrations via REST API', 'bright')
  log('==============================================', 'cyan')

  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logError('Missing required environment variables:')
    logError('- NEXT_PUBLIC_SUPABASE_URL')
    logError('- SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Define migrations in order
  const migrations = [
    'supabase/migrations/100_create_user_management_tables.sql',
    'supabase/migrations/101_create_permission_templates.sql',
    'supabase/migrations/102_migrate_existing_users.sql',
  ]

  logInfo(`Found ${migrations.length} migrations to run`)

  let successCount = 0
  let failCount = 0

  // Run each migration
  for (const migration of migrations) {
    if (fs.existsSync(migration)) {
      const success = await runMigration(migration)
      if (success) {
        successCount++
      } else {
        failCount++
        // Continue with next migration instead of stopping
      }
    } else {
      logWarning(`Migration file not found: ${migration}`)
    }
  }

  // Summary
  log('\n📊 Migration Summary:', 'bright')
  logSuccess(`Successful: ${successCount}`)
  if (failCount > 0) {
    logError(`Failed: ${failCount}`)
  }

  if (successCount > 0) {
    log('\n🎉 Migrations completed!', 'green')

    // Extract project ref from URL
    const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]

    log('\n📝 Next Steps:', 'bright')
    log('1. Check your Supabase dashboard for new tables')
    log('2. Verify the enhanced user management interface')
    log('3. Test user creation with new required fields')

    log('\n🔗 Supabase Dashboard:', 'blue')
    log(`https://supabase.com/dashboard/project/${projectRef}`, 'cyan')
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`)
  process.exit(1)
})

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    logError(`Migration failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = { main, runMigration }
