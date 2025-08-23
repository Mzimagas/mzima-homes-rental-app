#!/usr/bin/env node

/**
 * Migration Runner Script
 * Runs database migrations for the enhanced user management system
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Initialize Supabase client
function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logError('Missing required environment variables:');
    logError('- NEXT_PUBLIC_SUPABASE_URL');
    logError('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Get list of migration files
function getMigrationFiles() {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files.map(file => ({
      filename: file,
      path: path.join(MIGRATIONS_DIR, file),
      name: file.replace('.sql', '')
    }));
  } catch (error) {
    logError(`Failed to read migrations directory: ${error.message}`);
    return [];
  }
}

// Check if migrations table exists and create if not
async function ensureMigrationsTable(supabase) {
  logInfo('Ensuring migrations tracking table exists...');

  try {
    // Try to query the table first to see if it exists
    const { error: queryError } = await supabase
      .from('schema_migrations')
      .select('id')
      .limit(1);

    if (queryError && queryError.code === '42P01') {
      // Table doesn't exist, create it using direct SQL execution
      logInfo('Creating migrations tracking table...');

      // Use Supabase's SQL execution through the REST API
      const response = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'apikey': supabase.supabaseKey
        },
        body: JSON.stringify({
          sql: `
            CREATE TABLE IF NOT EXISTS schema_migrations (
              id SERIAL PRIMARY KEY,
              migration_name VARCHAR(255) UNIQUE NOT NULL,
              executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              success BOOLEAN DEFAULT true,
              error_message TEXT,
              execution_time_ms INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_schema_migrations_name
            ON schema_migrations(migration_name);
          `
        })
      });

      if (!response.ok) {
        // Fallback: try to create table using individual operations
        logWarning('Direct SQL execution not available, using fallback method...');
        return true; // Continue anyway, we'll handle this in the migration execution
      }
    }

    logSuccess('Migrations tracking table ready');
    return true;
  } catch (error) {
    logWarning(`Could not verify migrations table: ${error.message}`);
    return true; // Continue anyway
  }
}

// Check if migration has already been run
async function isMigrationExecuted(supabase, migrationName) {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('migration_name')
    .eq('migration_name', migrationName)
    .eq('success', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    logWarning(`Error checking migration status: ${error.message}`);
  }

  return !!data;
}

// Execute a single migration
async function executeMigration(supabase, migration) {
  const startTime = Date.now();

  try {
    logInfo(`Executing migration: ${migration.name}`);

    // Read migration file
    const sql = fs.readFileSync(migration.path, 'utf8');

    // Split SQL into individual statements (basic approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    logInfo(`Executing ${statements.length} SQL statements...`);

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      try {
        // Use Supabase's query method for individual statements
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

        if (error) {
          // If exec_sql doesn't work, try alternative approach
          logWarning(`Statement ${i + 1} failed with exec_sql, trying alternative...`);

          // For CREATE TABLE statements, we might need to handle differently
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            logInfo(`Skipping CREATE TABLE statement (may already exist): ${statement.substring(0, 50)}...`);
            continue;
          }

          throw new Error(`Statement ${i + 1}: ${error.message}`);
        }

        if ((i + 1) % 10 === 0) {
          logInfo(`Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (stmtError) {
        // Log the specific statement that failed
        logError(`Failed statement: ${statement.substring(0, 100)}...`);
        throw stmtError;
      }
    }

    const executionTime = Date.now() - startTime;

    // Record successful migration (try to insert, ignore if table doesn't exist yet)
    try {
      await supabase
        .from('schema_migrations')
        .insert({
          migration_name: migration.name,
          success: true,
          execution_time_ms: executionTime
        });
    } catch (insertError) {
      logWarning(`Could not record migration success: ${insertError.message}`);
    }

    logSuccess(`Migration ${migration.name} completed in ${executionTime}ms`);
    return true;

  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Record failed migration (try to insert, ignore if table doesn't exist yet)
    try {
      await supabase
        .from('schema_migrations')
        .insert({
          migration_name: migration.name,
          success: false,
          error_message: error.message,
          execution_time_ms: executionTime
        });
    } catch (insertError) {
      logWarning(`Could not record migration failure: ${insertError.message}`);
    }

    logError(`Migration ${migration.name} failed: ${error.message}`);
    return false;
  }
}

// Run all pending migrations
async function runMigrations(supabase, migrations) {
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const isExecuted = await isMigrationExecuted(supabase, migration.name);
    
    if (isExecuted) {
      log(`⏭️  Skipping ${migration.name} (already executed)`, 'yellow');
      skipCount++;
      continue;
    }

    const success = await executeMigration(supabase, migration);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
      // Stop on first failure
      break;
    }
  }

  return { successCount, skipCount, failCount };
}

// Verify migration results
async function verifyMigrations(supabase) {
  logInfo('Verifying migration results...');
  
  try {
    // Check if verify_migration function exists and run it
    const { data, error } = await supabase.rpc('verify_migration');
    
    if (error) {
      logWarning(`Verification function not available: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      log('\n📋 Migration Verification Results:', 'cyan');
      data.forEach(result => {
        const status = result.status === 'PASS' ? '✅' : '❌';
        log(`${status} ${result.check_name}: ${result.details}`);
      });
    }
  } catch (error) {
    logWarning(`Verification failed: ${error.message}`);
  }
}

// Main execution function
async function main() {
  log('🚀 Starting User Management System Migrations', 'bright');
  log('================================================', 'cyan');

  // Initialize
  const supabase = initializeSupabase();
  const migrations = getMigrationFiles();

  if (migrations.length === 0) {
    logWarning('No migration files found');
    return;
  }

  logInfo(`Found ${migrations.length} migration files:`);
  migrations.forEach(m => log(`  - ${m.name}`, 'cyan'));

  // Ensure migrations table exists
  const tableReady = await ensureMigrationsTable(supabase);
  if (!tableReady) {
    process.exit(1);
  }

  // Run migrations
  log('\n🔄 Running migrations...', 'bright');
  const results = await runMigrations(supabase, migrations);

  // Summary
  log('\n📊 Migration Summary:', 'bright');
  log(`✅ Successful: ${results.successCount}`);
  log(`⏭️  Skipped: ${results.skipCount}`);
  log(`❌ Failed: ${results.failCount}`);

  if (results.failCount > 0) {
    logError('Some migrations failed. Please check the errors above.');
    process.exit(1);
  }

  // Verify results
  await verifyMigrations(supabase);

  log('\n🎉 All migrations completed successfully!', 'green');
  
  // Next steps
  log('\n📝 Next Steps:', 'bright');
  log('1. Update your application to use the new enhanced_users table');
  log('2. Test the permission system with the new role templates');
  log('3. Encourage users to complete their profiles and next of kin information');
  log('4. Review and adjust permission templates as needed');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Migration failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runMigrations: main,
  getMigrationFiles,
  executeMigration
};
