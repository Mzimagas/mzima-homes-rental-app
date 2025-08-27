#!/usr/bin/env node

/**
 * Simple Migration Display Script
 * Shows migration SQL for manual execution in Supabase SQL editor
 */

const fs = require('fs')
const path = require('path')

const MIGRATIONS_DIR = path.join(__dirname, '../migrations')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Get our specific migration files
function getOurMigrationFiles() {
  const ourMigrations = [
    '001_create_user_management_tables_safe.sql',
    '002_create_permission_templates.sql',
    '003_migrate_existing_users.sql',
  ]

  return ourMigrations
    .map((filename) => ({
      filename,
      path: path.join(MIGRATIONS_DIR, filename),
      name: filename.replace('.sql', ''),
    }))
    .filter((migration) => fs.existsSync(migration.path))
}

function main() {
  log('🗄️  User Management System Migrations', 'bright')
  log('=====================================', 'cyan')

  const migrations = getOurMigrationFiles()

  if (migrations.length === 0) {
    log('❌ No migration files found', 'red')
    return
  }

  log(`\n📋 Found ${migrations.length} migration files to execute:\n`, 'blue')

  migrations.forEach((migration, index) => {
    log(`\n${'='.repeat(60)}`, 'cyan')
    log(`📄 MIGRATION ${index + 1}: ${migration.name}`, 'bright')
    log(`${'='.repeat(60)}`, 'cyan')

    try {
      const sql = fs.readFileSync(migration.path, 'utf8')
      console.log(sql)
    } catch (error) {
      log(`❌ Error reading ${migration.filename}: ${error.message}`, 'red')
    }

    log(`\n${'='.repeat(60)}`, 'cyan')
    log(`✅ END OF MIGRATION ${index + 1}`, 'green')
    log(`${'='.repeat(60)}\n`, 'cyan')
  })

  log('\n📝 INSTRUCTIONS:', 'bright')
  log('1. Copy each migration SQL above', 'yellow')
  log('2. Go to your Supabase project dashboard', 'yellow')
  log('3. Navigate to SQL Editor', 'yellow')
  log('4. Paste and execute each migration in order', 'yellow')
  log('5. Verify the results in the Database section', 'yellow')

  log('\n🔗 Supabase Dashboard:', 'blue')
  log('https://supabase.com/dashboard/project/ajrxvnakphkpkcssisxm', 'cyan')

  log('\n🎯 After running migrations:', 'bright')
  log('- Check the new tables in Database > Tables', 'green')
  log('- Verify permission templates in permission_templates table', 'green')
  log('- Check migrated users in enhanced_users table', 'green')
  log('- Test the enhanced user management interface', 'green')
}

if (require.main === module) {
  main()
}

module.exports = { main, getOurMigrationFiles }
